import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";
import { neutralizeFormula, wouldBeFormula } from "@/lib/export/sanitize";
import { formatMoney } from "@/lib/money/decimal";
import { reconcile } from "@/lib/reconciliation";
import { withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";

function centsToMoney(cents: number): string {
  return formatMoney(cents / 100, "USD");
}

function checkingStatement(amountCents: readonly number[]): NormalizedStatement {
  const openingCents = 100_000;
  const transactions = amountCents.map((cents, index) => {
    const amount = centsToMoney(cents);
    return {
      date: `2026-03-${String((index % 28) + 1).padStart(2, "0")}`,
      description: `SYNTHETIC ROW ${index + 1}`,
      amount,
      ...(cents < 0 ? { debit: centsToMoney(-cents) } : {}),
      ...(cents > 0 ? { credit: centsToMoney(cents) } : {}),
    };
  });
  const net = amountCents.reduce((sum, cents) => sum + cents, 0);
  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    openingBalance: centsToMoney(openingCents),
    closingBalance: centsToMoney(openingCents + net),
    transactions,
    extractionWarnings: [],
  });
}

const amountCentsArb = fc.integer({ min: -50_000, max: 50_000 }).filter((cents) => cents !== 0);

describe("property: reconciliation", () => {
  it("passes when opening + signed amounts equal closing", () => {
    fc.assert(
      fc.property(fc.array(amountCentsArb, { minLength: 1, maxLength: 12 }), (amounts) => {
        const statement = checkingStatement(amounts);
        expect(reconcile(statement).passed).toBe(true);
      }),
      { numRuns: 40 },
    );
  });
});

describe("property: canonicalize + digest", () => {
  it("is deterministic when run twice on the same statement", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(amountCentsArb, { minLength: 1, maxLength: 8 }),
        async (amounts) => {
          const statement = checkingStatement(amounts);
          const first = await canonicalizeAndDigest(statement);
          const second = await canonicalizeAndDigest(statement);
          expect(first.digest).toBe(second.digest);
          expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe("property: neutralizeFormula", () => {
  it("prefixes values that start with = + - @ and never leaves a formula leader", () => {
    const leaderArb = fc.constantFrom("=", "+", "-", "@");
    const restArb = fc.string({ minLength: 1, maxLength: 24 });

    fc.assert(
      fc.property(leaderArb, restArb, (leader, rest) => {
        const output = neutralizeFormula(`${leader}${rest}`);
        if (output === "") return;
        expect(output.startsWith("'")).toBe(true);
        expect(wouldBeFormula(output) || output.startsWith("'")).toBe(true);
      }),
      { numRuns: 40 },
    );

    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (value) => {
        const output = neutralizeFormula(value);
        expect(wouldBeFormula(output) === false || output.startsWith("'")).toBe(true);
      }),
      { numRuns: 40 },
    );
  });
});
