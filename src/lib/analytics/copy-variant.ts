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

/**
 * The variant for a server-handled request, taken from the header `src/proxy.ts` set.
 *
 * The conversion half of the funnel happens on `/app` and `/checkout`, where `connect-src` is
 * deliberately `'self'` so that a page holding a statement cannot talk to an analytics vendor
 * at all. Client-side measurement is therefore impossible there by design, and widening the
 * policy to allow it is not an option. Server logs are the backstop, and stamping them with
 * the variant is what makes verified-preview-to-payment measurable per headline.
 *
 * What travels is one character from a closed set that the server assigned in the first place.
 * It is not derived from the customer or from the statement, and an unrecognised or absent
 * header yields `undefined`, which `logEvent` drops rather than guessing at.
 *
 * Only for requests the browser makes. A Stripe webhook carries no session cookie, so the
 * variant there would be assigned from a session id invented for that request — a real-looking
 * value that means nothing. Attribute payment through `export_delivered` instead.
 */
export function copyVariantFromHeaders(headers: Headers): CopyVariant | undefined {
  const value = headers.get(COPY_VARIANT_HEADER);
  return isCopyVariant(value) ? value : undefined;
}
