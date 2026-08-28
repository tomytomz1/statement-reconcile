import { describe, expect, it } from "vitest";

import {
  countDistinctAccounts,
  detectCurrency,
  detectStatementType,
  parseStatementDeterministically,
} from "@/lib/extraction/deterministic/parser";
import { FIXTURE_FAMILIES, generateFixture } from "@/lib/fixtures/generator";
import { toMoney } from "@/lib/money/decimal";

const SEEDS = [11, 202, 3003, 40404] as const;

describe("document-level detection", () => {
  it("recognizes a credit-card statement", () => {
    expect(
      detectStatementType("Minimum Payment Due 25.00 Payment Due Date 04/15 New Balance 812.45"),
    ).toBe("credit_card");
  });

  it("recognizes a checking statement", () => {
    expect(detectStatementType("Everyday Checking Account Deposits and Additions")).toBe(
      "checking",
    );
  });

  it("recognizes a savings statement", () => {
    expect(
      detectStatementType("Premier Savings Account Annual Percentage Yield Interest Earned"),
    ).toBe("savings");
  });

  it("detects currency from a code or symbol", () => {
    expect(detectCurrency("Balance in EUR 1.234,56")).toBe("EUR");
    expect(detectCurrency("Total £45.00")).toBe("GBP");
    expect(detectCurrency("Total 45.00")).toBe("USD");
  });

  it("counts distinct masked account numbers", () => {
    expect(countDistinctAccounts("Account Number: XXXXXXXX1234")).toBe(1);
    expect(
      countDistinctAccounts("Account Number: XXXXXXXX1234 and Account Number: XXXXXXXX9876"),
    ).toBe(2);
    expect(countDistinctAccounts("Account Number: XXXXXXXX1234 (continued) Account no 1234")).toBe(
      1,
    );
  });
});

describe("fixture families that must reconcile", () => {
  const reconciling = FIXTURE_FAMILIES.filter((family) => family.expectation === "reconciles");

  for (const family of reconciling) {
    it(`${family.family} reconciles across seeds`, () => {
      for (const seed of SEEDS) {
        const fixture = generateFixture(family.family, seed);
        const outcome = parseStatementDeterministically(fixture.document);
        if (!outcome.ok) {
          const failed = outcome.reconciliation?.checks
            .filter((check) => !check.passed && !check.advisory)
            .map((check) => `${check.name}(expected ${check.expected}, actual ${check.actual})`);
          throw new Error(
            `${fixture.id} failed: code=${outcome.code} checks=${failed?.join("; ") ?? "none"} reasons=${
              outcome.reconciliation?.rejectionReasons.join(" | ") ?? "none"
            }`,
          );
        }
        expect(outcome.reconciliation.passed).toBe(true);
      }
    });
  }
});

describe("extraction accuracy on reconciling fixtures", () => {
  const reconciling = FIXTURE_FAMILIES.filter((family) => family.expectation === "reconciles");

  for (const family of reconciling) {
    it(`${family.family} recovers every transaction amount`, () => {
      const fixture = generateFixture(family.family, 7);
      const outcome = parseStatementDeterministically(fixture.document);
      if (!outcome.ok) throw new Error(`${fixture.id} did not parse: ${outcome.code}`);

      expect(outcome.statement.transactions).toHaveLength(fixture.truth.transactionCount);

      const expectedAmounts = [...fixture.truth.transactions]
        .map((transaction) => transaction.amount)
        .sort();
      const actualAmounts = [...outcome.statement.transactions]
        .map((transaction) => transaction.amount)
        .sort();
      expect(actualAmounts).toEqual(expectedAmounts);

      expect(outcome.statement.currency).toBe(fixture.truth.currency);
      expect(outcome.statement.openingBalance).toBe(fixture.truth.openingBalance);
      expect(outcome.statement.closingBalance).toBe(fixture.truth.closingBalance);
      expect(outcome.statement.periodStart).toBe(fixture.truth.periodStart);
      expect(outcome.statement.periodEnd).toBe(fixture.truth.periodEnd);
    });
  }

  it("recovers dates exactly on a representative family", () => {
    const fixture = generateFixture("checking-debit-credit-balance", 99);
    const outcome = parseStatementDeterministically(fixture.document);
    if (!outcome.ok) throw new Error("fixture did not parse");
    const expected = fixture.truth.transactions.map((transaction) => transaction.date).sort();
    const actual = outcome.statement.transactions.map((transaction) => transaction.date).sort();
    expect(actual).toEqual(expected);
  });

  it("keeps the sum of extracted amounts equal to the true net change", () => {
    for (const family of FIXTURE_FAMILIES.filter((f) => f.expectation === "reconciles")) {
      const fixture = generateFixture(family.family, 31);
      const outcome = parseStatementDeterministically(fixture.document);
      if (!outcome.ok) throw new Error(`${fixture.id} did not parse: ${outcome.code}`);
      const net = outcome.statement.transactions.reduce(
        (total, transaction) => total.plus(toMoney(transaction.amount)),
        toMoney("0"),
      );
      const expectedNet = toMoney(fixture.truth.closingBalance).minus(
        toMoney(fixture.truth.openingBalance),
      );
      expect(net.minus(expectedNet).abs().lessThanOrEqualTo(0.01)).toBe(true);
    }
  });
});

