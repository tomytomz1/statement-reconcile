/**
 * Feature flags for capabilities that are architected but intentionally disabled in V1.
 *
 * The public site must never advertise or link to an output format whose flag is off,
 * so marketing components read these values rather than assuming availability.
 */

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

/**
 * Server-visible flags. Because `NEXT_PUBLIC_*` values are inlined at build time, the
 * flags that affect rendering are exposed with the public prefix.
 */
export const flags = {
  /** OCR for image-only statements. Off in V1: scanned statements are rejected. */
  ocr: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_OCR, false),
  /** QuickBooks .qbo export. Architected as an export module, not shipped. */
  qbo: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_QBO, false),
  /** OFX export. Architected as an export module, not shipped. */
  ofx: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_OFX, false),
  /**
   * Allows bank-specific pages to say a named issuer's layout has been validated.
   * Off by default: we only claim generic eligibility until a layout is actually tested.
   */
  bankSpecificClaims: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_BANK_SPECIFIC_CLAIMS, false),
  /** Analytics transport. When false, no analytics code runs at all. */
  analytics: boolFromEnv(process.env.NEXT_PUBLIC_ENABLE_ANALYTICS, false),
} as const;

export type FeatureFlag = keyof typeof flags;

/** Export formats that are actually available to a paying customer right now. */
export const enabledExportFormats = (
  [
    "csv",
    "xlsx",
    ...(flags.qbo ? (["qbo"] as const) : []),
    ...(flags.ofx ? (["ofx"] as const) : []),
  ] as const
).filter(Boolean) as readonly ExportFormat[];

export type ExportFormat = "csv" | "xlsx" | "qbo" | "ofx";

export function isExportFormatEnabled(format: ExportFormat): boolean {
  return enabledExportFormats.includes(format);
}
