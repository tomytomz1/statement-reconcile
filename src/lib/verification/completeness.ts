import type { ExtractedPdfText } from "@/lib/extraction/types";
import type {
  CompletenessReport,
  PageClassification,
  PageCompleteness,
} from "@/lib/schema/statement";

import { duplicateFingerprintIndexes, pageFingerprint } from "./fingerprint";

/**
 * Document completeness.
 *
 * A file cannot be verified unless every declared page was opened, extracted, and either
 * classified as carrying transactions or positively classified as blank/informational.
 * Truncation, mixed accounts, and unresolved candidate rows fail closed.
 */

const BLANK_ITEM_THRESHOLD = 8;
const BLANK_CHAR_THRESHOLD = 40;

export type CompletenessInput = {
  document: ExtractedPdfText;
  acceptedRows: number;
  sourceMappedRows: number;
  unresolvedCandidateRows: number;
  transactionSectionCount: number;
  mixedAccount: boolean;
  additionalZeroActivityAccounts?: number;
  truncated: boolean;
  timedOut: boolean;
  pagesWithCandidateRows: ReadonlySet<number>;
  /** Pages positively recognized as non-transaction informational pages. */
  informationalPages?: ReadonlySet<number>;
};

export function evaluateCompleteness(input: CompletenessInput): CompletenessReport {
  const pages = input.document.pages.map((page) =>
    classifyPage(page, input.pagesWithCandidateRows, input.informationalPages ?? new Set()),
  );
  const fingerprints = pages.map((page) => page.fingerprint);
  const duplicateGroups = duplicateFingerprintIndexes(fingerprints);
  const duplicatePageWarnings = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);

  const pagesDeclared = input.document.pageCount;
  const pagesOpened = pages.filter((page) => page.opened).length;
  const pagesExtracted = pages.filter((page) => page.textExtracted).length;
  const pagesIncludedInParse = pages.filter((page) => page.includedInParse).length;
  const blankPages = pages.filter((page) => page.classification === "blank_informational").length;

  const rejectionCodes: string[] = [];
  if (pagesOpened !== pagesDeclared) rejectionCodes.push("pages_unopened");
  if (pagesExtracted !== pagesDeclared) rejectionCodes.push("pages_unextracted");
  if (input.truncated) rejectionCodes.push("truncated");
  if (input.timedOut) rejectionCodes.push("timeout");
  if (input.mixedAccount) rejectionCodes.push("mixed_account");
  if (input.unresolvedCandidateRows > 0) rejectionCodes.push("unresolved_rows");
  if (input.transactionSectionCount === 0) rejectionCodes.push("no_transaction_section");
  if (input.acceptedRows === 0) rejectionCodes.push("no_accepted_rows");
  if (input.sourceMappedRows !== input.acceptedRows) rejectionCodes.push("unmapped_rows");
  if (duplicatePageWarnings > 0) rejectionCodes.push("duplicate_pages");
  if (pages.some((page) => page.classification === "unprocessed")) {
    rejectionCodes.push("unprocessed_page");
  }

  const passed = rejectionCodes.length === 0 && pagesDeclared === pagesIncludedInParse;

  return {
    filesReceived: 1,
    pagesDeclared,
    pagesOpened,
    pagesExtracted,
    pagesIncludedInParse,
    transactionSectionsDetected: input.transactionSectionCount,
    pagesWithCandidateRows: input.pagesWithCandidateRows.size,
    acceptedRows: input.acceptedRows,
    sourceMappedRows: input.sourceMappedRows,
    unresolvedCandidateRows: input.unresolvedCandidateRows,
    blankPages,
    duplicatePageWarnings,
    truncated: input.truncated,
    timedOut: input.timedOut,
    mixedAccount: input.mixedAccount,
    additionalZeroActivityAccounts: input.additionalZeroActivityAccounts ?? 0,
    pages,
    passed,
    rejectionCodes,
  };
}

function classifyPage(
  page: ExtractedPdfText["pages"][number],
  pagesWithCandidateRows: ReadonlySet<number>,
  informationalPages: ReadonlySet<number>,
): PageCompleteness {
  const itemCount = page.items.length;
  const charCount = page.items.reduce((sum, item) => sum + item.t.length, 0);
  const blank = itemCount <= BLANK_ITEM_THRESHOLD && charCount <= BLANK_CHAR_THRESHOLD;
  let classification: PageClassification = "unprocessed";
  if (pagesWithCandidateRows.has(page.page)) classification = "transactions";
  else if (informationalPages.has(page.page)) {
    classification = blank ? "blank_informational" : "summary";
  }

  return {
    page: page.page,
    declared: true,
    opened: true,
    textExtracted: true,
    includedInParse: classification !== "unprocessed",
    classification,
    fingerprint: pageFingerprint(page),
    itemCount,
    charCount,
  };
}
