import { Money, type MoneyValue, formatMoney } from "./decimal";

/**
 * Parsing of monetary tokens as they appear on real statements.
 *
 * Statement text is untrusted. Anything that is not unambiguously a monetary amount
 * must return `null` so the caller can fail closed rather than guess.
 */

export type ParsedMoney = {
  value: MoneyValue;
  /** Canonical signed decimal string at two decimals, or the currency scale supplied. */
  canonical: string;
  /** True when the source token carried an explicit negative marker. */
  explicitlyNegative: boolean;
  /** True when the negative marker was a trailing `CR`/`DR` style suffix. */
  suffixMarker: "CR" | "DR" | null;
  /** Currency symbol or code observed on the token, if any. */
  currencyHint?: string;
};

const CURRENCY_TOKEN =
  /(?:^|\s)(USD|EUR|GBP|CAD|AUD|NZD|JPY|CHF|SEK|NOK|DKK|INR|ZAR|SGD|HKD|MXN|BRL|PLN|CZK|HUF|ILS|AED|SAR|TRY)(?:$|\s)/i;

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "₪": "ILS",
  "₺": "TRY",
  "₽": "RUB",
  R$: "BRL",
};

/** Characters that look like a minus sign but are not U+002D. */
const UNICODE_MINUS = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;

/** Whitespace variants, including non-breaking and narrow no-break spaces. */
const UNICODE_SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\u2007\u2008\u2009]/g;

export type ParseMoneyOptions = {
  /** Currency used to pick the canonical scale. Defaults to two decimals. */
  currency?: string;
  /**
   * When true, a bare integer with no decimal separator and no currency marker is
   * rejected. Statement columns such as check numbers or dates otherwise parse as money.
   */
  requireDecimalOrSymbol?: boolean;
};

/**
 * Parse a single monetary token. Returns `null` when the token is not confidently money.
 *
 * Handles: `$1,234.56`, `1 234,56 €`, `(1,234.56)`, `1234.56-`, `1,234.56 CR`,
 * `-$0.99`, `USD 12.00`, unicode minus signs, and non-breaking spaces.
 */
