import { siteConfig } from "@/config/site";
import { seal } from "@/lib/crypto/seal";
import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";
import { PAYLOAD_LIMITS } from "@/lib/extraction/types";
import {
  SCHEMA_VERSION,
  normalizedStatementSchema,
  type NormalizedStatement,
} from "@/lib/schema/statement";

import { PACK_MANIFEST_VERSION, assertPaidPack, packDigest, type PackManifest } from "./pack";

/**
 * Build and seal a conversion pack.
 *
 * Payment binds to the pack-manifest digest, never to a filename or a balance. Every
 * included file must already be `verification_passed`; this helper will not drop a failed
 * file to make a pack eligible.
 */

export const PACK_KIND = "pack" as const;

export type PackFileInput = {
  fileId: string;
  statement: NormalizedStatement;
  pageCount: number;
};

export type PackEnvelope = {
  kind: typeof PACK_KIND;
  manifest: PackManifest;
  files: Array<{ fileId: string; statement: NormalizedStatement }>;
};

export type AssembledPack = {
  envelope: PackEnvelope;
  manifest: PackManifest;
  digest: string;
  sealed: string;
};

export function isPackEnvelope(value: unknown): value is PackEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as { kind?: unknown; manifest?: unknown; files?: unknown };
  return record.kind === PACK_KIND && Array.isArray(record.files) && Boolean(record.manifest);
}

export function packFileId(jobId: string, index: number): string {
  if (!/^[0-9a-f]{32}$/.test(jobId)) throw new Error("invalid job id");
  if (!Number.isInteger(index) || index < 0 || index >= PAYLOAD_LIMITS.maxPages) {
    throw new Error("invalid file index");
  }
  const suffix = index.toString(16).padStart(2, "0");
  return `${suffix}${jobId}`.slice(0, 16);
}

export async function assemblePack(files: readonly PackFileInput[]): Promise<AssembledPack> {
  if (files.length === 0) {
    throw new Error("a pack needs at least one file");
  }

  const ids = new Set<string>();
  const totalPages = files.reduce(
    (sum, file) => sum + file.statement.completeness.pagesDeclared,
    0,
  );
  if (totalPages < 1 || totalPages > PAYLOAD_LIMITS.maxPages) {
    throw new Error("pack exceeds the combined page limit");
  }

  const manifestFiles: PackManifest["files"] = [];
  const envelopeFiles: PackEnvelope["files"] = [];

  for (const file of files) {
    if (file.statement.verificationState !== "verification_passed") {
      throw new Error("a paid pack cannot include a file that did not pass verification");
    }

    const canonical = await canonicalizeAndDigest(file.statement);
    if (canonical.statement.verificationState !== "verification_passed") {
      throw new Error("canonical file is not verification_passed");
    }
    const verifiedPageCount = canonical.statement.completeness.pagesDeclared;
    if (verifiedPageCount !== file.pageCount) {
      throw new Error("claimed page count does not match verified statement");
    }
    const stableFileId = canonical.digest.slice(0, 16);
    if (ids.has(stableFileId)) throw new Error("duplicate statement in pack");
    ids.add(stableFileId);

    manifestFiles.push({
      fileId: stableFileId,
      resultDigest: canonical.digest,
      pageCount: verifiedPageCount,
      transactionCount: canonical.statement.transactions.length,
      verificationState: "verification_passed",
      statementType: canonical.statement.statementType,
    });
    envelopeFiles.push({ fileId: stableFileId, statement: canonical.statement });
  }

  // Pack identity must not depend on the order the customer happened to pick the files in.
  //
  // The 30-day entitlement is redeemed by re-uploading the same PDFs and reproducing the
  // paid pack digest. Building the manifest in input order meant the same statements chosen
  // in a different order produced a different digest, so a customer who paid could be
  // refused their own files for a reason no message could sensibly explain.
  //
  // Sorting by the file-level content digest makes the identity a function of the contents
  // alone. It is a total order because duplicate digests are rejected above, and it is
  // stable across devices because the digest is canonical. Ordering carries no meaning here:
  // each statement is verified independently against its own printed balances.
  manifestFiles.sort((a, b) => (a.resultDigest < b.resultDigest ? -1 : 1));
  envelopeFiles.sort((a, b) => (a.fileId < b.fileId ? -1 : 1));

  const manifest: PackManifest = {
    schemaVersion: SCHEMA_VERSION,
    manifestVersion: PACK_MANIFEST_VERSION,
    productVersion: siteConfig.productVersion,
    fileCount: files.length,
    totalPages,
    files: manifestFiles,
  };
  assertPaidPack(manifest);

  const digest = await packDigest(manifest);
  const envelope: PackEnvelope = { kind: PACK_KIND, manifest, files: envelopeFiles };
  const sealed = await seal(JSON.stringify(envelope), digest);
  return { envelope, manifest, digest, sealed };
}

export function parsePackEnvelope(raw: unknown): PackEnvelope {
  if (!isPackEnvelope(raw)) throw new Error("not a pack envelope");
  const files = raw.files.map((file) => {
    const parsed = normalizedStatementSchema.parse(file.statement);
    return { fileId: file.fileId, statement: parsed };
  });
  return { kind: PACK_KIND, manifest: raw.manifest, files };
}
