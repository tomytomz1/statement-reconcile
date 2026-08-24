import { type DateContext, normalizeDate } from "@/lib/dates/normalize";
import { type MoneyValue, formatMoney, toMoney } from "@/lib/money/decimal";
import { parseMoneyToken } from "@/lib/money/parse";
import {
  passedVerification,
  tracedFields,
  transactionId,
  withStatementDefaults,
} from "@/lib/schema/build";
import { EXTRACTOR_VERSION_PROVIDER } from "@/lib/schema/provenance";
import {
  type CategoryHint,
  type NormalizedStatement,
  type NormalizedStatementCandidate,
  type SourceRegion,
  type StatementType,
  type Transaction,
  categoryHintSchema,
  normalizedStatementSchema,
  statementTypeSchema,
} from "@/lib/schema/statement";

import { canonicalizeStatement, canonicalizeText } from "./canonicalize";
import { CATEGORY_PATTERNS } from "./deterministic/patterns";
import type { ExtractionErrorCode } from "./types";

/**
 * Local normalization of a parsing provider's candidate output.
 *
 * A provider proposes structured data. This layer is where that proposal stops being
 * trusted: every date is re-parsed, every amount is re-parsed as an exact decimal, every
 * sign is re-derived from the account type and the debit/credit columns, and every
 * description is sanitized. Fields the provider invented that we do not model are
 * discarded. Nothing the provider says about whether the statement balances is carried
 * forward — that is decided afterwards by the reconciliation engine.
 */

export type NormalizeContext = {
  /** Statement type detected deterministically from the document text. */
  detectedType: StatementType;
  /** Currency detected deterministically from the document text. */
  detectedCurrency: string;
  /** Period detected deterministically, used to resolve dates printed without a year. */
  period?: { start: string; end: string } | undefined;
  /** Number of pages in the source document, used to validate source page references. */
  pageCount: number;
};

export type NormalizeResult =
  | { ok: true; statement: NormalizedStatement }
  | { ok: false; code: ExtractionErrorCode; detail: string };

export function normalizeCandidate(
  candidate: NormalizedStatementCandidate,
  context: NormalizeContext,
): NormalizeResult {
  if ((candidate.accountCount ?? 1) > 1) {
    return { ok: false, code: "multiple_accounts", detail: "more than one account reported" };
  }
  if (candidate.transactions.length === 0) {
    return { ok: false, code: "no_transactions_found", detail: "no transactions returned" };
  }

  const currency = resolveCurrency(candidate.currency, context.detectedCurrency);
  const statementType = resolveStatementType(candidate.statementType, context.detectedType);

  const periodStart =
    normalizeOptionalDate(candidate.periodStart, { periodEnd: context.period?.end }) ??
    context.period?.start;
  const periodEnd =
    normalizeOptionalDate(candidate.periodEnd, { periodStart: context.period?.start }) ??
    context.period?.end;

  const dateContext: DateContext = {
    periodStart,
    periodEnd,
    // The provider is asked for ISO dates. Anything else is resolved month-first, which
    // matches the deterministic parser's documented fallback.
    order: "MDY",
  };

  const warnings: string[] = [];
  for (const note of candidate.notes ?? []) {
    const cleaned = canonicalizeText(note, 300);
    if (cleaned !== "") warnings.push(cleaned);
  }

  const transactions: Transaction[] = [];
  for (const [index, row] of candidate.transactions.entries()) {
    const normalized = normalizeTransaction(row, {
      statementType,
      currency,
      dateContext,
      pageCount: context.pageCount,
    });
    if (!normalized.ok) {
      return {
        ok: false,
        code: normalized.code,
        detail: `row ${index + 1}: ${normalized.detail}`,
      };
    }
    transactions.push(normalized.transaction);
  }

  const draft = withStatementDefaults({
    statementType,
    currency,
    transactions,
    extractionWarnings: warnings,
    extractorVersion: EXTRACTOR_VERSION_PROVIDER,
    extractionPath: "secondary_text",
  });
  if (periodStart) draft.periodStart = periodStart;
  if (periodEnd) draft.periodEnd = periodEnd;

  const amountFields = [
    ["openingBalance", candidate.openingBalance],
    ["closingBalance", candidate.closingBalance],
    ["statedTotalDebits", candidate.statedTotalDebits],
    ["statedTotalCredits", candidate.statedTotalCredits],
    ["statedPayments", candidate.statedPayments],
    ["statedPurchases", candidate.statedPurchases],
    ["statedFees", candidate.statedFees],
    ["statedInterest", candidate.statedInterest],
  ] as const;

  for (const [field, raw] of amountFields) {
    if (raw === null || raw === undefined || raw.trim() === "") continue;
    const parsed = parseMoneyToken(raw, { currency });
    if (!parsed) {
      return {
        ok: false,
        code: "provider_invalid_output",
        detail: `${field} is not a monetary amount`,
      };
    }
    draft[field] = formatMoney(parsed.value, currency);
  }

  const parsed = normalizedStatementSchema.safeParse(canonicalizeStatement(draft));
  if (!parsed.success) {
    return {
      ok: false,
      code: "provider_invalid_output",
      detail: "normalized statement failed schema validation",
    };
  }
  return { ok: true, statement: parsed.data };
}

type RowContext = {
  statementType: StatementType;
  currency: string;
  dateContext: DateContext;
  pageCount: number;
};

type RowResult =
  { ok: true; transaction: Transaction } | { ok: false; code: ExtractionErrorCode; detail: string };