export function parseMoneyToken(raw: string, options: ParseMoneyOptions = {}): ParsedMoney | null {
  if (typeof raw !== "string") return null;

  let text = raw.replace(UNICODE_SPACE, " ").replace(UNICODE_MINUS, "-").trim();
  if (text === "" || text.length > 40) return null;

  let currencyHint: string | undefined;
  const codeMatch = CURRENCY_TOKEN.exec(` ${text} `);
  if (codeMatch?.[1]) {
    currencyHint = codeMatch[1].toUpperCase();
    text = text.replace(new RegExp(codeMatch[1], "i"), "").trim();
  }

  let hadSymbol = false;
  for (const [symbol, code] of Object.entries(SYMBOL_TO_CURRENCY)) {
    if (text.includes(symbol)) {
      currencyHint ??= code;
      hadSymbol = true;
      text = text.split(symbol).join("").trim();
    }
  }

  let negative = false;

  // Parenthesised negatives: (1,234.56)
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  // Trailing accounting markers: 1,234.56 CR / 1,234.56DR
  let suffixMarker: "CR" | "DR" | null = null;
  const markerMatch = /^(.*?)[\s]*(CR|DR)\.?$/i.exec(text);
  if (markerMatch?.[1] !== undefined && markerMatch[2]) {
    suffixMarker = markerMatch[2].toUpperCase() as "CR" | "DR";
    text = markerMatch[1].trim();
  }

  // Leading or trailing sign.
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1).trim();
  } else if (text.startsWith("+")) {
    text = text.slice(1).trim();
  }
  if (text.endsWith("-")) {
    negative = true;
    text = text.slice(0, -1).trim();
  } else if (text.endsWith("+")) {
    text = text.slice(0, -1).trim();
  }

  if (text === "") return null;
  if (!/^[0-9.,' ]+$/.test(text)) return null;

  const digitsOnly = normalizeGrouping(text);
  if (digitsOnly === null) return null;
  if (!/^\d+(\.\d+)?$/.test(digitsOnly)) return null;

  const hasFraction = digitsOnly.includes(".");
  if (options.requireDecimalOrSymbol && !hasFraction && !hadSymbol && !currencyHint) {
    return null;
  }

  let value: MoneyValue;
  try {
    value = new Money(digitsOnly);
  } catch {
    return null;
  }
  if (!value.isFinite()) return null;
  if (negative) value = value.negated();

  const result: ParsedMoney = {
    value,
    canonical: formatMoney(value, options.currency ?? currencyHint),
    explicitlyNegative: negative,
    suffixMarker,
  };
  if (currencyHint) result.currencyHint = currencyHint;
  return result;
}

/**
 * Resolve thousands and decimal separators.
 *
 * A statement may use `1,234.56` (US), `1.234,56` (EU), `1 234,56` (FR), or `1'234.56`
 * (CH). The last separator that is followed by exactly one to three digits and appears
 * only once decides the decimal mark. Ambiguous tokens are rejected.
 */
function normalizeGrouping(text: string): string | null {
  const cleaned = text.replace(/[' ]/g, "");
  if (cleaned === "") return null;
  if (!/[.,]/.test(cleaned)) return cleaned;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (commaCount > 0 && dotCount > 0) {
    // Whichever separator comes last is the decimal mark; the other groups thousands.
    const decimalSep = lastComma > lastDot ? "," : ".";
    const groupSep = decimalSep === "," ? "." : ",";
    if ((decimalSep === "," ? commaCount : dotCount) !== 1) return null;
    const withoutGroups = cleaned.split(groupSep).join("");
    if (!isValidGrouping(cleaned, groupSep, decimalSep)) return null;
    return withoutGroups.replace(decimalSep, ".");
  }

  const sep = commaCount > 0 ? "," : ".";
  const count = commaCount > 0 ? commaCount : dotCount;
  const lastIndex = commaCount > 0 ? lastComma : lastDot;
  const trailingDigits = cleaned.length - lastIndex - 1;

  if (count === 1) {
    // A single separator with exactly three trailing digits is ambiguous (1,234 or 1.234).
    // Treat it as a thousands group only when the leading part looks like a group head,
    // so `0.123` is not silently turned into `123`.
    if (trailingDigits === 3) {
      const head = cleaned.slice(0, lastIndex);
      if (/^[1-9]\d{0,2}$/.test(head)) return cleaned.split(sep).join("");
      return cleaned.replace(sep, ".");
    }
    // No currency uses more than three minor-unit digits. Rounding a four-decimal value
    // into a two-decimal amount would silently discard information, so reject instead.
    if (trailingDigits >= 1 && trailingDigits <= MAX_FRACTION_DIGITS) {
      return cleaned.replace(sep, ".");
    }
    return null;
  }

  // Multiple identical separators must all be grouping separators.
  if (!isValidGrouping(cleaned, sep, null)) return null;
  return cleaned.split(sep).join("");
}

/** The largest minor-unit scale in ISO 4217 is three digits (BHD, KWD, OMR, TND). */
const MAX_FRACTION_DIGITS = 3;

function isValidGrouping(text: string, groupSep: string, decimalSep: string | null): boolean {
  const [integerPart = "", ...rest] = decimalSep ? text.split(decimalSep) : [text];
  if (decimalSep && rest.length > 1) return false;
  const fraction = decimalSep ? rest[0] : undefined;
  if (fraction !== undefined && !new RegExp(`^\\d{1,${MAX_FRACTION_DIGITS}}$`).test(fraction)) {
    return false;
  }

  const groups = integerPart.split(groupSep);
  if (groups.length === 1) return /^\d+$/.test(groups[0] ?? "");
  const [first, ...others] = groups;
  if (!first || !/^\d{1,3}$/.test(first)) return false;
  return others.every((group) => /^\d{3}$/.test(group));
}

/**
 * Find every monetary token in a line of statement text, in order, with positions.
 * Used by the deterministic parser to locate amount columns.
 */
export function findMoneyTokens(
  line: string,
  options: ParseMoneyOptions = {},
): Array<{ token: string; start: number; end: number; parsed: ParsedMoney }> {
  const results: Array<{ token: string; start: number; end: number; parsed: ParsedMoney }> = [];
  const pattern =
    /\(?[-+]?\s?(?:[$€£¥₹]|USD|EUR|GBP|CAD|AUD)?\s?\d{1,3}(?:[.,\u00A0' ]\d{3})*(?:[.,]\d{1,2})?\)?\s?(?:CR|DR)?-?/gi;

  for (const match of line.matchAll(pattern)) {
    const token = match[0].trim();
    if (token === "" || !/\d/.test(token)) continue;
    const parsed = parseMoneyToken(token, options);
    if (!parsed) continue;
    const start = match.index ?? 0;
    results.push({ token, start, end: start + match[0].length, parsed });
  }
  return results;
}
