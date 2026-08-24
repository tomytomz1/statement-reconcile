/**
 * Date normalization for statement rows.
 *
 * Statements print dates in many shapes and frequently omit the year. The goal is a
 * strict ISO `YYYY-MM-DD` string or `null`. Guessing is not allowed: an ambiguous
 * numeric date without a period hint is rejected so the caller can fail closed.
 */

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  febr: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export type DateOrder = "MDY" | "DMY" | "YMD" | "unknown";

export type DateContext = {
  /** ISO date bounding the start of the statement period, when known. */
  periodStart?: string | undefined;
  /** ISO date bounding the end of the statement period, when known. */
  periodEnd?: string | undefined;
  /** Day/month order inferred for the document as a whole. */
  order?: DateOrder | undefined;
};

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return isRealDate(y, m, d);
}

export function isRealDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Normalize a printed date to ISO. Returns `null` when the value cannot be resolved
 * without guessing.
 */
export function normalizeDate(raw: string, context: DateContext = {}): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .replace(/[\u00A0\u2007\u2008\u2009\u202F]/g, " ")
    .replace(/[.,]/g, (match, offset: number, full: string) => {
      // Keep dots that act as separators (12.03.2024) but drop trailing punctuation.
      const next = full[offset + 1];
      return next && /\d/.test(next) ? match : " ";
    })
    .trim();
  if (text === "" || text.length > 32) return null;

  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (isoMatch) {
    const [, y, m, d] = isoMatch as unknown as [string, string, string, string];
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    return isRealDate(year, month, day) ? iso(year, month, day) : null;
  }

  const named = parseNamedMonth(text, context);
  if (named) return named;

  const numeric = /^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2}|\d{4}))?$/.exec(text);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const yearToken = numeric[3];
    const year = yearToken ? expandYear(Number(yearToken), context) : inferYear(context);
    if (year === null) return null;
    return resolveDayMonth(a, b, year, context);
  }

  // Bare day-of-month with a named month elsewhere is handled by parseNamedMonth.
  return null;
}

function parseNamedMonth(text: string, context: DateContext): string | null {
  const normalized = text.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1");

  // 12 Mar 2024 / 12 Mar
  const dayFirst = /^(\d{1,2})\s+([a-z]{3,9})(?:\s+(\d{2}|\d{4}))?$/.exec(normalized);
  if (dayFirst) {
    const month = MONTH_NAMES[dayFirst[2] ?? ""];
    if (month === undefined) return null;
    const day = Number(dayFirst[1]);
    const yearToken = dayFirst[3];
    const year = yearToken
      ? expandYear(Number(yearToken), context)
      : inferYearForMonth(month, context);
    if (year === null) return null;
    return isRealDate(year, month, day) ? iso(year, month, day) : null;
  }

  // Mar 12 2024 / Mar 12
  const monthFirst = /^([a-z]{3,9})\s+(\d{1,2})(?:\s+(\d{2}|\d{4}))?$/.exec(normalized);
  if (monthFirst) {
    const month = MONTH_NAMES[monthFirst[1] ?? ""];
    if (month === undefined) return null;
    const day = Number(monthFirst[2]);
    const yearToken = monthFirst[3];
    const year = yearToken
      ? expandYear(Number(yearToken), context)
      : inferYearForMonth(month, context);
    if (year === null) return null;
    return isRealDate(year, month, day) ? iso(year, month, day) : null;
  }

  return null;
}

function expandYear(value: number, context: DateContext): number | null {
  if (value >= 1900) return value <= 2200 ? value : null;
  if (value < 0 || value > 99) return null;
  // Two-digit years: anchor to the statement period when available, otherwise 2000s.
  const anchor = context.periodEnd ?? context.periodStart;
  const century = anchor ? Math.floor(Number(anchor.slice(0, 4)) / 100) * 100 : 2000;
  const candidate = century + value;
  if (anchor) {
    const anchorYear = Number(anchor.slice(0, 4));
    for (const option of [candidate, candidate - 100, candidate + 100]) {
      if (Math.abs(option - anchorYear) <= 1) return option;
    }
  }
  return candidate >= 1900 && candidate <= 2200 ? candidate : null;
}

/**
 * A statement row without a year belongs to the statement period. When the period is
 * unknown we refuse rather than assume the current year.
 */
function inferYear(context: DateContext): number | null {
  const anchor = context.periodEnd ?? context.periodStart;
  if (!anchor) return null;
  return Number(anchor.slice(0, 4));
}

