import { canonicalJson } from "@/lib/crypto/canonical-json";
import type { PackManifest } from "@/lib/schema/pack";

/** Machine-readable pack manifest delivered with a paid download. */
export function buildPackManifestJson(manifest: PackManifest, packDigest: string): string {
  return `${canonicalJson({
    ...manifest,
    packDigest,
  })}\n`;
}
