import { RETENTION_POLICY_VERSION } from "@/lib/schema/provenance";
import type { ProcessingDisclosure } from "@/lib/schema/statement";

/**
 * Privacy receipt for one file.
 *
 * Sentences shown to the customer must be generated from this object, never from
 * marketing copy. `rawPdfLeftBrowser` is structurally false in V1.
 */

export function localOnlyDisclosure(pages: number): ProcessingDisclosure {
  return {
    rawPdfLeftBrowser: false,
    localPagesProcessed: pages,
    remoteTextRegionsProcessed: 0,
    remoteImageRegionsProcessed: 0,
    providersUsed: [],
    retentionPolicyVersion: RETENTION_POLICY_VERSION,
  };
}

export function withRemoteText(
  base: ProcessingDisclosure,
  regions: number,
  provider: string,
): ProcessingDisclosure {
  if (regions <= 0) return base;
  const providers = base.providersUsed.includes(provider)
    ? base.providersUsed
    : [...base.providersUsed, provider];
  return {
    ...base,
    remoteTextRegionsProcessed: base.remoteTextRegionsProcessed + regions,
    providersUsed: providers,
  };
}

export function disclosureSentences(receipt: ProcessingDisclosure): string[] {
  const sentences: string[] = [];
  if (receipt.rawPdfLeftBrowser === false) {
    sentences.push("Your original PDF never left this browser.");
  }
  const remote = receipt.remoteTextRegionsProcessed + receipt.remoteImageRegionsProcessed;
  if (remote === 0) {
    sentences.push(
      `${receipt.localPagesProcessed} page${receipt.localPagesProcessed === 1 ? " was" : "s were"} text-extracted locally. No statement text was sent to an external extraction service.`,
    );
  } else {
    sentences.push(
      `${receipt.localPagesProcessed} pages were text-extracted locally; ${receipt.remoteTextRegionsProcessed} ambiguous text region${receipt.remoteTextRegionsProcessed === 1 ? " was" : "s were"} sent securely to the configured extraction service.`,
    );
  }
  if (receipt.remoteImageRegionsProcessed > 0) {
    sentences.push(
      `${receipt.remoteImageRegionsProcessed} cropped page image region${receipt.remoteImageRegionsProcessed === 1 ? " was" : "s were"} sent for OCR. Image OCR is disclosed because it is not “text stayed local.”`,
    );
  }
  return sentences;
}
