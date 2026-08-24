import type { ExtractedPdfText, PdfPageText } from "@/lib/extraction/types";

/**
 * Non-sensitive page fingerprints.
 *
 * Built from normalized text and rounded geometry and immediately hashed. The page number
 * is deliberately excluded: identical content on pages 2 and 7 must still compare equal.
 * Only the non-reversible fingerprint survives the request.
 */

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function pageFingerprint(page: PdfPageText): string {
  const itemCount = page.items.length;
  const charCount = page.items.reduce((sum, item) => sum + item.t.length, 0);
  const sample = page.items
    .map(
      (item) =>
        `${Math.round(item.x)}:${Math.round(item.y)}:${item.t.normalize("NFKC").replace(/\s+/g, " ").trim()}`,
    )
    .join(",");
  const left = fnv1a(
    `${Math.round(page.width)}x${Math.round(page.height)}|${itemCount}|${charCount}`,
  );
  const right = fnv1a(sample);
  return `${left}${right}`;
}

export function documentFingerprints(document: ExtractedPdfText): string[] {
  return document.pages.map((page) => pageFingerprint(page));
}

export function duplicateFingerprintIndexes(fingerprints: readonly string[]): number[][] {
  const groups = new Map<string, number[]>();
  for (const [index, fingerprint] of fingerprints.entries()) {
    const existing = groups.get(fingerprint) ?? [];
    existing.push(index);
    groups.set(fingerprint, existing);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
