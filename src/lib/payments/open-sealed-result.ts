import { SealError, unseal } from "@/lib/crypto/seal";
import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";
import { PAYLOAD_LIMITS } from "@/lib/extraction/types";
import { reconcile } from "@/lib/reconciliation";
import { packDigest, packManifestSchema, type PackManifest } from "@/lib/schema/pack";
import { isPackEnvelope, type PackEnvelope } from "@/lib/schema/assemble-pack";
import {
  SCHEMA_VERSION,
  type NormalizedStatement,
  type ReconciliationResult,
} from "@/lib/schema/statement";
import { evaluateVerificationGate, canOfferCheckout } from "@/lib/verification/gate";

/**
 * Re-establish a verified pack (or legacy single statement) from a sealed envelope.
 *
 * Both gated routes need the same guarantees before they act, so the checks live in one
 * place and neither route can accidentally skip one:
 *
 * 1. The envelope opens under the digest being claimed.
 * 2. The contents parse as a pack of verified statements, or a legacy single statement.
 * 3. Canonicalizing and re-digesting reproduces the claimed digest exactly.
 * 4. Completeness, source mapping, ambiguity, running-balance, and aggregate checks pass
 *    again from scratch on every included file.
 *
 * A file that is incomplete, ambiguous, or `verification_rejected` cannot reach checkout
 * or export, even if the client UI claimed otherwise.
 */

export type OpenSealedFailure =
  "envelope_rejected" | "invalid_contents" | "digest_mismatch" | "not_reconciled";

export type OpenedPackFile = {
  fileId: string;
  statement: NormalizedStatement;
  reconciliation: ReconciliationResult;
  resultDigest: string;
  pageCount: number;
};

export type OpenSealedSuccess = {
  ok: true;
  kind: "pack" | "statement";
  statement: NormalizedStatement;
  reconciliation: ReconciliationResult;
  files: OpenedPackFile[];
  manifest: PackManifest | null;
  packDigest: string | null;
};

export type OpenSealedResult = OpenSealedSuccess | { ok: false; reason: OpenSealedFailure };

export async function openSealedResult(sealed: string, digest: string): Promise<OpenSealedResult> {
  let plaintext: string;
  try {
    plaintext = await unseal(sealed, digest);
  } catch (error) {
    if (error instanceof SealError) return { ok: false, reason: "envelope_rejected" };
    return { ok: false, reason: "envelope_rejected" };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(plaintext);
  } catch {
    return { ok: false, reason: "invalid_contents" };
  }

  if (isPackEnvelope(raw)) {
    return openPack(raw, digest);
  }

  return openLegacyStatement(raw, digest);
}

async function openPack(raw: PackEnvelope, digest: string): Promise<OpenSealedResult> {
  try {
    const manifest = packManifestSchema.parse(raw.manifest);
    const computed = await packDigest(manifest);
    if (computed !== digest) return { ok: false, reason: "digest_mismatch" };

    if (manifest.schemaVersion !== SCHEMA_VERSION) {
      return { ok: false, reason: "invalid_contents" };
    }
    if (raw.files.length !== manifest.files.length || raw.files.length === 0) {
      return { ok: false, reason: "invalid_contents" };
    }

    const files: OpenedPackFile[] = [];
    for (const entry of manifest.files) {
      // Matched by fileId only. There used to be a positional fallback here, which meant a
      // manifest whose ids did not line up with the envelope could still be paired by
      // index — quietly associating a manifest entry with a different statement. A missing
      // match is now a refusal.
      const packed = raw.files.find((file) => file.fileId === entry.fileId);
      if (!packed) {
        return { ok: false, reason: "invalid_contents" };
      }
      const opened = await gateStatement(packed.statement, entry.resultDigest);
      if (!opened.ok) return opened;
      if (entry.verificationState !== "verification_passed") {
        return { ok: false, reason: "not_reconciled" };
      }

      // Defence in depth: every claim the manifest makes about a file is re-derived from
      // the opened canonical statement rather than believed.
      //
      // The manifest is already digest-bound, and the envelope is AES-GCM sealed under that
      // digest, so a mismatch here should be unreachable. That is exactly why it is worth
      // checking — if it ever fires, an assumption underneath the sealing has broken, and
      // the safe response is to refuse rather than to serve a pack whose description of
      // itself no longer matches its contents.
      const derivedPages = opened.statement.completeness.pagesDeclared;
      const derivedRows = opened.statement.transactions.length;
      if (
        entry.pageCount !== derivedPages ||
        entry.transactionCount !== derivedRows ||
        entry.statementType !== opened.statement.statementType ||
        entry.fileId !== opened.digest.slice(0, 16)
      ) {
        return { ok: false, reason: "invalid_contents" };
      }

      files.push({
        fileId: entry.fileId,
        statement: opened.statement,
        reconciliation: opened.reconciliation,
        resultDigest: opened.digest,
        pageCount: derivedPages,
      });
    }

    const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);
    if (totalPages !== manifest.totalPages || totalPages > PAYLOAD_LIMITS.maxPages) {
      return { ok: false, reason: "invalid_contents" };
    }
    if (manifest.fileCount !== files.length) {
      return { ok: false, reason: "invalid_contents" };
    }

    const first = files[0];
    if (!first) return { ok: false, reason: "invalid_contents" };

    return {
      ok: true,
      kind: "pack",
      statement: first.statement,
      reconciliation: first.reconciliation,
      files,
      manifest,
      packDigest: digest,
    };
  } catch {
    return { ok: false, reason: "invalid_contents" };
  }
}

async function openLegacyStatement(raw: unknown, digest: string): Promise<OpenSealedResult> {
  const gated = await gateStatement(raw, digest);
  if (!gated.ok) return gated;
  return {
    ok: true,
    kind: "statement",
    statement: gated.statement,
    reconciliation: gated.reconciliation,
    files: [
      {
        fileId: "0000000000000000",
        statement: gated.statement,
        reconciliation: gated.reconciliation,
        resultDigest: gated.digest,
        pageCount: Math.max(1, gated.statement.completeness.pagesDeclared),
      },
    ],
    manifest: null,
    packDigest: null,
  };
}

async function gateStatement(
  raw: unknown,
  expectedDigest: string,
): Promise<
  | {
      ok: true;
      statement: NormalizedStatement;
      reconciliation: ReconciliationResult;
      digest: string;
    }
  | { ok: false; reason: OpenSealedFailure }
> {
  let canonical: { statement: NormalizedStatement; digest: string };
  try {
    canonical = await canonicalizeAndDigest(raw);
  } catch {
    return { ok: false, reason: "invalid_contents" };
  }

  if (canonical.digest !== expectedDigest) return { ok: false, reason: "digest_mismatch" };

  const gated = evaluateVerificationGate({
    statement: canonical.statement,
    completeness: canonical.statement.completeness,
    ambiguities: canonical.statement.ambiguities,
  });
  const reconciliation = reconcile(gated.statement);
  if (
    !reconciliation.passed ||
    !gated.result.passed ||
    !canOfferCheckout(gated.statement.verificationState)
  ) {
    return { ok: false, reason: "not_reconciled" };
  }

  return {
    ok: true,
    statement: gated.statement,
    reconciliation,
    digest: canonical.digest,
  };
}
