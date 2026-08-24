import { disclosureSentences } from "@/lib/privacy/receipt";
import type {
  NormalizedStatement,
  ProcessingDisclosure,
  RunningBalanceSummary,
} from "@/lib/schema/statement";

/** Exact denominators shown before payment and recorded in reports. */
export type VerificationEvidence = {
  state: NormalizedStatement["verificationState"];
  sourceMappedRows: number;
  transactionCount: number;
  pagesDeclared: number;
  pagesProcessed: number;
  materialAmbiguities: number;
  runningBalance: RunningBalanceSummary;
  completenessPassed: boolean;
  privacy: ProcessingDisclosure;
  extractionPath: NormalizedStatement["extractionPath"];
  disclosure: string[];
};

export function verificationEvidence(statement: NormalizedStatement): VerificationEvidence {
  const materialAmbiguities = statement.ambiguities.filter(
    (finding) => finding.material && finding.resolution === "unresolved",
  ).length;
  return {
    state: statement.verificationState,
    sourceMappedRows: statement.completeness.sourceMappedRows,
    transactionCount: statement.transactions.length,
    pagesDeclared: statement.completeness.pagesDeclared,
    pagesProcessed: statement.completeness.pagesIncludedInParse,
    materialAmbiguities,
    runningBalance: statement.runningBalanceSummary,
    completenessPassed: statement.completeness.passed,
    privacy: statement.privacy,
    extractionPath: statement.extractionPath,
    disclosure: disclosureSentences(statement.privacy),
  };
}