/**
 * A statement period can straddle a year boundary (Dec 20 – Jan 19). Pick the year in
 * the period whose month matches.
 */
function inferYearForMonth(month: number, context: DateContext): number | null {
  const { periodStart, periodEnd } = context;
  if (periodStart && periodEnd) {
    const startYear = Number(periodStart.slice(0, 4));
    const endYear = Number(periodEnd.slice(0, 4));
    const startMonth = Number(periodStart.slice(5, 7));
    const endMonth = Number(periodEnd.slice(5, 7));
    if (startYear === endYear) return startYear;
    if (month >= startMonth) return startYear;
    if (month <= endMonth) return endYear;
    return null;
  }
  return inferYear(context);
}

/**
 * Decide which of two numbers is the day and which is the month.
 *
 * If one value is greater than 12 the answer is unambiguous. Otherwise we use the
 * document-level order hint. Without a hint the value is rejected.
 */
function resolveDayMonth(a: number, b: number, year: number, context: DateContext): string | null {
  const aIsMonth = a >= 1 && a <= 12;
  const bIsMonth = b >= 1 && b <= 12;

  if (aIsMonth && !bIsMonth) return isRealDate(year, a, b) ? iso(year, a, b) : null;
  if (!aIsMonth && bIsMonth) return isRealDate(year, b, a) ? iso(year, b, a) : null;
  if (!aIsMonth && !bIsMonth) return null;

  const order = context.order ?? "unknown";
  if (order === "MDY") return isRealDate(year, a, b) ? iso(year, a, b) : null;
  if (order === "DMY") return isRealDate(year, b, a) ? iso(year, b, a) : null;
  return null;
}

/**
 * Infer the document's day/month order by looking for at least one date where the
 * position of a value above 12 disambiguates it. Returns `unknown` when every date is
 * ambiguous, which forces the caller to fail closed.
 */
export function inferDateOrder(rawDates: readonly string[]): DateOrder {
  let mdyEvidence = 0;
  let dmyEvidence = 0;
  let ymdEvidence = 0;

  for (const raw of rawDates) {
    const text = raw.trim();
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(text)) {
      ymdEvidence += 1;
      continue;
    }
    const numeric = /^(\d{1,2})[-/.](\d{1,2})(?:[-/.](?:\d{2}|\d{4}))?$/.exec(text);
    if (!numeric) continue;
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    if (a > 12 && b <= 12) dmyEvidence += 1;
    else if (b > 12 && a <= 12) mdyEvidence += 1;
  }

  if (ymdEvidence > 0 && mdyEvidence === 0 && dmyEvidence === 0) return "YMD";
  if (mdyEvidence > dmyEvidence) return "MDY";
  if (dmyEvidence > mdyEvidence) return "DMY";
  return "unknown";
}

/** Extract a statement period such as "March 1, 2024 - March 31, 2024" from free text. */
export function findPeriod(text: string): { start: string; end: string } | null {
  const separators = ["through", "thru", "to", "–", "—", "-"];
  const cleaned = text.replace(/\s+/g, " ").trim();

  for (const separator of separators) {
    const pattern = new RegExp(
      `([A-Za-z]{3,9}\\.?\\s+\\d{1,2},?\\s*\\d{2,4}|\\d{1,4}[-/.]\\d{1,2}[-/.]\\d{2,4})\\s*${escapeRegExp(
        separator,
      )}\\s*([A-Za-z]{3,9}\\.?\\s+\\d{1,2},?\\s*\\d{2,4}|\\d{1,4}[-/.]\\d{1,2}[-/.]\\d{2,4})`,
      "i",
    );
    const match = pattern.exec(cleaned);
    if (!match?.[1] || !match[2]) continue;
    const order = inferDateOrder([match[1], match[2]]);
    const start = normalizeDate(match[1], { order });
    const end = normalizeDate(match[2], { order });
    if (start && end && start <= end) return { start, end };
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isWithinPeriod(date: string, context: DateContext, slackDays = 5): boolean {
  const { periodStart, periodEnd } = context;
  if (!periodStart && !periodEnd) return true;
  const value = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(value)) return false;
  const slack = slackDays * 86_400_000;
  if (periodStart && value < Date.parse(`${periodStart}T00:00:00Z`) - slack) return false;
  if (periodEnd && value > Date.parse(`${periodEnd}T00:00:00Z`) + slack) return false;
  return true;
}
