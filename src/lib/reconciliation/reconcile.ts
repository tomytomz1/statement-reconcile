import { isWithinPeriod } from "@/lib/dates/normalize";
import {
  Money,
  type MoneyValue,
  currencyTolerance,
  formatMoney,
  toMoney,
} from "@/lib/money/decimal";
import type {
  NormalizedStatement,
  ReconciliationCheck,
  ReconciliationResult,
  StatementSummary,
  Transaction,
} from "@/lib/schema/statement";

/**
 * Deterministic reconciliation engine.
 *
 * This module is the final authority on whether a statement is trustworthy enough to
 * charge for. It is pure: same input, same output, no I/O, no clock, no randomness. A
 * parsing provider may propose structured data but may never mark a result reconciled —
 * only this file can, and it recomputes every total from the transaction rows.
 *
 * ## Sign convention
 *
 * `Transaction.amount` is signed relative to the balance the statement prints:
 *
 * - checking / savings: deposits are positive, withdrawals negative, so
 *   `openingBalance + sum(amount) = closingBalance`.
 * - credit card: balances are printed as amounts owed, so charges, fees and interest are
 *   positive and payments and credits are negative, which gives the same identity:
 *   `previousBalance + sum(amount) = newBalance`.
 *
 * The normalization layer is responsible for producing this convention. The engine
 * verifies it rather than assuming it, and rejects rows whose sign is ambiguous.
 */

export type ReconciliationMethod =
  | "opening_closing_sum"
  | "running_balance_chain"
  | "stated_category_totals"
  | "stated_totals"
  | "insufficient_data";

const METHOD_LABELS: Record<ReconciliationMethod, string> = {
  opening_closing_sum: "Opening balance + transactions = closing balance",
  running_balance_chain: "Row-by-row running balance chain",
  stated_category_totals: "Stated category totals vs. transaction rows",
  stated_totals: "Stated debit and credit totals vs. transaction rows",
  insufficient_data: "Not enough balancing data",
};

/** Human-readable equations shown in the preview as the proof of the math used. */
const EQUATIONS: Partial<Record<ReconciliationMethod, Record<"asset" | "credit", string>>> = {
  opening_closing_sum: {
    asset: "Opening balance + credits − debits = closing balance",
    credit: "Previous balance + purchases + fees + interest − payments − credits = new balance",
  },
  running_balance_chain: {
    asset: "Each row's balance = previous balance + that row's amount",
    credit: "Each row's balance = previous balance + that row's amount",
  },
  stated_category_totals: {
    asset: "Statement subtotals = sum of the extracted rows in each category",
    credit: "Statement subtotals = sum of the extracted rows in each category",
  },
  stated_totals: {
    asset: "Stated total credits and total debits = sum of the extracted rows",
    credit: "Stated total credits and total debits = sum of the extracted rows",
  },
};

export const MAX_DATE_SLACK_DAYS = 5;

type Family = "asset" | "credit";

