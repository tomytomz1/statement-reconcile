import { z } from "zod";

import { canonicalJson } from "@/lib/crypto/canonical-json";
import { sha256Hex } from "@/lib/crypto/digest";

/**
 * Canonical pack manifest.
 *
 * Stripe records the digest of this object — not filenames, not balances, not
 * descriptions. File-level result digests are ordered. Changing which files are
 * included, or any file's verified representation, changes the pack digest.
 */

export const PACK_MANIFEST_VERSION = 1 as const;

export const packFileEntrySchema = z.object({
  fileId: z.string().regex(/^[0-9a-f]{16}$/),
  resultDigest: z.string().regex(/^[0-9a-f]{64}$/),
  pageCount: z.number().int().min(1).max(50),
  transactionCount: z.number().int().min(0),
  verificationState: z.literal("verification_passed"),
  statementType: z.enum(["checking", "savings", "credit_card", "unknown"]),
});
export type PackFileEntry = z.infer<typeof packFileEntrySchema>;

export const packManifestSchema = z.object({
  schemaVersion: z.literal(2),
  manifestVersion: z.literal(PACK_MANIFEST_VERSION),
  productVersion: z.string().min(1).max(32),
  fileCount: z.number().int().min(1).max(50),
  totalPages: z.number().int().min(1).max(50),
  files: z.array(packFileEntrySchema).min(1).max(50),
});
export type PackManifest = z.infer<typeof packManifestSchema>;

const PACK_DIGEST_DOMAIN = "statement-reconcile/pack/v2\n";

export async function packDigest(manifest: PackManifest): Promise<string> {
  return sha256Hex(PACK_DIGEST_DOMAIN + canonicalJson(manifest));
}

export function assertPaidPack(manifest: PackManifest): void {
  if (manifest.files.some((file) => file.verificationState !== "verification_passed")) {
    throw new Error("a paid pack cannot include a file that did not pass verification");
  }
  if (manifest.fileCount !== manifest.files.length) {
    throw new Error("pack fileCount must equal files.length");
  }
  const pages = manifest.files.reduce((sum, file) => sum + file.pageCount, 0);
  if (pages !== manifest.totalPages) {
    throw new Error("pack totalPages must equal the sum of file page counts");
  }
}
