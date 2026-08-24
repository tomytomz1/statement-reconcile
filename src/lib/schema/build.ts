import {
  EXTRACTOR_VERSION_DETERMINISTIC,
  RETENTION_POLICY_VERSION,
  SCHEMA_VERSION,
  type CompletenessReport,
  type FieldProvenance,
  type NormalizedStatement,
  type ProcessingDisclosure,
  type SourceRegion,
  type Transaction,
  type TransactionVerification,
} from "@/lib/schema/statement";

/**
 * Test and parser helpers for schema v2 provenance.
 *
 * Production parse paths must attach real source regions. Tests that only exercise
 * arithmetic may use {@link stubProvenance} so they do not invent coordinates while
 * still satisfying the schema. The verification gate still fails rows with empty
 * sourceRegions.
 */

export function stubRegion(page = 1, rawText = "ROW"): SourceRegion {
  return {
    page,
    textItemIds: [`p${page}i0`],
    rawText,
    extractionPath: "local_text",
    bbox: { x: 36, y: 120, width: 480, height: 11 },
  };
}

export function tracedFields(
  transaction: Pick<
    Transaction,
    "date" | "description" | "amount" | "debit" | "credit" | "runningBalance" | "postedDate"
  >,
  region: SourceRegion,
): FieldProvenance[] {
  const fields: FieldProvenance[] = [
    { field: "date", sourceRegions: [region], normalizedValue: transaction.date, status: "traced" },
    {
      field: "description",
      sourceRegions: [region],
      normalizedValue: transaction.description,
      status: "traced",
    },
    {
      field: "amount",
      sourceRegions: [region],
      normalizedValue: transaction.amount,
      status: "traced",
    },
  ];
  if (transaction.postedDate) {
    fields.push({
      field: "postedDate",
      sourceRegions: [region],
      normalizedValue: transaction.postedDate,
      status: "traced",
    });
  }
  if (transaction.debit) {
    fields.push({
      field: "debit",
      sourceRegions: [region],
      normalizedValue: transaction.debit,
      status: "traced",
    });
  }
  if (transaction.credit) {
    fields.push({
      field: "credit",
      sourceRegions: [region],
      normalizedValue: transaction.credit,
      status: "traced",
    });
  }
  if (transaction.runningBalance) {
    fields.push({
      field: "runningBalance",
      sourceRegions: [region],
      normalizedValue: transaction.runningBalance,
      status: "traced",
    });
  }
  return fields;
}

export function passedVerification(checks: string[] = ["source_mapped"]): TransactionVerification {
  return {
    sourceStatus: "passed",
    runningBalanceStatus: "not_applicable",
    ambiguityStatus: "clear",
    duplicateStatus: "clear",
    checks,
  };
}

export function transactionId(index: number, date: string, amount: string): string {
  const padded = String(index).padStart(4, "0");
  return `t${padded}-${date.replace(/-/g, "")}-${amount.replace(/[^0-9]/g, "")}`.slice(0, 64);
}

export function withProvenance(
  partial: Omit<
    Transaction,
    | "id"
    | "sourceRegions"
    | "fieldProvenance"
    | "rawSourceText"
    | "extractorVersion"
    | "verification"
  > &
    Partial<
      Pick<
        Transaction,
        | "id"
        | "sourceRegions"
        | "fieldProvenance"
        | "rawSourceText"
        | "extractorVersion"
        | "verification"
      >
    >,
  index = 0,
): Transaction {
  const region =
    partial.sourceRegions?.[0] ?? stubRegion(partial.sourcePage ?? 1, partial.description);
  const raw = partial.rawSourceText ?? `${partial.date} ${partial.description} ${partial.amount}`;
  return {
    ...partial,
    id: partial.id ?? transactionId(index, partial.date, partial.amount),
    sourceRegions: partial.sourceRegions ?? [region],
    fieldProvenance: partial.fieldProvenance ?? tracedFields(partial, region),
    rawSourceText: raw,
    extractorVersion: partial.extractorVersion ?? EXTRACTOR_VERSION_DETERMINISTIC,
    verification: partial.verification ?? passedVerification(),
  };
}

export function emptyCompleteness(pages = 1, rows = 0): CompletenessReport {
  return {
    filesReceived: 1,
    pagesDeclared: pages,
    pagesOpened: pages,
    pagesExtracted: pages,
    pagesIncludedInParse: pages,
    transactionSectionsDetected: 1,
    pagesWithCandidateRows: pages,
    acceptedRows: rows,
    sourceMappedRows: rows,
    unresolvedCandidateRows: 0,
    blankPages: 0,
    duplicatePageWarnings: 0,
    truncated: false,
    timedOut: false,
    mixedAccount: false,
    pages: Array.from({ length: pages }, (_, index) => ({
      page: index + 1,
      declared: true,
      opened: true,
      textExtracted: true,
      includedInParse: true,
      classification: "transactions" as const,
      fingerprint: (index + 1).toString(16).padStart(16, "0"),
      itemCount: 40,
      charCount: 800,
    })),
    passed: true,
    rejectionCodes: [],
  };
}

export function localPrivacy(pages = 1): ProcessingDisclosure {
  return {
    rawPdfLeftBrowser: false,
    localPagesProcessed: pages,
    remoteTextRegionsProcessed: 0,
    remoteImageRegionsProcessed: 0,
    providersUsed: [],
    retentionPolicyVersion: RETENTION_POLICY_VERSION,
  };
}

export function withStatementDefaults(
  partial: Omit<
    NormalizedStatement,
    | "schemaVersion"
    | "extractorVersion"
    | "extractionPath"
    | "completeness"
    | "ambiguities"
    | "verificationState"
    | "runningBalanceSummary"
    | "privacy"
    | "transactions"
  > &
    Partial<
      Pick<
        NormalizedStatement,
        | "extractorVersion"
        | "extractionPath"
        | "completeness"
        | "ambiguities"
        | "verificationState"
        | "runningBalanceSummary"
        | "privacy"
      >
    > & {
      transactions: Array<Parameters<typeof withProvenance>[0] | Transaction>;
    },
): NormalizedStatement {
  const transactions = partial.transactions.map((transaction, index) =>
    "id" in transaction && transaction.id
      ? (transaction as Transaction)
      : withProvenance(transaction, index),
  );
  return {
    schemaVersion: SCHEMA_VERSION,
    extractorVersion: partial.extractorVersion ?? EXTRACTOR_VERSION_DETERMINISTIC,
    extractionPath: partial.extractionPath ?? "local_text",
    completeness: partial.completeness ?? emptyCompleteness(1, transactions.length),
    ambiguities: partial.ambiguities ?? [],
    verificationState: partial.verificationState ?? "arithmetic_checked",
    runningBalanceSummary: partial.runningBalanceSummary ?? {
      applicable: false,
      transitionsChecked: 0,
      transitionsPassed: 0,
      firstFailureIndex: null,
      firstFailureDifference: null,
    },
    privacy: partial.privacy ?? localPrivacy(1),
    ...partial,
    transactions,
  };
}