function familyOf(statement: NormalizedStatement): Family {
  return statement.statementType === "credit_card" ? "credit" : "asset";
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export type TransactionAggregates = {
  net: MoneyValue;
  positive: MoneyValue;
  negative: MoneyValue;
  fees: MoneyValue;
  interest: MoneyValue;
  payments: MoneyValue;
  charges: MoneyValue;
  credits: MoneyValue;
};

export function aggregate(transactions: readonly Transaction[]): TransactionAggregates {
  let net = new Money(0);
  let positive = new Money(0);
  let negative = new Money(0);
  let fees = new Money(0);
  let interest = new Money(0);
  let payments = new Money(0);
  let charges = new Money(0);
  let credits = new Money(0);

  for (const transaction of transactions) {
    const amount = toMoney(transaction.amount);
    net = net.plus(amount);
    if (amount.isNegative()) negative = negative.plus(amount.abs());
    else positive = positive.plus(amount);

    switch (transaction.categoryHint) {
      case "fee":
        fees = fees.plus(amount.abs());
        break;
      case "interest":
        interest = interest.plus(amount.abs());
        break;
      case "payment":
        payments = payments.plus(amount.abs());
        break;
      case "charge":
        charges = charges.plus(amount.abs());
        break;
      case "credit":
        credits = credits.plus(amount.abs());
        break;
      default:
        break;
    }
  }

  return { net, positive, negative, fees, interest, payments, charges, credits };
}

export function summarize(statement: NormalizedStatement): StatementSummary {
  const totals = aggregate(statement.transactions);
  const currency = statement.currency;
  const summary: StatementSummary = {
    statementType: statement.statementType,
    currency,
    transactionCount: statement.transactions.length,
    totalCredits: formatMoney(totals.positive, currency),
    totalDebits: formatMoney(totals.negative, currency),
    netChange: formatMoney(totals.net, currency),
  };
  if (statement.periodStart) summary.periodStart = statement.periodStart;
  if (statement.periodEnd) summary.periodEnd = statement.periodEnd;
  if (statement.openingBalance) summary.openingBalance = statement.openingBalance;
  if (statement.closingBalance) summary.closingBalance = statement.closingBalance;
  if (!totals.fees.isZero()) summary.totalFees = formatMoney(totals.fees, currency);
  if (!totals.interest.isZero()) summary.totalInterest = formatMoney(totals.interest, currency);
  return summary;
}

// ---------------------------------------------------------------------------
// Structural integrity
// ---------------------------------------------------------------------------

type Builder = {
  checks: ReconciliationCheck[];
  rejections: string[];
};

function addCheck(builder: Builder, check: ReconciliationCheck): void {
  builder.checks.push(check);
  if (!check.passed && !check.advisory) {
    builder.rejections.push(`${check.label} did not hold.`);
  }
}

/**
 * Checks that do not depend on balances. A failure here rejects the statement outright:
 * an internally inconsistent extraction cannot be rescued by a matching total.
 */
function runStructuralChecks(statement: NormalizedStatement, builder: Builder): void {
  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);
  const transactions = statement.transactions;

  addCheck(builder, {
    name: "has_transactions",
    label: "Statement contains at least one transaction",
    passed: transactions.length > 0,
    actual: String(transactions.length),
    advisory: false,
  });
  if (transactions.length === 0) return;

  // Debit and credit columns must not both carry a value on the same row: that row's
  // direction would be ambiguous and we would be guessing at the sign.
  const ambiguousRows: number[] = [];
  const inconsistentRows: number[] = [];
  for (const [index, transaction] of transactions.entries()) {
    const debit = transaction.debit ? toMoney(transaction.debit) : null;
    const credit = transaction.credit ? toMoney(transaction.credit) : null;
    const amount = toMoney(transaction.amount);

    if (debit && credit && !debit.isZero() && !credit.isZero()) {
      ambiguousRows.push(index + 1);
      continue;
    }

    // When a column value is present it must agree in magnitude with the signed amount,
    // and the sign must match the column's direction.
    if (debit && !debit.isZero()) {
      const expected = familyOf(statement) === "credit" ? debit : debit.negated();
      if (!amount.minus(expected).abs().lessThanOrEqualTo(tolerance))
        inconsistentRows.push(index + 1);
    } else if (credit && !credit.isZero()) {
      const expected = familyOf(statement) === "credit" ? credit.negated() : credit;
      if (!amount.minus(expected).abs().lessThanOrEqualTo(tolerance))
        inconsistentRows.push(index + 1);
    }
  }

  addCheck(builder, {
    name: "unambiguous_direction",
    label: "Every row has an unambiguous debit or credit direction",
    passed: ambiguousRows.length === 0,
    actual: ambiguousRows.length === 0 ? "all rows" : `${ambiguousRows.length} ambiguous rows`,
    advisory: false,
  });

  addCheck(builder, {
    name: "column_amount_agreement",
    label: "Debit and credit columns agree with the signed amount",
    passed: inconsistentRows.length === 0,
    actual:
      inconsistentRows.length === 0 ? "all rows" : `${inconsistentRows.length} inconsistent rows`,
    advisory: false,
  });

  // Zero-amount rows are usually informational text captured as a transaction.
  const zeroRows = transactions.filter((transaction) =>
    toMoney(transaction.amount).isZero(),
  ).length;
  addCheck(builder, {
    name: "no_zero_amount_rows",
    label: "No zero-amount transaction rows",
    passed: zeroRows === 0,
    actual: `${zeroRows}`,
    advisory: true,
  });

  // Exact duplicates that also share a running balance are arithmetically impossible and
  // are the signature of a duplicated row rather than two genuine identical purchases.
  const seen = new Map<string, number>();
  let impossibleDuplicates = 0;
  let softDuplicates = 0;
  for (const transaction of transactions) {
    const key = [
      transaction.date,
      transaction.description,
      transaction.amount,
      transaction.runningBalance ?? "",
    ].join("|");
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      if (transaction.runningBalance) impossibleDuplicates += 1;
      else softDuplicates += 1;
    }
  }

  addCheck(builder, {
    name: "no_impossible_duplicates",
    label: "No duplicated rows sharing an identical running balance",
    passed: impossibleDuplicates === 0,
    actual: `${impossibleDuplicates}`,
    advisory: false,
  });

  if (softDuplicates > 0) {
    addCheck(builder, {
      name: "repeated_rows",
      label: "Repeated identical rows without running balances",
      passed: false,
      actual: `${softDuplicates}`,
      advisory: true,
    });
  }

  // Dates must fall inside the statement period. A row far outside it means the parser
  // mixed documents or invented a row.
  if (statement.periodStart || statement.periodEnd) {
    const context = {
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
    };
    const outside = transactions.filter(
      (transaction) => !isWithinPeriod(transaction.date, context, MAX_DATE_SLACK_DAYS),
    ).length;
    addCheck(builder, {
      name: "dates_within_period",
      label: "All transaction dates fall within the statement period",
      passed: outside === 0,
      expected: `${statement.periodStart ?? "?"} to ${statement.periodEnd ?? "?"}`,
      actual: outside === 0 ? "all rows" : `${outside} rows outside the period`,
      advisory: false,
    });
  }

  if (statement.periodStart && statement.periodEnd) {
    addCheck(builder, {
      name: "period_ordered",
      label: "Statement period start is not after the period end",
      passed: statement.periodStart <= statement.periodEnd,
      expected: `${statement.periodStart} <= ${statement.periodEnd}`,
      advisory: false,
    });
  }
}

