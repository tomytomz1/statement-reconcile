import { describe, expect, it } from "vitest";

import { withProvenance, withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";
import { aggregate, canProceedToCheckout, reconcile, summarize } from "@/lib/reconciliation";

type StatementOverrides = Partial<Parameters<typeof withStatementDefaults>[0]>;

function checking(overrides: StatementOverrides = {}): NormalizedStatement {
  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2024-03-01",
    periodEnd: "2024-03-31",
    openingBalance: "1000.00",
    closingBalance: "1150.00",
    transactions: [
      { date: "2024-03-02", description: "PAYROLL", amount: "500.00", categoryHint: "credit" },
      { date: "2024-03-10", description: "GROCERIES", amount: "-250.00", categoryHint: "debit" },
      { date: "2024-03-20", description: "RENT", amount: "-100.00", categoryHint: "debit" },
    ],
    extractionWarnings: [],
    ...overrides,
  });
}

function creditCard(overrides: StatementOverrides = {}): NormalizedStatement {
  return withStatementDefaults({
    statementType: "credit_card",
    currency: "USD",
    periodStart: "2024-03-01",
    periodEnd: "2024-03-31",
    openingBalance: "1000.00",
    closingBalance: "812.45",
    statedPayments: "-400.00",
    statedPurchases: "200.00",
    statedFees: "0.00",
    statedInterest: "12.45",
    transactions: [
      {
        date: "2024-03-04",
        description: "PAYMENT - THANK YOU",
        amount: "-400.00",
        categoryHint: "payment",
      },
      {
        date: "2024-03-08",
        description: "MAPLE GROCERS",
        amount: "120.00",
        categoryHint: "charge",
      },
      { date: "2024-03-12", description: "ORBIT FUEL", amount: "80.00", categoryHint: "charge" },
      {
        date: "2024-03-31",
        description: "INTEREST CHARGE ON PURCHASES",
        amount: "12.45",
        categoryHint: "interest",
      },
    ],
    extractionWarnings: [],
    ...overrides,
  });
}

describe("aggregate", () => {
  it("splits positive and negative amounts", () => {
    const totals = aggregate(checking().transactions);
    expect(totals.positive.toFixed(2)).toBe("500.00");
    expect(totals.negative.toFixed(2)).toBe("350.00");
    expect(totals.net.toFixed(2)).toBe("150.00");
  });

  it("groups credit-card categories by hint", () => {
    const totals = aggregate(creditCard().transactions);
    expect(totals.payments.toFixed(2)).toBe("400.00");
    expect(totals.charges.toFixed(2)).toBe("200.00");
    expect(totals.interest.toFixed(2)).toBe("12.45");
  });
});