function normalizeTransaction(
  row: NormalizedStatementCandidate["transactions"][number],
  context: RowContext,
): RowResult {
  const date = normalizeDate(row.date, context.dateContext);
  if (!date) {
    return { ok: false, code: "provider_invalid_output", detail: "unreadable or impossible date" };
  }

  const postedDate = normalizeOptionalDate(row.postedDate, context.dateContext);

  const description = canonicalizeText(row.description);
  const debit = parseUnsigned(row.debit, context.currency);
  const credit = parseUnsigned(row.credit, context.currency);

  if (debit && credit && !debit.isZero() && !credit.isZero()) {
    return {
      ok: false,
      code: "provider_invalid_output",
      detail: "both debit and credit columns are populated",
    };
  }

  const rawAmount = parseOptional(row.amount, context.currency);
  const isCredit = context.statementType === "credit_card";

  let amount: MoneyValue | null = null;
  if (debit && !debit.isZero()) {
    amount = isCredit ? debit : debit.negated();
  } else if (credit && !credit.isZero()) {
    amount = isCredit ? credit.negated() : credit;
  } else if (rawAmount) {
    amount = rawAmount;
  }

  if (!amount) {
    return { ok: false, code: "provider_invalid_output", detail: "no usable amount" };
  }

  // When both a signed amount and a column value are present they must agree, otherwise
  // the direction of the row is ambiguous.
  if (rawAmount && (debit ?? credit)) {
    if (!rawAmount.abs().minus(amount.abs()).isZero()) {
      return {
        ok: false,
        code: "provider_invalid_output",
        detail: "signed amount disagrees with the debit/credit column",
      };
    }
  }

  const page =
    row.sourcePage !== null &&
    row.sourcePage !== undefined &&
    row.sourcePage >= 1 &&
    row.sourcePage <= context.pageCount
      ? row.sourcePage
      : undefined;
  const region: SourceRegion | undefined = page
    ? {
        page,
        textItemIds: [...(row.sourceTextItemIds ?? [])],
        rawText: row.rawSourceText ?? description,
        extractionPath: "secondary_text",
      }
    : undefined;

  const base = {
    date,
    description: description === "" ? "(no description)" : description,
    amount: formatMoney(amount, context.currency),
    categoryHint: resolveCategory(row.categoryHint, description, amount, context.statementType),
    ...(postedDate ? { postedDate } : {}),
    ...(debit && !debit.isZero() ? { debit: formatMoney(debit, context.currency) } : {}),
    ...(credit && !credit.isZero() ? { credit: formatMoney(credit, context.currency) } : {}),
  };

  const runningBalance = parseOptional(row.runningBalance, context.currency);

  const transaction: Transaction = {
    id: transactionId(0, date, base.amount),
    ...base,
    sourceRegions: region ? [region] : [],
    fieldProvenance: region
      ? tracedFields(
          {
            ...base,
            ...(runningBalance
              ? { runningBalance: formatMoney(runningBalance, context.currency) }
              : {}),
          },
          region,
        )
      : [],
    rawSourceText: row.rawSourceText ?? description,
    extractorVersion: EXTRACTOR_VERSION_PROVIDER,
    verification: passedVerification(region ? ["source_mapped"] : []),
  };
  if (page) transaction.sourcePage = page;
  if (runningBalance) transaction.runningBalance = formatMoney(runningBalance, context.currency);

  return { ok: true, transaction };
}

function parseOptional(value: string | null | undefined, currency: string): MoneyValue | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const parsed = parseMoneyToken(value, { currency });
  return parsed ? toMoney(parsed.canonical) : null;
}

function parseUnsigned(value: string | null | undefined, currency: string): MoneyValue | null {
  const parsed = parseOptional(value, currency);
  return parsed ? parsed.abs() : null;
}

function normalizeOptionalDate(
  value: string | null | undefined,
  context: DateContext,
): string | undefined {
  if (value === null || value === undefined || value.trim() === "") return undefined;
  return normalizeDate(value, context) ?? undefined;
}

function resolveCurrency(candidate: string | null | undefined, fallback: string): string {
  const trimmed = candidate?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return fallback.toUpperCase();
}

function resolveStatementType(
  candidate: string | null | undefined,
  fallback: StatementType,
): StatementType {
  const parsed = statementTypeSchema.safeParse(candidate?.trim().toLowerCase());
  if (parsed.success && parsed.data !== "unknown") return parsed.data;
  return fallback;
}

/**
 * The category hint is re-derived locally. A provider claim is only accepted when it is
 * one of our enum values and is consistent with the sign of the amount, because the
 * category totals feed a reconciliation check.
 */
function resolveCategory(
  candidate: string | null | undefined,
  description: string,
  amount: MoneyValue,
  statementType: StatementType,
): CategoryHint {
  for (const { hint, pattern } of CATEGORY_PATTERNS) {
    if (!pattern.test(description)) continue;
    if (statementType === "credit_card") return hint;
    if (hint === "fee" || hint === "interest") return hint;
  }

  const claimed = categoryHintSchema.safeParse(candidate?.trim().toLowerCase());
  if (claimed.success && isConsistent(claimed.data, amount, statementType)) return claimed.data;

  if (statementType === "credit_card") return amount.isNegative() ? "payment" : "charge";
  return amount.isNegative() ? "debit" : "credit";
}

function isConsistent(
  hint: CategoryHint,
  amount: MoneyValue,
  statementType: StatementType,
): boolean {
  const negative = amount.isNegative();
  if (statementType === "credit_card") {
    if (hint === "payment" || hint === "credit") return negative;
    if (hint === "charge" || hint === "fee" || hint === "interest") return !negative;
    return true;
  }
  if (hint === "debit") return negative;
  if (hint === "credit") return !negative;
  return true;
}