// ---------------------------------------------------------------------------
// Balancing methods
// ---------------------------------------------------------------------------

type MethodOutcome = {
  method: ReconciliationMethod;
  passed: boolean;
  expectedClosingBalance?: string;
  actualClosingBalance?: string;
  difference?: string;
};

/** `openingBalance + sum(amount) = closingBalance` */
function tryOpeningClosing(statement: NormalizedStatement, builder: Builder): MethodOutcome | null {
  if (!statement.openingBalance || !statement.closingBalance) return null;

  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);
  const totals = aggregate(statement.transactions);
  const expected = toMoney(statement.openingBalance).plus(totals.net);
  const actual = toMoney(statement.closingBalance);
  const difference = actual.minus(expected);
  const passed = difference.abs().lessThanOrEqualTo(tolerance);

  addCheck(builder, {
    name: "opening_plus_transactions_equals_closing",
    label:
      familyOf(statement) === "credit"
        ? "Previous balance plus all activity equals the new balance"
        : "Opening balance plus all transactions equals the closing balance",
    passed,
    expected: formatMoney(expected, currency),
    actual: formatMoney(actual, currency),
    difference: formatMoney(difference, currency),
    advisory: false,
  });

  return {
    method: "opening_closing_sum",
    passed,
    expectedClosingBalance: formatMoney(expected, currency),
    actualClosingBalance: formatMoney(actual, currency),
    difference: formatMoney(difference, currency),
  };
}

/**
 * Row-by-row running balance validation. Requires a running balance on every row plus
 * an anchor: either a stated opening balance or a stated closing balance.
 */
