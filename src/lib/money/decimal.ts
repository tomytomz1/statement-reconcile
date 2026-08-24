import { Decimal } from "decimal.js";

/**
 * Decimal arithmetic for every monetary value in the product.
 *
 * JavaScript floating point is never used for reconciliation. A single configured
 * Decimal constructor is exported so precision and rounding are identical everywhere,
 * including in the browser preview and in the server-side export.
 */
export const Money = Decimal.clone({
  precision: 34,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

export type MoneyValue = InstanceType<typeof Money>;

/** Minor-unit scale per ISO 4217 currency. Anything unlisted uses two decimals. */
const CURRENCY_SCALE: Record<string, number> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
};

export const DEFAULT_CURRENCY_SCALE = 2;

export function currencyScale(currency: string | undefined): number {
  if (!currency) return DEFAULT_CURRENCY_SCALE;
  return CURRENCY_SCALE[currency.toUpperCase()] ?? DEFAULT_CURRENCY_SCALE;
}

/**
 * Smallest difference we accept when comparing two monetary totals.
 * One minor unit of the currency: $0.01 for two-decimal currencies, ¥1 for JPY.
 */
export function currencyTolerance(currency: string | undefined): MoneyValue {
  const scale = currencyScale(currency);
  return new Money(1).div(new Money(10).pow(scale));
}

export function toMoney(value: string | number | MoneyValue): MoneyValue {
  if (value instanceof Money) return value;
  return new Money(value);
}

/**
 * Canonical string form of a monetary amount: fixed to the currency scale, with a
 * leading `-` for negatives and never `-0.00`.
 */
export function formatMoney(value: string | number | MoneyValue, currency?: string): string {
  const scale = currencyScale(currency);
  const decimal = toMoney(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_EVEN);
  const fixed = decimal.toFixed(scale);
  return fixed === negativeZero(scale) ? zero(scale) : fixed;
}

function negativeZero(scale: number): string {
  return `-${zero(scale)}`;
}

function zero(scale: number): string {
  return scale === 0 ? "0" : `0.${"0".repeat(scale)}`;
}

export function sumMoney(values: Array<string | number | MoneyValue>): MoneyValue {
  return values.reduce<MoneyValue>((total, value) => total.plus(toMoney(value)), new Money(0));
}

export function absMoney(value: string | number | MoneyValue): MoneyValue {
  return toMoney(value).abs();
}

export function negateMoney(value: string | number | MoneyValue): MoneyValue {
  return toMoney(value).negated();
}

/** True when |a - b| is within one minor unit of the currency (inclusive). */
export function withinTolerance(
  a: string | number | MoneyValue,
  b: string | number | MoneyValue,
  currency?: string,
  toleranceOverride?: MoneyValue,
): boolean {
  const tolerance = toleranceOverride ?? currencyTolerance(currency);
  return toMoney(a).minus(toMoney(b)).abs().lessThanOrEqualTo(tolerance);
}

export function differenceMoney(
  a: string | number | MoneyValue,
  b: string | number | MoneyValue,
): MoneyValue {
  return toMoney(a).minus(toMoney(b));
}

/** Human-readable presentation for the UI. Never used for arithmetic. */
export function displayMoney(value: string | number | MoneyValue, currency = "USD"): string {
  const scale = currencyScale(currency);
  const decimal = toMoney(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_EVEN);
  const negative = decimal.isNegative() && !decimal.isZero();
  const digits = decimal.abs().toFixed(scale);
  const [whole = "0", fraction] = digits.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = fraction ? `${grouped}.${fraction}` : grouped;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  const prefix = symbol ?? `${currency.toUpperCase()} `;
  return `${negative ? "-" : ""}${prefix}${body}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CHF: "CHF ",
  INR: "₹",
  ZAR: "R",
  SGD: "S$",
  HKD: "HK$",
  MXN: "MX$",
  BRL: "R$",
};
