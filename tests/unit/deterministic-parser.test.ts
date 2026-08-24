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