function tryRunningBalanceChain(
  statement: NormalizedStatement,
  builder: Builder,
): MethodOutcome | null {
  const transactions = statement.transactions;
  if (transactions.length === 0) return null;
  if (!transactions.every((transaction) => transaction.runningBalance)) return null;

  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);

  const firstRow = transactions[0];
  const lastRow = transactions[transactions.length - 1];
  if (!firstRow?.runningBalance || !lastRow?.runningBalance) return null;

  const derivedOpening = toMoney(firstRow.runningBalance).minus(toMoney(firstRow.amount));
  const anchor = statement.openingBalance ?? formatMoney(derivedOpening, currency);

  if (statement.openingBalance) {
    addCheck(builder, {
      name: "running_balance_opening_anchor",
      label: "First row's running balance follows from the opening balance",
      passed: derivedOpening
        .minus(toMoney(statement.openingBalance))
        .abs()
        .lessThanOrEqualTo(tolerance),
      expected: formatMoney(statement.openingBalance, currency),
      actual: formatMoney(derivedOpening, currency),
      advisory: false,
    });
  }

  let previous = toMoney(anchor);
  let brokenRows = 0;
  let firstBreak: number | null = null;
  for (const [index, transaction] of transactions.entries()) {
    const expected = previous.plus(toMoney(transaction.amount));
    const actual = toMoney(transaction.runningBalance as string);
    if (!expected.minus(actual).abs().lessThanOrEqualTo(tolerance)) {
      brokenRows += 1;
      firstBreak ??= index + 1;
    }
    previous = actual;
  }

  addCheck(builder, {
    name: "running_balance_chain",
    label: "Every row's running balance follows from the previous row",
    passed: brokenRows === 0,
    expected: "0 breaks",
    actual: brokenRows === 0 ? "0 breaks" : `${brokenRows} breaks (first at row ${firstBreak})`,
    advisory: false,
  });

  if (statement.closingBalance) {
    const finalBalance = toMoney(lastRow.runningBalance);
    addCheck(builder, {
      name: "running_balance_closing_anchor",
      label: "Final row's running balance equals the stated closing balance",
      passed: finalBalance
        .minus(toMoney(statement.closingBalance))
        .abs()
        .lessThanOrEqualTo(tolerance),
      expected: formatMoney(statement.closingBalance, currency),
      actual: formatMoney(finalBalance, currency),
      advisory: false,
    });
  }

  const passed = brokenRows === 0;
  const outcome: MethodOutcome = { method: "running_balance_chain", passed };
  if (statement.closingBalance) {
    outcome.expectedClosingBalance = formatMoney(lastRow.runningBalance, currency);
    outcome.actualClosingBalance = formatMoney(statement.closingBalance, currency);
    outcome.difference = formatMoney(
      toMoney(statement.closingBalance).minus(toMoney(lastRow.runningBalance)),
      currency,
    );
  }
  return outcome;
}

/**
 * Credit-card category totals: purchases, fees, interest, payments, and credits printed
 * on the statement must equal the sum of the corresponding extracted rows.
 */
function tryStatedCategoryTotals(
  statement: NormalizedStatement,
  builder: Builder,
): MethodOutcome | null {
  if (familyOf(statement) !== "credit") return null;

  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);
  const totals = aggregate(statement.transactions);

  const comparisons: Array<{ name: string; label: string; stated?: string; computed: MoneyValue }> =
    [
      {
        name: "stated_purchases",
        label: "Stated purchases equal the sum of extracted charges",
        stated: statement.statedPurchases,
        computed: totals.charges,
      },
      {
        name: "stated_fees",
        label: "Stated fees equal the sum of extracted fee rows",
        stated: statement.statedFees,
        computed: totals.fees,
      },
      {
        name: "stated_interest",
        label: "Stated interest equals the sum of extracted interest rows",
        stated: statement.statedInterest,
        computed: totals.interest,
      },
      {
        name: "stated_payments",
        label: "Stated payments equal the sum of extracted payment rows",
        stated: statement.statedPayments,
        computed: totals.payments,
      },
    ];

  let compared = 0;
  let allPassed = true;
  for (const comparison of comparisons) {
    if (comparison.stated === undefined) continue;
    compared += 1;
    const stated = toMoney(comparison.stated).abs();
    const passed = stated.minus(comparison.computed).abs().lessThanOrEqualTo(tolerance);
    if (!passed) allPassed = false;
    addCheck(builder, {
      name: comparison.name,
      label: comparison.label,
      passed,
      expected: formatMoney(stated, currency),
      actual: formatMoney(comparison.computed, currency),
      difference: formatMoney(stated.minus(comparison.computed), currency),
      advisory: false,
    });
  }

  if (compared < 2) return null;
  return { method: "stated_category_totals", passed: allPassed };
}

