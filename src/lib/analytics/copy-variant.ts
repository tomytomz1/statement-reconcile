export const COPY_VARIANT_HEADER = "x-sr-copy-variant";
export const COPY_VARIANT_STORAGE_KEY = "sr_copy_variant";

export type CopyVariant = "a" | "b" | "c";

export const COPY_HEADLINES: Record<CopyVariant, string> = {
  a: "Convert Bank Statements to Excel & CSV—Then Make the Spreadsheet Prove It Matches the PDF",
  b: "The Spreadsheet Looks Clean. But Did the Converter Miss a Row?",
  c: "Stop Retyping Bank Statements—and Stop Checking a Converter’s Work by Hand",
};

export function isCopyVariant(value: unknown): value is CopyVariant {
  return value === "a" || value === "b" || value === "c";
}

/** Stable, dependency-free assignment from the existing anonymous session id. */
export function copyVariantForSession(sessionId: string): CopyVariant {
  let hash = 2166136261;
  for (let index = 0; index < sessionId.length; index += 1) {
    hash ^= sessionId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = (hash >>> 0) % 100;
  if (bucket < 34) return "a";
  if (bucket < 67) return "b";
  return "c";
}

export function resolveCopyVariant(
  sessionId: string,
  previewOverride: unknown,
  vercelEnvironment: string | undefined,
): CopyVariant {
  if (vercelEnvironment === "preview" && isCopyVariant(previewOverride)) return previewOverride;
  return copyVariantForSession(sessionId);
}
