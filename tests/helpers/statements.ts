import { withStatementDefaults } from "@/lib/schema/build";
import { normalizedStatementSchema, type NormalizedStatement } from "@/lib/schema/statement";
import type { PackFileInput } from "@/lib/schema/assemble-pack";

/**
 * Synthetic verified statements for pack and payment tests.
 *
 * Deliberately minimal and deliberately synthetic — `src/lib/fixtures/` holds the richer
 * generated statements, and no real PDF or real statement content belongs in the repository
 * at all.
 *
 * Two rules this file has to keep, because both were violated by an earlier version that
 * leaned on `as` casts:
 *
 * 1. A caller must not be able to construct a statement the production pipeline could not
 *    produce. An unchecked cast lets a test assert something about a shape that cannot
 *    occur, which is worse than no test.
 * 2. The result must survive `normalizedStatementSchema`, the same parse the real pipeline
 *    applies. `assertProductionShape` enforces that on every statement built here, so a
 *    drift in the schema surfaces as a failing helper rather than as a passing test about
 *    an impossible statement.
 */

/** The input `withStatementDefaults` accepts — looser than a full `NormalizedStatement`. */
type StatementInput = Parameters<typeof withStatementDefaults>[0];

/** One transaction, in the shape a caller may legitimately supply. */
type TransactionInput = StatementInput["transactions"][number];

/**
 * Only the fields a test has a reason to vary.
 *
 * Narrower than `Partial<StatementInput>` on purpose: it keeps the door shut on overriding
 * provenance, completeness, or verification internals that the production pipeline derives
 * rather than accepts.
 */
export type StatementOverrides = {
  statementType?: StatementInput["statementType"];
  currency?: StatementInput["currency"];
  periodStart?: StatementInput["periodStart"];
  periodEnd?: StatementInput["periodEnd"];
  openingBalance?: StatementInput["openingBalance"];
  closingBalance?: StatementInput["closingBalance"];
  transactions?: TransactionInput[];
  verificationState?: StatementInput["verificationState"];
};

/** Fail loudly if a helper ever produces something the production schema would refuse. */
function assertProductionShape(statement: NormalizedStatement): NormalizedStatement {
  const parsed = normalizedStatementSchema.safeParse(statement);
  if (!parsed.success) {
    throw new Error(
      `test helper built a statement the production schema rejects: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

/** A statement that passes verification, built through the production defaults. */
export function passedStatement(overrides: StatementOverrides = {}): NormalizedStatement {
  const base: StatementInput = {
    statementType: "checking",
    currency: "USD",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    openingBalance: "100.00",
    closingBalance: "90.00",
    transactions: [
      {
        date: "2026-03-02",
        description: "Coffee",
        amount: "-10.00",
        debit: "10.00",
      },
    ],
    extractionWarnings: [],
    verificationState: "verification_passed",
  };

  return assertProductionShape(withStatementDefaults({ ...base, ...overrides }));
}

/**
 * A distinct verified statement, keyed by an arbitrary label.
 *
 * The label only has to produce different canonical content so the files get different
 * digests; it is not statement data and never reaches an assertion about meaning.
 */
export function verifiedStatement(label: string): PackFileInput {
  const statement = passedStatement({
    transactions: [
      {
        date: "2026-03-02",
        description: `Payment ${label}`,
        amount: "-10.00",
        debit: "10.00",
      },
    ],
  });
  return { fileId: label.padEnd(16, "0").slice(0, 16), statement, pageCount: 1 };
}
