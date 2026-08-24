/**
 * Label vocabulary observed on US and international statements.
 *
 * These are matching patterns, not claims of support: a layout only counts as supported
 * once the reconciliation engine independently balances it.
 */

export type LabelledField =
  | "openingBalance"
  | "closingBalance"
  | "statedTotalDebits"
  | "statedTotalCredits"
  | "statedPayments"
  | "statedPurchases"
  | "statedFees"
  | "statedInterest";

type LabelRule = {
  field: LabelledField;
  /** Anchored at the start of the label text so a description cannot masquerade as a label. */
  pattern: RegExp;
  /** Higher specificity wins when two labels match the same line. */
  specificity: number;
};

export const LABEL_RULES: readonly LabelRule[] = [
  // Opening / previous balance
  { field: "openingBalance", pattern: /^previous\s+(statement\s+)?balance\b/i, specificity: 9 },
  {
    field: "openingBalance",
    pattern: /^(beginning|opening|starting)\s+balance\b/i,
    specificity: 9,
  },
  { field: "openingBalance", pattern: /^balance\s+(forward|brought\s+forward)\b/i, specificity: 8 },
  { field: "openingBalance", pattern: /^balance\s+on\s+\S+/i, specificity: 5 },
  { field: "openingBalance", pattern: /^prior\s+balance\b/i, specificity: 8 },

  // Closing / new balance
  { field: "closingBalance", pattern: /^(ending|closing|final)\s+balance\b/i, specificity: 9 },
  { field: "closingBalance", pattern: /^new\s+balance(\s+total)?\b/i, specificity: 9 },
  { field: "closingBalance", pattern: /^statement\s+balance\b/i, specificity: 7 },
  { field: "closingBalance", pattern: /^balance\s+as\s+of\b/i, specificity: 6 },

  // Debits out of an asset account
  { field: "statedTotalDebits", pattern: /^total\s+(withdrawals|debits)\b/i, specificity: 9 },
  {
    field: "statedTotalDebits",
    pattern: /^total\s+(checks\s+and\s+)?(withdrawals|debits)(\s+and\s+\w+)?\b/i,
    specificity: 8,
  },
  {
    field: "statedTotalDebits",
    pattern: /^(withdrawals|debits)\s+and\s+(other\s+)?(debits|subtractions|withdrawals)\b/i,
    specificity: 7,
  },
  { field: "statedTotalDebits", pattern: /^total\s+subtractions\b/i, specificity: 8 },

  // Credits into an asset account
  { field: "statedTotalCredits", pattern: /^total\s+(deposits|credits)\b/i, specificity: 9 },
  {
    field: "statedTotalCredits",
    pattern: /^total\s+deposits\s+and\s+(additions|credits|other\s+credits)\b/i,
    specificity: 9,
  },
  {
    field: "statedTotalCredits",
    pattern: /^(deposits|credits)\s+and\s+(other\s+)?(credits|additions)\b/i,
    specificity: 7,
  },
  { field: "statedTotalCredits", pattern: /^total\s+additions\b/i, specificity: 8 },

  // Credit-card categories
  {
    field: "statedPayments",
    pattern: /^(total\s+)?payments(\s+and\s+credits)?\b/i,
    specificity: 8,
  },
  {
    field: "statedPayments",
    pattern: /^payments,\s*credits\s+and\s+adjustments\b/i,
    specificity: 9,
  },
  {
    field: "statedPurchases",
    pattern: /^(total\s+)?purchases(\s+and\s+(adjustments|other\s+debits))?\b/i,
    specificity: 8,
  },
  { field: "statedPurchases", pattern: /^purchases\s+and\s+cash\s+advances\b/i, specificity: 9 },
  { field: "statedFees", pattern: /^(total\s+)?fees(\s+charged)?\b/i, specificity: 8 },
  { field: "statedInterest", pattern: /^(total\s+)?interest(\s+charged)?\b/i, specificity: 8 },
  { field: "statedInterest", pattern: /^(total\s+)?finance\s+charges?\b/i, specificity: 8 },
];

export const CREDIT_CARD_SIGNALS: readonly RegExp[] = [
  /\bcredit\s+card\s+statement\b/i,
  /\bminimum\s+payment\s+(due|amount)\b/i,
  /\bpayment\s+due\s+date\b/i,
  /\bnew\s+balance\b/i,
  /\bprevious\s+balance\b/i,
  /\bannual\s+percentage\s+rate\b/i,
  /\bcredit\s+limit\b/i,
  /\bavailable\s+credit\b/i,
  /\bcash\s+advance\b/i,
  /\bpurchases\s+and\s+adjustments\b/i,
  /\bfinance\s+charge\b/i,
];

export const SAVINGS_SIGNALS: readonly RegExp[] = [
  /\bsavings\s+(account|statement)\b/i,
  /\bmoney\s+market\s+(account|savings)\b/i,
  /\binterest\s+earned\b/i,
  /\bannual\s+percentage\s+yield\b/i,
];

export const CHECKING_SIGNALS: readonly RegExp[] = [
  /\bchecking\s+(account|statement)\b/i,
  /\bdeposits\s+and\s+(other\s+)?(additions|credits)\b/i,
  /\bwithdrawals\s+and\s+(other\s+)?(subtractions|debits)\b/i,
  /\bchecks\s+paid\b/i,
  /\bcurrent\s+account\b/i,
  /\bdebit\s+card\s+purchases\b/i,
];

