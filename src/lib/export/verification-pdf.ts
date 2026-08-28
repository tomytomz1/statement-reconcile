import { siteConfig } from "@/config/site";
import { REPORT_VERSION, VERIFICATION_ENGINE_VERSION } from "@/lib/schema/provenance";
import { SCHEMA_VERSION, type NormalizedStatement } from "@/lib/schema/statement";
import type { ReconciliationResult } from "@/lib/schema/statement";
import { disclosureSentences } from "@/lib/privacy/receipt";

import { paginateLines, wrapReportLines, writeTextPdf } from "./text-pdf";

export const VERIFICATION_DISCLAIMER =
  "This report verifies the extraction and arithmetic checks described here. It does not verify that the original statement is authentic, complete outside the supplied PDF, approved by a bank, or suitable as an audit opinion.";

export type VerificationReportOptions = {
  reconciliation: ReconciliationResult;
  resultDigest: string;
  jobId?: string;
  generatedAt?: Date;
};

export function buildVerificationPdf(
  statement: NormalizedStatement,
  options: VerificationReportOptions,
): Uint8Array {
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const completeness = statement.completeness;
  const running = statement.runningBalanceSummary;
  const material = statement.ambiguities.filter(
    (finding) => finding.material && finding.resolution === "unresolved",
  );
  const digest = options.resultDigest;

  const lines = wrapReportLines([
    `${siteConfig.brandName} - extraction verification report`,
    `Report version ${REPORT_VERSION}  |  Schema ${SCHEMA_VERSION}  |  Product ${siteConfig.productVersion}`,
    `Verification engine ${VERIFICATION_ENGINE_VERSION}  |  Extractor ${statement.extractorVersion}`,
    `Generated ${generatedAt}`,
    options.jobId ? `Job reference ${options.jobId}` : "Job reference not supplied",
    `Canonical result digest ${digest}`,
    "",
    `Verification state: ${statement.verificationState.replaceAll("_", " ").toUpperCase()}`,
    `Document type: ${statement.statementType}`,
    `Currency: ${statement.currency}`,
    `Period: ${statement.periodStart ?? "not stated"} to ${statement.periodEnd ?? "not stated"}`,
    `Extraction path: ${statement.extractionPath}`,
    "",
    "Document completeness",
    `Pages declared ${completeness.pagesDeclared} / opened ${completeness.pagesOpened} / extracted ${completeness.pagesExtracted} / parsed ${completeness.pagesIncludedInParse}`,
    `Transaction sections detected: ${completeness.transactionSectionsDetected}`,
    `Accepted rows: ${completeness.acceptedRows}`,
    `Source-mapped rows: ${completeness.sourceMappedRows} / ${completeness.acceptedRows}`,
    `Unresolved candidate rows: ${completeness.unresolvedCandidateRows}`,
    `Blank informational pages: ${completeness.blankPages}`,
    `Duplicate-page warnings: ${completeness.duplicatePageWarnings}`,
    `Truncated: ${completeness.truncated ? "yes" : "no"}  |  Timed out: ${completeness.timedOut ? "yes" : "no"}`,
    completeness.mixedAccount
      ? "Account scope: unresolved multiple active accounts"
      : (completeness.additionalZeroActivityAccounts ?? 0) > 0
        ? `Account scope: one active account exported; ${completeness.additionalZeroActivityAccounts} zero-activity account section excluded`
        : "Account scope: one account section",
    `Completeness result: ${completeness.passed ? "passed" : `failed (${completeness.rejectionCodes.join(", ") || "unknown"})`}`,
    "",
    "Arithmetic",
    `Opening balance: ${statement.openingBalance ?? "not stated"}`,
    `Closing balance: ${statement.closingBalance ?? "not stated"}`,
    `Equation: ${options.reconciliation.equation ?? "not applicable"}`,
    `Difference: ${options.reconciliation.difference ?? "not applicable"}`,
    `Aggregate result: ${options.reconciliation.passed ? "passed" : "failed"}`,
    "",
    "Running-balance transitions",
    running.applicable
      ? `${running.transitionsPassed} / ${running.transitionsChecked} applicable transitions passed`
      : "Not applicable — this statement did not print a running balance on the extracted rows.",
    running.firstFailureIndex !== null
      ? `First failing transition index: ${running.firstFailureIndex} (difference ${running.firstFailureDifference ?? "n/a"})`
      : "",
    "",
    "Ambiguity and duplicates",
    `Material unresolved findings: ${material.length}`,
    ...material
      .slice(0, 20)
      .map(
        (finding) =>
          `- ${finding.code} (${finding.scope}) candidates: ${finding.candidates.join(" | ") || "none"}`,
      ),
    "",
    "Privacy receipt",
    ...disclosureSentences(statement.privacy),
    `Retention policy: ${statement.privacy.retentionPolicyVersion}`,
    "",
    "Scope",
    VERIFICATION_DISCLAIMER,
  ]);

  return writeTextPdf(paginateLines(lines));
}
