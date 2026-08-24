/**
 * The complete list of analytics events, and the complete list of properties each one may
 * carry.
 *
 * This file is the privacy contract for measurement. The funnel needs to be measurable —
 * without it there is no way to tell whether the paywall is placed correctly — but nothing
 * derived from the statement may be measured. So the type system, not a code review,
 * decides what can be sent: an event's payload has to match one of these shapes, and none
 * of these shapes has a field for a description, an amount, a balance, a date from a
 * statement, a bank name, a filename, or an account identifier.
 *
 * Everything here is either a count, a duration bucket, an enum, or a boolean.
 */

export type StatementTypeProperty = "checking" | "savings" | "credit_card" | "unknown";

/** Page counts are bucketed so a value cannot become a fingerprint. */
export type PageBucket = "1" | "2-5" | "6-10" | "11-20" | "21-50";

export type RowBucket = "0" | "1-25" | "26-100" | "101-300" | "301-1000" | "1000+";

export type DurationBucket = "<1s" | "1-3s" | "3-10s" | "10-30s" | ">30s";

export type AnalyticsEventMap = {
  page_view: { path: string };
  campaign_landed: { source: string; medium: string; campaign: string; landingPath: string };
  file_selected: { pages: PageBucket; sizeMb: number };
  file_rejected: { code: string };
  extraction_started: { pages: PageBucket };
  extraction_succeeded: {
    pages: PageBucket;
    rows: RowBucket;
    statementType: StatementTypeProperty;
    method: string;
    duration: DurationBucket;
    source: "deterministic" | "provider";
  };
  extraction_failed: { code: string; pages: PageBucket; duration: DurationBucket };
  reconciliation_passed: { method: string; rows: RowBucket };
  reconciliation_failed: { method: string; rows: RowBucket };
  preview_viewed: { rows: RowBucket; statementType: StatementTypeProperty };
  checkout_clicked: { rows: RowBucket; statementType: StatementTypeProperty };
  checkout_redirected: Record<string, never>;
  checkout_failed: { code: string };
  payment_confirmed: Record<string, never>;
  export_requested: { format: "csv" | "xlsx" | "report" | "manifest" };
  export_downloaded: { format: "csv" | "xlsx" | "report" | "manifest"; rows: RowBucket };
  export_failed: { format: "csv" | "xlsx" | "report" | "manifest"; code: string };
  recovery_used: { outcome: "found" | "not_found" };
  data_deleted: Record<string, never>;
  cta_clicked: { location: string; label: string };
  faq_opened: { question: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export function pageBucket(pages: number): PageBucket {
  if (pages <= 1) return "1";
  if (pages <= 5) return "2-5";
  if (pages <= 10) return "6-10";
  if (pages <= 20) return "11-20";
  return "21-50";
}

export function rowBucket(rows: number): RowBucket {
  if (rows <= 0) return "0";
  if (rows <= 25) return "1-25";
  if (rows <= 100) return "26-100";
  if (rows <= 300) return "101-300";
  if (rows <= 1000) return "301-1000";
  return "1000+";
}

export function durationBucket(ms: number): DurationBucket {
  if (ms < 1000) return "<1s";
  if (ms < 3000) return "1-3s";
  if (ms < 10_000) return "3-10s";
  if (ms < 30_000) return "10-30s";
  return ">30s";
}
