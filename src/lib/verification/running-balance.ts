import { currencyTolerance, formatMoney, toMoney } from "@/lib/money/decimal";
import type {
  NormalizedStatement,
  RunningBalanceSummary,
  Transaction,
} from "@/lib/schema/statement";

/**
 * Deterministic running-balance sequence validation.
 *
 * When the statement prints a running balance, two extraction errors can cancel in the
 * aggregate and still produce a $0.00 opening-to-closing difference. This module checks
 * every adjacent transition in statement order and never reorders by date.
 *
 * If any row has a running balance, every row must have one and every transition must
 * pass. Partial coverage is a failure, not `not_applicable`.
 */

export type RunningBalanceResult = RunningBalanceSummary & {
  passed: boolean;
  rejectionReasons: string[];
};

export function evaluateRunningBalances(statement: NormalizedStatement): RunningBalanceResult {
  const transactions = statement.transactions;
  const withBalance = transactions.filter((transaction) => transaction.runningBalance);
  if (withBalance.length === 0) {
    return {
      applicable: false,
      transitionsChecked: 0,
      transitionsPassed: 0,
      firstFailureIndex: null,
      firstFailureDifference: null,
      passed: true,
      rejectionReasons: [],
    };
  }

  if (withBalance.length !== transactions.length) {
    return {
      applicable: true,
      transitionsChecked: 0,
      transitionsPassed: 0,
      firstFailureIndex: null,
      firstFailureDifference: null,
      passed: false,
      rejectionReasons: [
        `Running balances are printed on ${withBalance.length} of ${transactions.length} rows. Partial coverage cannot be verified, so the file is rejected.`,
      ],
    };
  }

  return checkTransitions(statement);
}

function checkTransitions(statement: NormalizedStatement): RunningBalanceResult {
  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);
  const transactions = statement.transactions;
  const first = transactions[0];
  if (!first?.runningBalance) {
    return emptyFailure("The first row is missing a running balance.");
  }

  const derivedOpening = toMoney(first.runningBalance).minus(toMoney(first.amount));
  let previous = statement.openingBalance ? toMoney(statement.openingBalance) : derivedOpening;
  const reasons: string[] = [];

  if (statement.openingBalance) {
    const openingGap = derivedOpening.minus(toMoney(statement.openingBalance));
    if (!openingGap.abs().lessThanOrEqualTo(tolerance)) {
      reasons.push(
        `The first running balance does not follow from the opening balance (difference ${formatMoney(openingGap, currency)}).`,
      );
    }
  }

  let passedTransitions = 0;
  let firstFailureIndex: number | null = null;
  let firstFailureDifference: string | null = null;

  for (const [index, transaction] of transactions.entries()) {
    const expected = previous.plus(toMoney(transaction.amount));
    const actual = toMoney(transaction.runningBalance as string);
    const difference = actual.minus(expected);
    if (difference.abs().lessThanOrEqualTo(tolerance)) {
      passedTransitions += 1;
    } else if (firstFailureIndex === null) {
      firstFailureIndex = index;
      firstFailureDifference = formatMoney(difference, currency);
      reasons.push(
        `Running-balance transition failed at row ${index + 1} (difference ${firstFailureDifference}).`,
      );
    }
    previous = actual;
  }

  const last = transactions[transactions.length - 1];
  if (statement.closingBalance && last?.runningBalance) {
    const closingGap = toMoney(last.runningBalance).minus(toMoney(statement.closingBalance));
    if (!closingGap.abs().lessThanOrEqualTo(tolerance)) {
      reasons.push(
        `The final running balance does not equal the stated closing balance (difference ${formatMoney(closingGap, currency)}).`,
      );
    }
  }

  return {
    applicable: true,
    transitionsChecked: transactions.length,
    transitionsPassed: passedTransitions,
    firstFailureIndex,
    firstFailureDifference,
    passed: reasons.length === 0 && passedTransitions === transactions.length,
    rejectionReasons: reasons,
  };
}

function emptyFailure(reason: string): RunningBalanceResult {
  return {
    applicable: true,
    transitionsChecked: 0,
    transitionsPassed: 0,
    firstFailureIndex: null,
    firstFailureDifference: null,
    passed: false,
    rejectionReasons: [reason],
  };
}

export function applyRowRunningBalanceStatus(
  transactions: readonly Transaction[],
  summary: RunningBalanceSummary,
): Transaction[] {
  return transactions.map((transaction, index) => {
    let runningBalanceStatus: Transaction["verification"]["runningBalanceStatus"] =
      "not_applicable";
    if (summary.applicable) {
      runningBalanceStatus =
        summary.firstFailureIndex !== null && index >= summary.firstFailureIndex
          ? "failed"
          : "passed";
      if (summary.transitionsPassed === summary.transitionsChecked) runningBalanceStatus = "passed";
      if (summary.firstFailureIndex === index) runningBalanceStatus = "failed";
    }
    const checks = transaction.verification.checks.filter((check) => check !== "running_balance");
    if (summary.applicable) checks.push("running_balance");
    return {
      ...transaction,
      verification: {
        ...transaction.verification,
        runningBalanceStatus,
        checks,
      },
    };
  });
}
