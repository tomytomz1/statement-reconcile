import { canonicalDigest } from "@/lib/crypto/digest";
import { formatMoney } from "@/lib/money/decimal";
import type { FieldProvenance, SourceRegion } from "@/lib/schema/provenance";
import {
  MAX_DESCRIPTION_LENGTH,
  SCHEMA_VERSION,
  type NormalizedStatement,
  type Transaction,
  normalizedStatementSchema,
} from "@/lib/schema/statement";

/**
 * Canonicalization of a normalized statement.
 *
 * Provenance is part of the digest: changing source text, a bounding box, a field
 * status, or a normalized amount produces a different payment binding. Raw extracted
 * text is preserved separately from the normalized description so evidence is not
 * destroyed by whitespace collapsing.
 */

const DANGEROUS_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function canonicalizeText(value: string, maxLength = MAX_DESCRIPTION_LENGTH): string {
  const normalized = value
    .normalize("NFC")
    .replace(DANGEROUS_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

/** Raw evidence: NFC + control-strip only. Do not collapse spaces. */
export function canonicalizeRawText(value: string, maxLength = 2000): string {
  const normalized = value.normalize("NFC").replace(DANGEROUS_CHARS, "");
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function canonicalAmount(value: string | undefined, currency: string): string | undefined {
  if (value === undefined) return undefined;
  return formatMoney(value, currency);
}

/**
 * Bounding boxes are canonicalized to whole PDF points.
 *
 * They are part of the digested statement, and `canonicalJson` refuses non-integer numbers
 * outright — a deliberate rule, since a float has no single textual form to sign. Rounding
 * to tenths here therefore produced a value the digest step could not serialize at all, so
 * any statement whose text items did not land on whole points failed once it reached
 * sealing. Real PDFs place text at fractional coordinates constantly; the synthetic
 * fixtures happened to use whole numbers, which is why the contradiction stayed hidden.
 *
 * A point is 1/72 inch, so rounding moves a highlight by at most half a point — invisible,
 * and this value only ever positions the source-link overlay.
 */
function roundBox(value: number): number {
  return Math.round(value);
}

function canonicalizeRegion(region: SourceRegion): SourceRegion {
  const result: SourceRegion = {
    page: region.page,
    textItemIds: [...region.textItemIds].sort(),
    rawText: canonicalizeRawText(region.rawText),
    extractionPath: region.extractionPath,
  };
  if (region.bbox) {
    result.bbox = {
      x: roundBox(region.bbox.x),
      y: roundBox(region.bbox.y),
      width: roundBox(region.bbox.width),
      height: roundBox(region.bbox.height),
    };
  }
  return result;
}

function canonicalizeField(field: FieldProvenance, currency: string): FieldProvenance {
  const result: FieldProvenance = {
    field: field.field,
    sourceRegions: field.sourceRegions.map(canonicalizeRegion),
    status: field.status,
  };
  if (field.normalizedValue !== undefined) {
    result.normalizedValue =
      field.field === "description" || field.field === "date" || field.field === "postedDate"
        ? canonicalizeText(field.normalizedValue)
        : formatMoney(field.normalizedValue, currency);
  }
  return result;
}

function canonicalizeTransaction(transaction: Transaction, currency: string): Transaction {
  const description = canonicalizeText(transaction.description);
  const result: Transaction = {
    id: canonicalizeText(transaction.id, 64),
    date: transaction.date,
    description: description === "" ? "(no description)" : description,
    amount: formatMoney(transaction.amount, currency),
    sourceRegions: transaction.sourceRegions.map(canonicalizeRegion),
    fieldProvenance: transaction.fieldProvenance.map((field) => canonicalizeField(field, currency)),
    rawSourceText: canonicalizeRawText(transaction.rawSourceText),
    extractorVersion: canonicalizeText(transaction.extractorVersion, 64),
    verification: {
      sourceStatus: transaction.verification.sourceStatus,
      runningBalanceStatus: transaction.verification.runningBalanceStatus,
      ambiguityStatus: transaction.verification.ambiguityStatus,
      duplicateStatus: transaction.verification.duplicateStatus,
      checks: [...transaction.verification.checks].sort(),
    },
  };
  if (transaction.postedDate) result.postedDate = transaction.postedDate;
  const debit = canonicalAmount(transaction.debit, currency);
  if (debit !== undefined) result.debit = debit;
  const credit = canonicalAmount(transaction.credit, currency);
  if (credit !== undefined) result.credit = credit;
  const runningBalance = canonicalAmount(transaction.runningBalance, currency);
  if (runningBalance !== undefined) result.runningBalance = runningBalance;
  if (transaction.categoryHint) result.categoryHint = transaction.categoryHint;
  if (transaction.sourcePage !== undefined) result.sourcePage = transaction.sourcePage;
  return result;
}

export function canonicalizeStatement(input: NormalizedStatement): NormalizedStatement {
  const currency = input.currency.toUpperCase();

  const statement: NormalizedStatement = {
    schemaVersion: SCHEMA_VERSION,
    statementType: input.statementType,
    currency,
    transactions: input.transactions.map((transaction) =>
      canonicalizeTransaction(transaction, currency),
    ),
    extractionWarnings: dedupeSorted(
      input.extractionWarnings.map((warning) => canonicalizeText(warning, 300)),
    ),
    extractorVersion: canonicalizeText(input.extractorVersion, 64),
    extractionPath: input.extractionPath,
    completeness: input.completeness,
    ambiguities: input.ambiguities.map((finding) => ({
      ...finding,
      candidates: finding.candidates.map((candidate) => canonicalizeText(candidate, 200)),
      sourceRegions: finding.sourceRegions.map(canonicalizeRegion),
    })),
    verificationState: input.verificationState,
    runningBalanceSummary: input.runningBalanceSummary,
    privacy: {
      ...input.privacy,
      rawPdfLeftBrowser: false,
      providersUsed: [...input.privacy.providersUsed].sort(),
    },
  };

  if (input.periodStart) statement.periodStart = input.periodStart;
  if (input.periodEnd) statement.periodEnd = input.periodEnd;

  const optionalAmounts = [
    "openingBalance",
    "closingBalance",
    "statedTotalDebits",
    "statedTotalCredits",
    "statedPayments",
    "statedPurchases",
    "statedFees",
    "statedInterest",
  ] as const;

  for (const key of optionalAmounts) {
    const value = canonicalAmount(input[key], currency);
    if (value !== undefined) statement[key] = value;
  }

  return statement;
}

function dedupeSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value !== ""))].sort();
}

export async function canonicalizeAndDigest(
  input: unknown,
): Promise<{ statement: NormalizedStatement; digest: string }> {
  const parsed = normalizedStatementSchema.parse(input);
  const statement = canonicalizeStatement(parsed);
  const validated = normalizedStatementSchema.parse(statement);
  const digest = await canonicalDigest(validated);
  return { statement: validated, digest };
}