describe("checking reconciliation", () => {
  it("passes when opening plus transactions equals closing", () => {
    const result = reconcile(checking());
    expect(result.passed).toBe(true);
    expect(result.method).toBe("opening_closing_sum");
    expect(result.difference).toBe("0.00");
    expect(canProceedToCheckout(result)).toBe(true);
  });

  it("fails when the closing balance is off by two cents", () => {
    const result = reconcile(checking({ closingBalance: "1150.02" }));
    expect(result.passed).toBe(false);
    expect(result.rejectionReasons.length).toBeGreaterThan(0);
  });

  it("accepts a one cent rounding difference", () => {
    expect(reconcile(checking({ closingBalance: "1150.01" })).passed).toBe(true);
  });

  it("fails when a transaction is missing", () => {
    const statement = checking();
    const result = reconcile({
      ...statement,
      transactions: statement.transactions.slice(0, 2),
    });
    expect(result.passed).toBe(false);
    expect(result.difference).toBe("-100.00");
  });

  it("fails when a transaction is duplicated", () => {
    const statement = checking();
    const duplicated = statement.transactions[1]!;
    const result = reconcile({
      ...statement,
      transactions: [...statement.transactions, duplicated],
    });
    expect(result.passed).toBe(false);
  });

  it("rejects a statement with no transactions", () => {
    const result = reconcile(checking({ transactions: [] }));
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.name === "has_transactions")?.passed).toBe(false);
  });

  it("rejects when there is no balancing information at all", () => {
    const result = reconcile(checking({ openingBalance: undefined, closingBalance: undefined }));
    expect(result.passed).toBe(false);
    expect(result.method).toBe("insufficient_data");
    expect(result.rejectionReasons.join(" ")).toContain("balancing information");
  });

  it("reconciles from stated totals when balances are absent", () => {
    const result = reconcile(
      checking({
        openingBalance: undefined,
        closingBalance: undefined,
        statedTotalCredits: "500.00",
        statedTotalDebits: "350.00",
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.method).toBe("stated_totals");
  });

  it("fails when stated totals disagree with the rows", () => {
    const result = reconcile(
      checking({
        openingBalance: undefined,
        closingBalance: undefined,
        statedTotalCredits: "500.00",
        statedTotalDebits: "360.00",
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("validates a running balance chain row by row", () => {
    const statement = checking({
      transactions: [
        { date: "2024-03-02", description: "PAYROLL", amount: "500.00", runningBalance: "1500.00" },
        {
          date: "2024-03-10",
          description: "GROCERIES",
          amount: "-250.00",
          runningBalance: "1250.00",
        },
        { date: "2024-03-20", description: "RENT", amount: "-100.00", runningBalance: "1150.00" },
      ],
    });
    const result = reconcile(statement);
    expect(result.passed).toBe(true);
    expect(result.checks.find((check) => check.name === "running_balance_chain")?.passed).toBe(
      true,
    );
  });

  it("fails when a running balance breaks the chain", () => {
    const statement = checking({
      transactions: [
        { date: "2024-03-02", description: "PAYROLL", amount: "500.00", runningBalance: "1500.00" },
        {
          date: "2024-03-10",
          description: "GROCERIES",
          amount: "-250.00",
          runningBalance: "1200.00",
        },
        { date: "2024-03-20", description: "RENT", amount: "-100.00", runningBalance: "1150.00" },
      ],
    });
    expect(reconcile(statement).passed).toBe(false);
  });

  it("rejects a row where both debit and credit columns are populated", () => {
    const result = reconcile(
      checking({
        transactions: [
          {
            date: "2024-03-02",
            description: "AMBIGUOUS",
            amount: "150.00",
            debit: "150.00",
            credit: "150.00",
          },
        ],
        closingBalance: "1150.00",
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.name === "unambiguous_direction")?.passed).toBe(
      false,
    );
  });

  it("rejects a debit column that disagrees with the signed amount", () => {
    const result = reconcile(
      checking({
        transactions: [
          { date: "2024-03-02", description: "MISMATCH", amount: "150.00", debit: "150.00" },
        ],
        closingBalance: "1150.00",
      }),
    );
    expect(result.checks.find((check) => check.name === "column_amount_agreement")?.passed).toBe(
      false,
    );
    expect(result.passed).toBe(false);
  });

  it("rejects duplicated rows that share a running balance", () => {
    const row = {
      date: "2024-03-02",
      description: "PAYROLL",
      amount: "500.00",
      runningBalance: "1500.00",
    };
    const result = reconcile(checking({ transactions: [row, row] }));
    expect(result.checks.find((check) => check.name === "no_impossible_duplicates")?.passed).toBe(
      false,
    );
  });

  it("rejects a transaction dated far outside the statement period", () => {
    const statement = checking();
    const result = reconcile({
      ...statement,
      transactions: [
        ...statement.transactions,
        withProvenance({ date: "2022-01-01", description: "STRAY", amount: "0.00" }, 99),
      ],
    });
    expect(result.checks.find((check) => check.name === "dates_within_period")?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });
});

describe("credit card reconciliation", () => {
  it("passes on previous balance plus activity equals new balance", () => {
    const result = reconcile(creditCard());
    expect(result.passed).toBe(true);
    expect(result.equation).toContain("Previous balance");
  });

  it("verifies stated category totals", () => {
    const result = reconcile(creditCard());
    expect(result.checks.find((check) => check.name === "stated_payments")?.passed).toBe(true);
    expect(result.checks.find((check) => check.name === "stated_purchases")?.passed).toBe(true);
  });

  it("fails when a stated category total disagrees with the rows", () => {
    const result = reconcile(creditCard({ statedPurchases: "250.00" }));
    expect(result.passed).toBe(false);
  });

  it("reconciles without category subtotals", () => {
    const result = reconcile(
      creditCard({
        statedPayments: undefined,
        statedPurchases: undefined,
        statedFees: undefined,
        statedInterest: undefined,
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.method).toBe("opening_closing_sum");
  });
});

describe("summarize", () => {
  it("computes preview totals from the rows", () => {
    const summary = summarize(checking());
    expect(summary.totalCredits).toBe("500.00");
    expect(summary.totalDebits).toBe("350.00");
    expect(summary.netChange).toBe("150.00");
    expect(summary.transactionCount).toBe(3);
  });

  it("reports fees and interest when present", () => {
    const summary = summarize(creditCard());
    expect(summary.totalInterest).toBe("12.45");
  });
});

describe("engine independence", () => {
  it("cannot be told that a statement reconciled", () => {
    const statement = checking({ closingBalance: "9999.99" });
    const claim = { ...statement, reconciled: true, passed: true } as NormalizedStatement;
    expect(reconcile(claim).passed).toBe(false);
  });

  it("is pure: repeated calls return the same result", () => {
    const statement = checking();
    expect(reconcile(statement)).toEqual(reconcile(statement));
  });
});
