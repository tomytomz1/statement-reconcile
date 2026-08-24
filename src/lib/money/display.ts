import { currencyScale } from "./decimal";

/**
 * Presentation formatting for money and dates.
 *
 * Kept separate from `decimal.ts` on purpose: that module is arithmetic and must stay
 * exact, this one is display and is allowed to be lossy. Nothing here ever feeds back into
 * a calculation, and the canonical decimal string is always what gets exported.
 */

const formatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: string, currency: string, locale = "en-US"): string {
  const scale = currencyScale(currency);
  const key = `${locale}|${currency}|${scale}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: scale,
        maximumFractionDigits: scale,
      });
    } catch {
      // An unrecognized currency code should degrade to "CODE 1,234.56" rather than throw
      // and take the preview down with it.
      formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: scale,
        maximumFractionDigits: scale,
      });
    }
    formatters.set(key, formatter);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  const formatted = formatter.format(numeric);
  return formatter.resolvedOptions().style === "currency" ? formatted : `${currency} ${formatted}`;
}

/** Signed display, used where the direction of a movement is the point. */
export function formatSigned(value: string, currency: string, locale = "en-US"): string {
  const formatted = formatCurrency(
    value.startsWith("-") ? value.slice(1) : value,
    currency,
    locale,
  );
  return value.startsWith("-") ? `−${formatted}` : formatted;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** ISO date to a readable date. Parsed as UTC so it never shifts by a day. */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMATTER.format(date);
}

export function formatPeriod(start: string | undefined, end: string | undefined): string {
  if (start && end) return `${formatIsoDate(start)} – ${formatIsoDate(end)}`;
  if (end) return `to ${formatIsoDate(end)}`;
  if (start) return `from ${formatIsoDate(start)}`;
  return "Not stated on the statement";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
