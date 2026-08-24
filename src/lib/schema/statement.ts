import { z } from "zod";

import { isIsoDate } from "@/lib/dates/normalize";
import {
  ambiguityFindingSchema,
  completenessReportSchema,
  extractionPathSchema,
  fieldProvenanceSchema,
  fileVerificationStateSchema,
  processingDisclosureSchema,
  runningBalanceSummarySchema,
  sourceRegionSchema,
  transactionVerificationSchema,
} from "./provenance";

export {
  EXTRACTOR_VERSION_DETERMINISTIC,
  EXTRACTOR_VERSION_PROVIDER,
  REPORT_VERSION,
  RETENTION_POLICY_VERSION,
  VERIFICATION_ENGINE_VERSION,
  type AmbiguityCode,
  type AmbiguityFinding,
  type BoundingBox,
  type CompletenessReport,
  type ExtractionPath,
  type FieldProvenance,
  type FileVerificationState,
  type PageClassification,
  type PageCompleteness,
  type ProcessingDisclosure,
  type RunningBalanceSummary,
  type SourceRegion,
  type TransactionVerification,
} from "./provenance";

/**
 * Schemas for the normalized statement representation.
 *
 * These schemas are the trust boundary. Anything crossing the network — the parse
 * request, a provider response, the export request — is validated here before any
 * business logic touches it. Types are inferred from the schemas so the runtime shape
 * and the compile-time shape can never drift.
 */

/** Canonical signed decimal string, e.g. `-1234.56`. Never a float. */
export const moneyString = z
  .string()
  .trim()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "must be a canonical decimal string");

/** Canonical non-negative decimal string. */
export const unsignedMoneyString = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/, "must be a non-negative decimal string");

export const isoDateString = z
  .string()
  .trim()
  .refine((value) => isIsoDate(value), "must be a real ISO date (YYYY-MM-DD)");

export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "must be a three-letter ISO 4217 code");

export const statementTypeSchema = z.enum(["checking", "savings", "credit_card", "unknown"]);
export type StatementType = z.infer<typeof statementTypeSchema>;

export const categoryHintSchema = z.enum([
  "debit",
  "credit",
  "payment",
  "charge",
  "fee",
  "interest",
  "other",
]);
export type CategoryHint = z.infer<typeof categoryHintSchema>;

export const MAX_DESCRIPTION_LENGTH = 512;
export const MAX_TRANSACTIONS = 5000;
export const MAX_WARNINGS = 100;
export const MAX_AMBIGUITY_FINDINGS = 200;

export const transactionSchema = z.object({
  /** Stable within a canonicalized statement. Digest-relevant. */
  id: z.string().min(1).max(64),
  date: isoDateString,
  postedDate: isoDateString.optional(),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  amount: moneyString,
  debit: unsignedMoneyString.optional(),
  credit: unsignedMoneyString.optional(),
  runningBalance: moneyString.optional(),
  categoryHint: categoryHintSchema.optional(),
  sourcePage: z.number().int().min(1).max(1000).optional(),
  sourceRegions: z.array(sourceRegionSchema).max(20),
  fieldProvenance: z.array(fieldProvenanceSchema).max(12),
  rawSourceText: z.string().max(2000),
  extractorVersion: z.string().min(1).max(64),
  verification: transactionVerificationSchema,
});
export type Transaction = z.infer<typeof transactionSchema>;

export const SCHEMA_VERSION = 2 as const;

export const normalizedStatementSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  statementType: statementTypeSchema,
  currency: currencyCode,
  periodStart: isoDateString.optional(),
  periodEnd: isoDateString.optional(),
  openingBalance: moneyString.optional(),
  closingBalance: moneyString.optional(),
  statedTotalDebits: moneyString.optional(),
  statedTotalCredits: moneyString.optional(),
  statedPayments: moneyString.optional(),
  statedPurchases: moneyString.optional(),
  statedFees: moneyString.optional(),
  statedInterest: moneyString.optional(),
  transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS),
  extractionWarnings: z.array(z.string().max(300)).max(MAX_WARNINGS),
  extractorVersion: z.string().min(1).max(64),
  extractionPath: extractionPathSchema,
  completeness: completenessReportSchema,
  ambiguities: z.array(ambiguityFindingSchema).max(MAX_AMBIGUITY_FINDINGS),
  verificationState: fileVerificationStateSchema,
  runningBalanceSummary: runningBalanceSummarySchema,
  privacy: processingDisclosureSchema,
});
export type NormalizedStatement = z.infer<typeof normalizedStatementSchema>;

