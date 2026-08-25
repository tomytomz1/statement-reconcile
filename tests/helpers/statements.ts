import { withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";
import type { PackFileInput } from "@/lib/schema/assemble-pack";

/**
 * Synthetic verified statements for pack and payment tests.
 *
 * Deliberately minimal and deliberately synthetic — `src/lib/fixtures/` holds the richer
 * generated statements, and no real PDF or real statement content belongs in the repository
 * at all. What matters here is only that a statement is internally consistent enough to pass
 * the verification gate, so the tests can be about pack identity and the payment boundary
 * rather than about parsing.
 */

type StatementInput = Parameters<typeof withStatementDefaults>[0];

/**
 * A statement that passes verification.
 *
 * `overrides` is the same loose shape `withStatementDefaults` accepts rather than
 * `Partial<NormalizedStatement>`, so a caller can supply a transaction without having to
 * hand-write provenance, source regions, and ids that the defaults fill in anyway.
 */
export function passedStatement(overrides: Partial<StatementInput> = {}): NormalizedStatement {
  return withStatementDefaults({
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
    ...overrides,
  } as StatementInput);
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
  } as Partial<StatementInput>);
  return { fileId: label.padEnd(16, "0").slice(0, 16), statement, pageCount: 1 };
}