describe("fixture families that must be rejected", () => {
  const rejecting = FIXTURE_FAMILIES.filter((family) => family.expectation === "rejects");

  for (const family of rejecting) {
    it(`${family.family} is rejected across seeds`, () => {
      for (const seed of SEEDS) {
        const fixture = generateFixture(family.family, seed);
        const outcome = parseStatementDeterministically(fixture.document);
        if (outcome.ok) {
          throw new Error(
            `${fixture.id} was accepted but should have been rejected (${family.rejectionReason ?? "unknown"})`,
          );
        }
        expect(outcome.ok).toBe(false);
      }
    });
  }
});

describe("adversarial content cannot influence the outcome", () => {
  it("prompt-injection descriptions do not make an unbalanced statement pass", () => {
    const fixture = generateFixture("adversarial-prompt-injection", 5);
    const outcome = parseStatementDeterministically(fixture.document);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // The injected strings are preserved as data, not interpreted.
    const descriptions = outcome.statement.transactions.map((t) => t.description).join(" ");
    expect(descriptions).toMatch(/IGNORE PREVIOUS INSTRUCTIONS/);
    expect(outcome.reconciliation.passed).toBe(true);
  });

  it("a 1,400 character description is truncated rather than rejected", () => {
    const fixture = generateFixture("adversarial-huge-description", 3);
    const outcome = parseStatementDeterministically(fixture.document);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    for (const transaction of outcome.statement.transactions) {
      expect(transaction.description.length).toBeLessThanOrEqual(512);
    }
  });
});

