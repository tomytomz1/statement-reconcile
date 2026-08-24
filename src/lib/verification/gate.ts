import { reconcile } from "@/lib/reconciliation/reconcile";
import type {
  AmbiguityFinding,
  CompletenessReport,
  FileVerificationResult,
  FileVerificationState,
  NormalizedStatement,
} from "@/lib/schema/statement";

import {
  applyAmbiguityToRows,
  duplicateRowFindings,
  materialUnresolved,
  sourceMappingFailures,
} from "./ambiguity";
import { applyRowRunningBalanceStatus, evaluateRunningBalances } from "./running-balance";

/**
 * Acceptance gate.
 *
 * A file reaches `verification_passed` only when completeness, source mapping, material
 * ambiguity, running-balance (when applicable), and aggregate/subtotal checks all pass.
 * The parsing provider cannot set this state.
 */

export type GateInput = {
  statement: NormalizedStatement;
  completeness: CompletenessReport;
  ambiguities: AmbiguityFinding[];
};

export type GateOutput = {
  statement: NormalizedStatement;
  result: FileVerificationResult;
};

export function evaluateVerificationGate(input: GateInput): GateOutput {
  const reasons: string[] = [];
  let state: FileVerificationState = "arithmetic_checked";
  const ambiguities = uniqueFindings([
    ...input.ambiguities,
    ...sourceMappingFailures(input.statement.transactions),
    ...duplicateRowFindings(input.statement.transactions),
  ]);

  if (!input.completeness.passed) {
    reasons.push(
      `Document completeness failed (${input.completeness.rejectionCodes.join(", ") || "unknown"}).`,
    );
  }

  const sourceMapped = input.statement.transactions.filter(
    (transaction) => transaction.sourceRegions.length > 0,
  ).length;
  if (sourceMapped !== input.statement.transactions.length) {
    reasons.push(
      `${sourceMapped} of ${input.statement.transactions.length} rows could be traced to source. Every accepted row must map to evidence.`,
    );
  }

  const unresolved = materialUnresolved(ambiguities);
  if (unresolved.length > 0) {
    reasons.push(
      `${unresolved.length} unresolved material ${unresolved.length === 1 ? "ambiguity" : "ambiguities"} remain. We will not guess.`,
    );
  }

  const running = evaluateRunningBalances(input.statement);
  if (!running.passed) reasons.push(...running.rejectionReasons);

  const arithmetic = reconcile(input.statement);
  if (!arithmetic.passed) {
    reasons.push(
      arithmetic.rejectionReasons[0] ??
        "The statement did not include enough independently checkable balances, or the totals did not agree.",
    );
  }

  const passed = reasons.length === 0;
  state = passed ? "verification_passed" : "verification_rejected";

  const withRunning = applyRowRunningBalanceStatus(input.statement.transactions, running);
  const draft: NormalizedStatement = {
    ...input.statement,
    transactions: withRunning,
    completeness: input.completeness,
    ambiguities,
    runningBalanceSummary: {
      applicable: running.applicable,
      transitionsChecked: running.transitionsChecked,
      transitionsPassed: running.transitionsPassed,
      firstFailureIndex: running.firstFailureIndex,
      firstFailureDifference: running.firstFailureDifference,
    },
    verificationState: state,
  };
  const statement: NormalizedStatement = {
    ...draft,
    transactions: applyAmbiguityToRows(draft, ambiguities).map((transaction) => ({
      ...transaction,
      verification: {
        ...transaction.verification,
        sourceStatus: sourceMappingFailures([transaction]).length === 0 ? "passed" : "failed",
        duplicateStatus: duplicateTouches(transaction, ambiguities) ? "suspected" : "clear",
      },
    })),
  };

  return {
    statement,
    result: {
      state,
      passed,
      rejectionReasons: unique(reasons),
      sourceMappedRows: sourceMapped,
      transactionCount: statement.transactions.length,
      pagesDeclared: input.completeness.pagesDeclared,
      pagesProcessed: input.completeness.pagesIncludedInParse,
      materialAmbiguities: unresolved.length,
    },
  };
}

export function canOfferCheckout(state: FileVerificationState): boolean {
  return state === "verification_passed";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function uniqueFindings(values: readonly AmbiguityFinding[]): AmbiguityFinding[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.code}:${value.candidates.join("|")}:${value.sourceRegions
      .flatMap((region) => region.textItemIds)
      .join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function duplicateTouches(
  transaction: NormalizedStatement["transactions"][number],
  findings: readonly AmbiguityFinding[],
): boolean {
  return findings.some(
    (item) => item.code === "duplicate_row" && item.candidates.includes(transaction.id),
  );
}