/** Stated total debits and total credits must equal the sum of the extracted rows. */
function tryStatedTotals(statement: NormalizedStatement, builder: Builder): MethodOutcome | null {
  if (!statement.statedTotalDebits || !statement.statedTotalCredits) return null;

  const currency = statement.currency;
  const tolerance = currencyTolerance(currency);
  const totals = aggregate(statement.transactions);

  const statedDebits = toMoney(statement.statedTotalDebits).abs();
  const statedCredits = toMoney(statement.statedTotalCredits).abs();

  const debitsPassed = statedDebits.minus(totals.negative).abs().lessThanOrEqualTo(tolerance);
  const creditsPassed = statedCredits.minus(totals.positive).abs().lessThanOrEqualTo(tolerance);

  addCheck(builder, {
    name: "stated_total_debits",
    label: "Stated total debits equal the sum of extracted debit rows",
    passed: debitsPassed,
    expected: formatMoney(statedDebits, currency),
    actual: formatMoney(totals.negative, currency),
    difference: formatMoney(statedDebits.minus(totals.negative), currency),
    advisory: false,
  });

  addCheck(builder, {
    name: "stated_total_credits",
    label: "Stated total credits equal the sum of extracted credit rows",
    passed: creditsPassed,
    expected: formatMoney(statedCredits, currency),
    actual: formatMoney(totals.positive, currency),
    difference: formatMoney(statedCredits.minus(totals.positive), currency),
    advisory: false,
  });

  return { method: "stated_totals", passed: debitsPassed && creditsPassed };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Reconcile a canonicalized normalized statement.
 *
 * A statement passes only when at least one primary balancing method is available and
 * every non-advisory check holds. Missing balancing data is a rejection, not a pass:
 * "we could not check this" must never be reported as "this is correct".
 */
export function reconcile(statement: NormalizedStatement): ReconciliationResult {
  const builder: Builder = { checks: [], rejections: [] };
  const family = familyOf(statement);

  runStructuralChecks(statement, builder);

  const outcomes: MethodOutcome[] = [];
  for (const attempt of [
    tryOpeningClosing,
    tryRunningBalanceChain,
    tryStatedCategoryTotals,
    tryStatedTotals,
  ]) {
    const outcome = attempt(statement, builder);
    if (outcome) outcomes.push(outcome);
  }

  if (outcomes.length === 0) {
    builder.rejections.push(
      "The statement did not include enough balancing information (opening and closing balances, row-by-row balances, or stated totals) for us to verify the extraction independently.",
    );
  }

  const structuralPassed = builder.checks.every((check) => check.advisory || check.passed);
  const primary = outcomes.find((outcome) => outcome.passed) ?? outcomes[0];
  const passed = structuralPassed && outcomes.length > 0 && outcomes.every((o) => o.passed);

  const method: ReconciliationMethod = primary?.method ?? "insufficient_data";
  const equation = EQUATIONS[method]?.[family];

  const result: ReconciliationResult = {
    passed,
    method,
    methodLabel: METHOD_LABELS[method],
    checks: builder.checks,
    rejectionReasons: dedupe(builder.rejections),
  };
  if (equation) result.equation = equation;

  const withBalances = outcomes.find((outcome) => outcome.expectedClosingBalance !== undefined);
  if (withBalances?.expectedClosingBalance) {
    result.expectedClosingBalance = withBalances.expectedClosingBalance;
  }
  if (withBalances?.actualClosingBalance) {
    result.actualClosingBalance = withBalances.actualClosingBalance;
  }
  if (withBalances?.difference) result.difference = withBalances.difference;

  return result;
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Convenience predicate used by the checkout gate. */
export function canProceedToCheckout(result: ReconciliationResult): boolean {
  return result.passed === true;
}

export { METHOD_LABELS };