describe("empty and malformed input", () => {
  it("reports no text layer for an empty document", () => {
    const outcome = parseStatementDeterministically({
      pageCount: 1,
      pages: [{ page: 1, width: 612, height: 792, items: [] }],
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("no_text_layer");
  });

  it("reports no transactions for a page of prose", () => {
    const outcome = parseStatementDeterministically({
      pageCount: 1,
      pages: [
        {
          page: 1,
          width: 612,
          height: 792,
          items: [
            { t: "Dear customer, thank you for banking with us.", x: 54, y: 54, w: 200, h: 9 },
            { t: "Please retain this notice for your records.", x: 54, y: 70, w: 200, h: 9 },
          ],
        },
      ],
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("no_transactions_found");
  });
});

/**
 * A register whose transactions wrap across two printed lines, with an all-ambiguous period.
 *
 * Both shapes are taken from a real statement that failed end to end, and are reproduced
 * here synthetically — no customer document is ever committed.
 *
 *   1. The statement period reads `07/09/26 - 08/08/26`. Every component is <= 12, so the
 *      period cannot disambiguate itself; the order has to come from the rows, where `07-15`
 *      settles it as MDY. Transaction dates carry no year, so a period that goes unread
 *      means no date resolves and every row is discarded.
 *
 *   2. A long description wraps: the date sits on the first printed line and the amount and
 *      balance on the second. Both halves used to be dropped — the dated line for having no
 *      money, the money line for having no date — so the transaction vanished silently and
 *      took the running-balance chain with it.
 */
function wrappedRegister() {
  const money = (t: string, x: number, y: number, w: number) => ({ t, x, y, w, h: 9 });
  return {
    pageCount: 1,
    pages: [
      {
        page: 1,
        width: 648,
        height: 828,
        items: [
          { t: "Statement Period 07/09/26 - 08/08/26", x: 400, y: 40, w: 150, h: 9 },
          { t: "EveryDay Checking", x: 14, y: 60, w: 90, h: 9 },
          { t: "Date", x: 14, y: 80, w: 22, h: 9 },
          { t: "Transaction Detail", x: 43, y: 80, w: 88, h: 9 },
          { t: "Amount($)", x: 431, y: 80, w: 44, h: 9 },
          { t: "Balance($)", x: 557, y: 80, w: 37, h: 9 },

          // Balance-forward anchor: dated, balance only.
          { t: "07-09", x: 14, y: 95, w: 26, h: 9 },
          { t: "Beginning Balance", x: 43, y: 95, w: 86, h: 9 },
          money("1,000.00", 560, 95, 34),

          // Ordinary single-line row.
          { t: "07-10", x: 14, y: 110, w: 26, h: 9 },
          { t: "COFFEE SHOP", x: 43, y: 110, w: 70, h: 9 },
          money("-12.50", 445, 110, 30),
          money("987.50", 560, 110, 34),

          // Wrapped row: date and description here, amounts on the next line.
          { t: "07-15", x: 14, y: 125, w: 26, h: 9 },
          { t: "GROCERY STORE", x: 43, y: 125, w: 82, h: 9 },
          { t: "SPRINGFIELD IL", x: 43, y: 137, w: 78, h: 9 },
          money("-37.25", 445, 137, 30),
          money("950.25", 560, 137, 34),

          // Ordinary row again, a credit this time.
          { t: "07-20", x: 14, y: 152, w: 26, h: 9 },
          { t: "PAYCHECK", x: 43, y: 152, w: 56, h: 9 },
          money("500.00", 445, 152, 30),
          money("1,450.25", 560, 152, 34),

          { t: "Beginning Balance 1,000.00", x: 43, y: 180, w: 130, h: 9 },
          { t: "Ending Balance 1,450.25", x: 43, y: 192, w: 120, h: 9 },
        ],
      },
    ],
  };
}

describe("wrapped rows and self-ambiguous periods", () => {
  it("reads a period whose own dates are ambiguous, using the order the rows prove", () => {
    const outcome = parseStatementDeterministically(wrappedRegister());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.statement.periodStart).toBe("2026-07-09");
    expect(outcome.statement.periodEnd).toBe("2026-08-08");
    // Transaction dates carry no year; they can only resolve via the period.
    expect(outcome.statement.transactions.every((t) => t.date.startsWith("2026-07-"))).toBe(true);
  });

  it("keeps a transaction whose amount is printed on the line below its date", () => {
    const outcome = parseStatementDeterministically(wrappedRegister());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Three transactions; the balance-forward row is an anchor, not activity.
    expect(outcome.statement.transactions).toHaveLength(3);

    const wrapped = outcome.statement.transactions.find((t) => t.date === "2026-07-15");
    expect(wrapped, "the wrapped transaction must survive").toBeDefined();
    expect(wrapped!.amount).toBe("-37.25");
    // The continuation line's text belongs to the same transaction.
    expect(wrapped!.description).toMatch(/GROCERY STORE/);
    expect(wrapped!.description).toMatch(/SPRINGFIELD IL/);
  });

  it("reconciles, because no row went missing from the balance chain", () => {
    const outcome = parseStatementDeterministically(wrappedRegister());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.reconciliation.passed).toBe(true);
    expect(outcome.statement.runningBalanceSummary.transitionsPassed).toBe(
      outcome.statement.runningBalanceSummary.transitionsChecked,
    );
  });
});

/**
 * A statement that prints a second, differently shaped table after its register.
 *
 * Taken from a real document: after four pages of transactions came an "Items Paid" index
 * printed two-up — two `Date | Item | Amount` groups side by side on every line, at column
 * positions the register never uses and with no balance column at all.
 *
 * Clustering money columns across the whole document merged both tables into one geometry.
 * Header matching then gave up (more columns than headers), the fallback assigned roles to
 * the wrong columns, and a document whose register was perfectly readable was rejected.
 */
function registerThenIndex() {
  const money = (t: string, x: number, y: number, w: number) => ({ t, x, y, w, h: 9 });
  return {
    pageCount: 2,
    pages: [
      {
        page: 1,
        width: 648,
        height: 828,
        items: [
          { t: "Statement Period 07/09/26 - 08/20/26", x: 400, y: 40, w: 150, h: 9 },
          { t: "EveryDay Checking", x: 14, y: 60, w: 90, h: 9 },
          { t: "Date", x: 14, y: 80, w: 22, h: 9 },
          { t: "Transaction Detail", x: 43, y: 80, w: 88, h: 9 },
          { t: "Amount($)", x: 431, y: 80, w: 44, h: 9 },
          { t: "Balance($)", x: 557, y: 80, w: 37, h: 9 },

          { t: "07-09", x: 14, y: 95, w: 26, h: 9 },
          { t: "Beginning Balance", x: 43, y: 95, w: 86, h: 9 },
          money("1,000.00", 560, 95, 34),

          { t: "07-10", x: 14, y: 110, w: 26, h: 9 },
          { t: "COFFEE SHOP", x: 43, y: 110, w: 70, h: 9 },
          money("-12.50", 445, 110, 30),
          money("987.50", 560, 110, 34),

          { t: "07-15", x: 14, y: 125, w: 26, h: 9 },
          { t: "PAYCHECK", x: 43, y: 125, w: 56, h: 9 },
          money("500.00", 445, 125, 30),
          money("1,487.50", 560, 125, 34),

          { t: "Beginning Balance 1,000.00", x: 43, y: 160, w: 130, h: 9 },
          { t: "Ending Balance 1,487.50", x: 43, y: 172, w: 120, h: 9 },
        ],
      },
      {
        // Two-up index: two Date/Item/Amount groups per line, no balance column, and money
        // in columns the register never uses.
        page: 2,
        width: 648,
        height: 828,
        items: [
          { t: "Items Paid", x: 14, y: 40, w: 52, h: 9 },
          { t: "Date", x: 18, y: 60, w: 22, h: 9 },
          { t: "Item", x: 140, y: 60, w: 20, h: 9 },
          { t: "Amount($)", x: 226, y: 60, w: 44, h: 9 },
          { t: "Date", x: 316, y: 60, w: 22, h: 9 },
          { t: "Item", x: 439, y: 60, w: 20, h: 9 },
          { t: "Amount($)", x: 525, y: 60, w: 44, h: 9 },

          { t: "07-10", x: 18, y: 75, w: 26, h: 9 },
          { t: "POS", x: 155, y: 75, w: 22, h: 9 },
          money("12.50", 236, 75, 30),
          { t: "07-15", x: 316, y: 75, w: 26, h: 9 },
          { t: "ACH", x: 454, y: 75, w: 22, h: 9 },
          money("500.00", 535, 75, 30),

          { t: "07-11", x: 18, y: 90, w: 26, h: 9 },
          { t: "POS", x: 155, y: 90, w: 22, h: 9 },
          money("9.99", 241, 90, 25),
          { t: "07-16", x: 316, y: 90, w: 26, h: 9 },
          { t: "ACH", x: 454, y: 90, w: 22, h: 9 },
          money("40.00", 540, 90, 25),
        ],
      },
    ],
  };
}

describe("a second table with a different column layout", () => {
  it("parses the register and does not let the index page break it", () => {
    const outcome = parseStatementDeterministically(registerThenIndex());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.reconciliation.passed).toBe(true);
  });

  it("takes its transactions from the register only", () => {
    const outcome = parseStatementDeterministically(registerThenIndex());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // Two real transactions; the index page repeats them and must not double them up.
    expect(outcome.statement.transactions).toHaveLength(2);
    expect(outcome.statement.transactions.map((t) => t.amount).sort()).toEqual([
      "-12.50",
      "500.00",
    ]);
  });

  it("says plainly that a section was set aside rather than dropping it silently", () => {
    const outcome = parseStatementDeterministically(registerThenIndex());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.statement.extractionWarnings.join(" ")).toMatch(/different column layout/i);
  });

  it("still accounts for every page, so completeness is not quietly bypassed", () => {
    const outcome = parseStatementDeterministically(registerThenIndex());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.statement.completeness.passed).toBe(true);
    expect(outcome.statement.completeness.pagesDeclared).toBe(2);
  });
});

