import { z } from "zod";

/** Hard page ceiling, mirrored by siteConfig.limits.maxPages / PAYLOAD_LIMITS.maxPages. */
const MAX_PAGES = 50;

/**
 * Source-linked provenance.
 *
 * Every paid row must map to the PDF text that produced it. Raw extracted text is
 * preserved separately from the normalized description so canonicalization cannot
 * destroy evidence. Coordinates are recorded only when the text engine actually
 * supplied them; they are never invented.
 */

export const EXTRACTOR_VERSION_DETERMINISTIC = "deterministic/1.0.0";
export const EXTRACTOR_VERSION_PROVIDER = "provider/1.0.0";
export const VERIFICATION_ENGINE_VERSION = "2.0.0";
export const REPORT_VERSION = "1.0.0";
export const RETENTION_POLICY_VERSION = "v1-no-server-storage";

export const extractionPathSchema = z.enum([
  "local_text",
  "local_ocr",
  "secondary_text",
  "secondary_ocr",
]);
export type ExtractionPath = z.infer<typeof extractionPathSchema>;

export const boundingBoxSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
});
export type BoundingBox = z.infer<typeof boundingBoxSchema>;

export const sourceRegionSchema = z.object({
  page: z.number().int().min(1).max(MAX_PAGES),
  bbox: boundingBoxSchema.optional(),
  textItemIds: z.array(z.string().min(1).max(40)).max(80),
  rawText: z.string().max(2000),
  extractionPath: extractionPathSchema,
});
export type SourceRegion = z.infer<typeof sourceRegionSchema>;

export const provenanceFieldSchema = z.enum([
  "date",
  "postedDate",
  "description",
  "amount",
  "debit",
  "credit",
  "runningBalance",
]);
export type ProvenanceField = z.infer<typeof provenanceFieldSchema>;

export const fieldProvenanceStatusSchema = z.enum([
  "traced",
  "ambiguous",
  "missing",
  "conflicting",
]);
export type FieldProvenanceStatus = z.infer<typeof fieldProvenanceStatusSchema>;

export const fieldProvenanceSchema = z.object({
  field: provenanceFieldSchema,
  sourceRegions: z.array(sourceRegionSchema).max(20),
  normalizedValue: z.string().max(512).optional(),
  status: fieldProvenanceStatusSchema,
});
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;

export const transactionVerificationSchema = z.object({
  sourceStatus: z.enum(["passed", "failed"]),
  runningBalanceStatus: z.enum(["passed", "failed", "not_applicable"]),
  ambiguityStatus: z.enum(["clear", "blocked"]),
  duplicateStatus: z.enum(["clear", "suspected", "confirmed"]),
  checks: z.array(z.string().max(80)).max(40),
});
export type TransactionVerification = z.infer<typeof transactionVerificationSchema>;

export const ambiguityCodeSchema = z.enum([
  "amount_digits",
  "decimal_separator",
  "debit_credit_sign",
  "date",
  "row_boundary",
  "wrapped_description",
  "duplicate_row",
  "running_balance",
  "page_completeness",
  "account_boundary",
  "unsupported_layout",
  "provider_disagreement",
]);
export type AmbiguityCode = z.infer<typeof ambiguityCodeSchema>;

export const ambiguityFindingSchema = z.object({
  id: z.string().min(1).max(40),
  scope: z.enum(["document", "page", "section", "transaction", "field"]),
  code: ambiguityCodeSchema,
  material: z.boolean(),
  sourceRegions: z.array(sourceRegionSchema).max(20),
  candidates: z.array(z.string().max(200)).max(8),
  resolution: z.enum(["deterministic", "secondary_agreement", "unresolved"]),
});
export type AmbiguityFinding = z.infer<typeof ambiguityFindingSchema>;

export const fileVerificationStateSchema = z.enum([
  "received",
  "inspected",
  "extracted",
  "normalized",
  "completeness_checked",
  "source_mapped",
  "arithmetic_checked",
  "verification_passed",
  "verification_rejected",
]);
export type FileVerificationState = z.infer<typeof fileVerificationStateSchema>;

export const pageClassificationSchema = z.enum([
  "transactions",
  "summary",
  "blank_informational",
  "header_continuation",
  "unprocessed",
]);
export type PageClassification = z.infer<typeof pageClassificationSchema>;

export const pageCompletenessSchema = z.object({
  page: z.number().int().min(1).max(MAX_PAGES),
  declared: z.boolean(),
  opened: z.boolean(),
  textExtracted: z.boolean(),
  includedInParse: z.boolean(),
  classification: pageClassificationSchema,
  fingerprint: z.string().regex(/^[0-9a-f]{16}$/),
  itemCount: z.number().int().min(0),
  charCount: z.number().int().min(0),
});
export type PageCompleteness = z.infer<typeof pageCompletenessSchema>;

export const completenessReportSchema = z.object({
  filesReceived: z.number().int().min(0),
  pagesDeclared: z.number().int().min(0),
  pagesOpened: z.number().int().min(0),
  pagesExtracted: z.number().int().min(0),
  pagesIncludedInParse: z.number().int().min(0),
  transactionSectionsDetected: z.number().int().min(0),
  pagesWithCandidateRows: z.number().int().min(0),
  acceptedRows: z.number().int().min(0),
  sourceMappedRows: z.number().int().min(0),
  unresolvedCandidateRows: z.number().int().min(0),
  blankPages: z.number().int().min(0),
  duplicatePageWarnings: z.number().int().min(0),
  truncated: z.boolean(),
  timedOut: z.boolean(),
  mixedAccount: z.boolean(),
  pages: z.array(pageCompletenessSchema).max(MAX_PAGES),
  passed: z.boolean(),
  rejectionCodes: z.array(z.string().max(64)).max(20),
});
export type CompletenessReport = z.infer<typeof completenessReportSchema>;

export const processingDisclosureSchema = z.object({
  rawPdfLeftBrowser: z.literal(false),
  localPagesProcessed: z.number().int().min(0),
  remoteTextRegionsProcessed: z.number().int().min(0),
  remoteImageRegionsProcessed: z.number().int().min(0),
  providersUsed: z.array(z.string().max(40)).max(8),
  retentionPolicyVersion: z.string().max(64),
});
export type ProcessingDisclosure = z.infer<typeof processingDisclosureSchema>;

export const runningBalanceSummarySchema = z.object({
  applicable: z.boolean(),
  transitionsChecked: z.number().int().min(0),
  transitionsPassed: z.number().int().min(0),
  firstFailureIndex: z.number().int().min(0).nullable(),
  firstFailureDifference: z.string().max(40).nullable(),
});
export type RunningBalanceSummary = z.infer<typeof runningBalanceSummarySchema>;