/** Header cells that identify an amount column. */
export const COLUMN_HEADERS: ReadonlyArray<{
  kind: "date" | "postedDate" | "description" | "debit" | "credit" | "amount" | "balance" | "check";
  pattern: RegExp;
}> = [
  { kind: "postedDate", pattern: /^(post(ing|ed)?(\s+date)?|trans(action)?\s+post)\b/i },
  { kind: "date", pattern: /^(date|trans(action)?\s*date|value\s+date|eff(ective)?\s+date)\b/i },
  {
    kind: "description",
    pattern: /^(description|details|transaction|narrative|particulars|merchant|activity|payee)\b/i,
  },
  {
    kind: "debit",
    pattern:
      /^(debits?|withdrawals?|payments?\s+out|money\s+out|charges?|purchases?|withdrawals?\s*\/\s*debits?)\b/i,
  },
  {
    kind: "credit",
    pattern:
      /^(credits?|deposits?|payments?\s+in|money\s+in|additions?|deposits?\s*\/\s*credits?|payments?\s+and\s+credits?)\b/i,
  },
  { kind: "amount", pattern: /^(amount|value|transaction\s+amount|amt)\b/i },
  { kind: "balance", pattern: /^(balance|running\s+balance|closing\s+balance|bal)\b/i },
  { kind: "check", pattern: /^(check|cheque|ref(erence)?|serial)(\s*(no|number|#))?\b/i },
];

/** Descriptions that indicate a specific credit-card category. */
export const CATEGORY_PATTERNS: ReadonlyArray<{
  hint: "payment" | "fee" | "interest" | "credit";
  pattern: RegExp;
}> = [
  {
    hint: "interest",
    pattern: /\b(interest\s+charge[ds]?|finance\s+charge|purchase\s+interest|interest\s+earned)\b/i,
  },
  {
    hint: "fee",
    pattern:
      /\b(annual\s+(membership\s+)?fee|late\s+fee|late\s+charge|over\s?limit\s+fee|returned\s+payment\s+fee|foreign\s+transaction\s+fee|cash\s+advance\s+fee|balance\s+transfer\s+fee|monthly\s+(service|maintenance)\s+fee|service\s+charge|overdraft\s+fee|nsf\s+fee|wire\s+fee|atm\s+fee)\b/i,
  },
  {
    hint: "payment",
    pattern:
      /\b(payment\s+(received|thank\s+you|-\s*thank\s+you)|autopay|auto\s?pay|electronic\s+payment|online\s+payment|ach\s+pmt|direct\s+debit\s+payment|mobile\s+payment)\b/i,
  },
  {
    hint: "credit",
    pattern:
      /\b(refund|return|credit\s+adjustment|reversal|chargeback|statement\s+credit|cashback\s+(credit|bonus)|rewards?\s+credit)\b/i,
  },
];

/** Lines that are page furniture rather than transactions. */
export const NOISE_PATTERNS: readonly RegExp[] = [
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^continued(\s+on\s+next\s+page)?\.?$/i,
  /^\(?continued\)?$/i,
  /^statement\s+period\b/i,
  /^member\s+fdic\b/i,
  /^customer\s+service\b/i,
  /^www\.\S+$/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^total\b/i,
  /^subtotal\b/i,
  /^balance\s+forward$/i,
];

/**
 * Masked or partial account identifiers, used to detect multi-account documents.
 *
 * The label qualifier ("number", "no", "#", "ending in") is required. Without it, a
 * transaction description such as "ACCOUNT 4111 1111 1111 1111 VERIFY" — exactly the kind
 * of string an attacker can put in a statement — would look like a second account and
 * force a false rejection.
 */
export const ACCOUNT_NUMBER_PATTERN =
  /\b(?:account|acct|a\/c)\s*(?:number|no\.?|#|ending\s+in)\s*:?\s*((?:x|\*|\u2022|\.){2,}\s?\d{2,6}|\d{3,6}(?:\s?[-\u2022]\s?\d{2,6})?)/gi;

export const CURRENCY_HINTS: ReadonlyArray<{ code: string; pattern: RegExp }> = [
  { code: "USD", pattern: /\b(USD|US\s?\$|U\.S\.\s?dollars?)\b/i },
  { code: "CAD", pattern: /\b(CAD|CDN\s?\$|canadian\s+dollars?)\b/i },
  { code: "GBP", pattern: /\b(GBP|pounds?\s+sterling)\b|£/i },
  { code: "EUR", pattern: /\b(EUR|euros?)\b|€/i },
  { code: "AUD", pattern: /\b(AUD|australian\s+dollars?)\b/i },
  { code: "NZD", pattern: /\b(NZD|new\s+zealand\s+dollars?)\b/i },
  { code: "JPY", pattern: /\b(JPY|japanese\s+yen)\b|¥/i },
  { code: "CHF", pattern: /\b(CHF|swiss\s+francs?)\b/i },
  { code: "INR", pattern: /\b(INR|indian\s+rupees?)\b|₹/i },
  { code: "SGD", pattern: /\b(SGD|singapore\s+dollars?)\b/i },
  { code: "ZAR", pattern: /\b(ZAR|south\s+african\s+rand)\b/i },
];
