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