/**
 * The looser shape a parsing provider is allowed to return. Amounts arrive as strings
 * in whatever form the model produced; the local normalization layer canonicalizes them
 * before validation against {@link normalizedStatementSchema}.
 */
export const candidateTransactionSchema = z.object({
  date: z.string().max(32),
  postedDate: z.string().max(32).nullish(),
  description: z.string().max(2000),
  amount: z.string().max(40).nullish(),
  debit: z.string().max(40).nullish(),
  credit: z.string().max(40).nullish(),
  runningBalance: z.string().max(40).nullish(),
  categoryHint: z.string().max(24).nullish(),
  sourcePage: z.number().int().min(1).max(1000).nullish(),
  rawSourceText: z.string().max(2000).nullish(),
  sourceTextItemIds: z.array(z.string().max(40)).max(80).nullish(),
});

export const candidateStatementSchema = z.object({
  statementType: z.string().max(24).nullish(),
  currency: z.string().max(8).nullish(),
  periodStart: z.string().max(32).nullish(),
  periodEnd: z.string().max(32).nullish(),
  openingBalance: z.string().max(40).nullish(),
  closingBalance: z.string().max(40).nullish(),
  statedTotalDebits: z.string().max(40).nullish(),
  statedTotalCredits: z.string().max(40).nullish(),
  statedPayments: z.string().max(40).nullish(),
  statedPurchases: z.string().max(40).nullish(),
  statedFees: z.string().max(40).nullish(),
  statedInterest: z.string().max(40).nullish(),
  accountCount: z.number().int().min(0).max(50).nullish(),
  transactions: z.array(candidateTransactionSchema).max(MAX_TRANSACTIONS),
  notes: z.array(z.string().max(300)).max(MAX_WARNINGS).nullish(),
});
export type NormalizedStatementCandidate = z.infer<typeof candidateStatementSchema>;

export const reconciliationCheckSchema = z.object({
  name: z.string(),
  label: z.string(),
  passed: z.boolean(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  difference: z.string().optional(),
  /** Informational checks report a result but cannot fail the statement on their own. */
  advisory: z.boolean().default(false),
});
export type ReconciliationCheck = z.infer<typeof reconciliationCheckSchema>;

export const reconciliationResultSchema = z.object({
  passed: z.boolean(),
  method: z.string(),
  methodLabel: z.string(),
  equation: z.string().optional(),
  expectedClosingBalance: z.string().optional(),
  actualClosingBalance: z.string().optional(),
  difference: z.string().optional(),
  checks: z.array(reconciliationCheckSchema),
  rejectionReasons: z.array(z.string()),
});
export type ReconciliationResult = z.infer<typeof reconciliationResultSchema>;

/** Summary numbers shown in the preview and in the XLSX summary sheet. */
export const statementSummarySchema = z.object({
  statementType: statementTypeSchema,
  currency: currencyCode,
  periodStart: isoDateString.optional(),
  periodEnd: isoDateString.optional(),
  transactionCount: z.number().int().min(0),
  openingBalance: moneyString.optional(),
  closingBalance: moneyString.optional(),
  totalCredits: moneyString,
  totalDebits: moneyString,
  totalFees: moneyString.optional(),
  totalInterest: moneyString.optional(),
  netChange: moneyString,
});
export type StatementSummary = z.infer<typeof statementSummarySchema>;

export const fileVerificationResultSchema = z.object({
  state: fileVerificationStateSchema,
  passed: z.boolean(),
  rejectionReasons: z.array(z.string().max(400)).max(30),
  sourceMappedRows: z.number().int().min(0),
  transactionCount: z.number().int().min(0),
  pagesDeclared: z.number().int().min(0),
  pagesProcessed: z.number().int().min(0),
  materialAmbiguities: z.number().int().min(0),
});
export type FileVerificationResult = z.infer<typeof fileVerificationResultSchema>;
