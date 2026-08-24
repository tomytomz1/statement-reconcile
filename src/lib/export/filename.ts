import type { NormalizedStatement } from "@/lib/schema/statement";

/**
 * Download filenames.
 *
 * The customer's original filename is never used. Bank statement filenames routinely
 * contain an account number, a customer number, or a full name, and echoing one back in a
 * `Content-Disposition` header would put it into browser download history and any proxy
 * log along the way. The name is built from data we already decided is safe to show: the
 * statement type and the period.
 */

export type ExportFormat = "csv" | "xlsx" | "report" | "manifest";

export const CONTENT_TYPES: Record<ExportFormat | "zip", string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  report: "application/pdf",
  manifest: "application/json; charset=utf-8",
  zip: "application/zip",
};

export function exportFilename(
  statement: NormalizedStatement,
  format: Exclude<ExportFormat, "manifest">,
  index?: number,
): string {
  const type = statement.statementType === "credit_card" ? "credit-card" : statement.statementType;
  const period = periodSlug(statement);
  const prefix = index !== undefined ? `statement-${index + 1}-${type}` : `statement-${type}`;
  const stem = period ? `${prefix}-${period}` : prefix;
  if (format === "report") return safeFilename(`${stem}-verification-report.pdf`);
  return safeFilename(`${stem}.${format}`);
}

export function manifestFilename(): string {
  return "pack-manifest.json";
}

export function packZipFilename(format: ExportFormat): string {
  if (format === "manifest") return manifestFilename();
  if (format === "report") return "verification-reports.zip";
  return `statements-${format}.zip`;
}

function periodSlug(statement: NormalizedStatement): string {
  const start = statement.periodStart;
  const end = statement.periodEnd;
  if (start && end) return start === end ? start : `${start}_${end}`;
  return end ?? start ?? "";
}

/**
 * Strip a filename down to characters that cannot break out of a quoted header value or
 * traverse a path. Anything unexpected becomes a hyphen rather than being dropped, so two
 * different names cannot collapse into one.
 */
export function safeFilename(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 100);
  return cleaned === "" ? "statement.csv" : cleaned;
}