/**
 * Synthetic reproduction of a combined deposit-account statement:
 * one active checking register, one explicitly inactive savings section, a per-account
 * summary, a two-up Items Paid index, and a disclosure page. No real institution or
 * customer data is used.
 */
function combinedDepositDocument(secondAccountActive = false) {
  const item = (t: string, x: number, y: number, w: number) => ({ t, x, y, w, h: 9 });
  const money = (t: string, x: number, y: number, w = 42) => item(t, x, y, w);
  const summarySavings = secondAccountActive
    ? [
        money("$5.00", 150, 117),
        money("$8.00", 250, 117),
        money("$3.00", 350, 117),
        money("$10.00", 460, 117),
      ]
    : [
        money("$5.00", 150, 117),
        money("$0.00", 250, 117),
        money("$0.00", 350, 117),
        money("$5.00", 460, 117),
      ];
  const savingsTail = secondAccountActive
    ? [
        item("07-20", 14, 260, 26),
        item("TRANSFER CREDIT", 55, 260, 90),
        money("8.00", 435, 260, 30),
        money("13.00", 560, 260, 34),
        item("07-21", 14, 275, 26),
        item("CASH WITHDRAWAL", 55, 275, 90),
        money("3.00-", 435, 275, 30),
        money("10.00", 560, 275, 34),
      ]
    : [item("No Transactions This Period", 240, 260, 140)];

  return {
    pageCount: 4,
    pages: [
      {
        page: 1,
        width: 648,
        height: 828,
        items: [
          item("Statement Period 07/09/26 - 08/08/26", 400, 25, 160),
          item("Summary of deposit accounts", 14, 45, 150),
          item("Previous Balance", 140, 65, 80),
          item("Deposits/Credits", 240, 65, 85),
          item("Withdrawals/Debits", 340, 65, 100),
          item("Ending Balance", 455, 65, 75),
          item("Beacon Checking", 14, 82, 85),
          item("11112222", 14, 92, 45),
          money("$1,000.00", 140, 92),
          money("$540.00", 240, 92),
          money("$326.00", 340, 92),
          money("$1,214.00", 455, 92),
          item("Reserve Savings", 14, 107, 85),
          item("33334444", 14, 117, 45),
          ...summarySavings,
          item("Totals", 14, 140, 35),
        ],
      },
      {
        page: 2,
        width: 648,
        height: 828,
        items: [
          item("Beacon Checking - 11112222", 14, 40, 150),
          item("Date", 14, 60, 22),
          item("Transaction Detail", 55, 60, 95),
          item("Amount($)", 431, 60, 44),
          item("Balance($)", 557, 60, 37),
          item("07-09", 14, 75, 26),
          item("Beginning Balance", 55, 75, 90),
          money("1,000.00", 560, 75, 34),
          item("07-11", 14, 90, 26),
          item("POS Debit- Debit Card 4321 07-10-26 NORTHLIGHT MARKET", 55, 90, 260),
          money("25.00-", 445, 90, 30),
          money("975.00", 560, 90, 34),
          item("07-13", 14, 105, 26),
          item("POS Credit Adjustment 4321 Transaction 07-12-26 MERCHANT RETURN", 55, 105, 285),
          money("40.00", 445, 105, 30),
          money("1,015.00", 560, 105, 34),
          item("07-15", 14, 120, 26),
          item("REFERENCE 12-34-56 AND 01-02-26 PAYROLL", 55, 120, 200),
          money("500.00", 445, 120, 30),
          money("1,515.00", 560, 120, 34),
          item("07-20", 14, 135, 26),
          item("MONTHLY RENT", 55, 135, 90),
          money("300.00-", 445, 135, 30),
          money("1,215.00", 560, 135, 34),
          item("07-25", 14, 150, 26),
          item("SERVICE FEE", 55, 150, 75),
          money("1.00-", 445, 150, 30),
          money("1,214.00", 560, 150, 34),
          item("08-08", 14, 170, 26),
          item("Ending Balance", 55, 170, 82),
          money("1,214.00", 560, 170, 34),
        ],
      },
      {
        page: 3,
        width: 648,
        height: 828,
        items: [
          item("Items Paid", 14, 35, 52),
          item("Date", 18, 55, 22),
          item("Item", 140, 55, 20),
          item("Amount($)", 226, 55, 44),
          item("Date", 316, 55, 22),
          item("Item", 439, 55, 20),
          item("Amount($)", 525, 55, 44),
          ...[0, 1, 2, 3].flatMap((index) => {
            const y = 70 + index * 15;
            return [
              item(`07-${10 + index}`, 18, y, 26),
              item("POS", 155, y, 22),
              money(`${10 + index}.00`, 236, y, 30),
              item(`07-${20 + index}`, 316, y, 26),
              item("ACH", 454, y, 22),
              money(`${20 + index}.00`, 535, y, 30),
            ];
          }),
          item("Savings", 14, 210, 45),
          item("Reserve Savings - 33334444", 14, 225, 160),
          item("Date", 14, 240, 22),
          item("Transaction Detail", 55, 240, 95),
          item("Amount($)", 431, 240, 44),
          item("Balance($)", 557, 240, 37),
          ...savingsTail,
        ],
      },
      {
        page: 4,
        width: 648,
        height: 828,
        items: [
          item("Disclosure Information", 14, 40, 110),
          item("Please retain this notice.", 14, 58, 130),
        ],
      },
    ],
  };
}

describe("combined statements with one active account", () => {
  it("selects the active checking register and its own printed evidence", () => {
    const outcome = parseStatementDeterministically(combinedDepositDocument());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.statement.statementType).toBe("checking");
    expect(outcome.statement.transactions).toHaveLength(5);
    expect(outcome.statement.openingBalance).toBe("1000.00");
    expect(outcome.statement.statedTotalCredits).toBe("540.00");
    expect(outcome.statement.statedTotalDebits).toBe("326.00");
    expect(outcome.statement.closingBalance).toBe("1214.00");
    expect(outcome.statement.completeness.additionalZeroActivityAccounts).toBe(1);
    expect(outcome.statement.extractionWarnings.join(" ")).toMatch(/zero-activity account/i);
  });

  it("derives fixed Debit/Credit columns and maps embedded transaction dates safely", () => {
    const outcome = parseStatementDeterministically(combinedDepositDocument());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(
      outcome.statement.transactions.every((row) => Boolean(row.debit) !== Boolean(row.credit)),
    ).toBe(true);
    expect(outcome.statement.transactions[0]).toMatchObject({
      date: "2026-07-10",
      postedDate: "2026-07-11",
      debit: "25.00",
      amount: "-25.00",
    });
    const falseDate = outcome.statement.transactions.find((row) =>
      row.description.includes("12-34-56"),
    );
    expect(falseDate).toMatchObject({ date: "2026-07-15", credit: "500.00" });
    expect(falseDate?.postedDate).toBeUndefined();
  });

  it("accounts for every page and runs every available arithmetic proof", () => {
    const outcome = parseStatementDeterministically(combinedDepositDocument());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.statement.completeness.pagesIncludedInParse).toBe(4);
    expect(outcome.statement.completeness.pages.map((page) => page.classification)).toEqual([
      "summary",
      "transactions",
      "summary",
      "summary",
    ]);
    for (const name of [
      "opening_plus_transactions_equals_closing",
      "running_balance_chain",
      "stated_total_debits",
      "stated_total_credits",
      "column_amount_agreement",
    ]) {
      expect(outcome.reconciliation.checks.find((check) => check.name === name)?.passed).toBe(true);
    }
  });

  it("fails closed when the second account is not explicitly inactive", () => {
    const outcome = parseStatementDeterministically(combinedDepositDocument(true));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("multiple_accounts");
  });
});
