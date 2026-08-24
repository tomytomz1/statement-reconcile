import { parserProviderConfigured } from "@/config/env";
import { seal } from "@/lib/crypto/seal";
import { summarize } from "@/lib/reconciliation";
import type {
  NormalizedStatement,
  ReconciliationResult,
  StatementSummary,
  Transaction,
} from "@/lib/schema/statement";
import { logEvent } from "@/lib/security/logging";

import { canonicalizeAndDigest } from "./canonicalize";
import { parseStatementDeterministically } from "./deterministic/parser";
import {
  EXTRACTION_ERROR_MESSAGES,
  type ExtractedPdfText,
  type ExtractionErrorCode,
  type ExtractionSource,
} from "./types";

/**
 * Server-side extraction pipeline.
 *
 * Order of operations is deliberate:
 *
 * 1. The deterministic parser runs first. It is free, it is auditable, and on layouts it
 *    understands it is strictly better than asking a model.
 * 2. If deterministic parsing cannot prove the result, the request fails closed.
 * 3. A provider may only be used by the selective-region path. Full-document provider
 *    fallback is intentionally forbidden by the privacy and provenance contract.
 *
 * Nothing is persisted. The statement is canonicalized, digested, and sealed for the
 * browser to hold, and then it goes out of scope.
 */

export const PREVIEW_ROW_COUNT = 10;

export type PipelineSuccess = {
  status: "reconciled";
  source: ExtractionSource;
  statement: NormalizedStatement;
  reconciliation: ReconciliationResult;
  summary: StatementSummary;
  preview: Transaction[];
  digest: string;
  /** Opaque envelope the browser stores until payment completes. */
  sealed: string;
  /** Which layout interpretation was used, for diagnostics only. */
  layout?: string;
};

export type PipelineRejection = {
  status: "rejected";
  code: ExtractionErrorCode;
  message: string;
  source: ExtractionSource | "none";
  /** Present when we got far enough to explain *why* the numbers did not agree. */
  reconciliation?: ReconciliationResult;
  summary?: StatementSummary;
  preview?: Transaction[];
};

export type PipelineOutcome = PipelineSuccess | PipelineRejection;

export async function runExtractionPipeline(
  document: ExtractedPdfText,
  hint: { statementType?: NormalizedStatement["statementType"]; currency?: string } = {},
): Promise<PipelineOutcome> {
  const deterministic = parseStatementDeterministically(document, hint);

  if (deterministic.ok) {
    logEvent("extraction_succeeded", {
      source: "deterministic",
      layout: deterministic.layout,
      pages: document.pageCount,
      rows: deterministic.statement.transactions.length,
    });
    return finalize("deterministic", deterministic.statement, deterministic.reconciliation, {
      layout: deterministic.layout,
    });
  }

  logEvent("extraction_failed", {
    source: "deterministic",
    code: deterministic.code,
    pages: document.pageCount,
    selectiveProviderAvailable: parserProviderConfigured(),
  });
  return rejection(deterministic.code, "deterministic", {
    reconciliation: deterministic.reconciliation,
    statement: deterministic.statement,
  });
}

/**
 * Failures the provider cannot help with: there is no text to read, the document is not a
 * single statement, or the page has no transaction table at all.
 */
async function finalize(
  source: ExtractionSource,
  statement: NormalizedStatement,
  reconciliation: ReconciliationResult,
  extra: { layout?: string },
): Promise<PipelineSuccess> {
  const { statement: canonical, digest } = await canonicalizeAndDigest(statement);
  if (canonical.verificationState !== "verification_passed" || !reconciliation.passed) {
    throw new Error("finalize called on an unverified statement");
  }
  const sealed = await seal(JSON.stringify(canonical), digest);
  const result: PipelineSuccess = {
    status: "reconciled",
    source,
    statement: canonical,
    reconciliation,
    summary: summarize(canonical),
    preview: canonical.transactions.slice(0, PREVIEW_ROW_COUNT),
    digest,
    sealed,
  };
  if (extra.layout) result.layout = extra.layout;
  return result;
}

function rejection(
  code: ExtractionErrorCode,
  source: ExtractionSource | "none",
  detail: {
    reconciliation?: ReconciliationResult | undefined;
    statement?: NormalizedStatement | undefined;
  } = {},
): PipelineRejection {
  const result: PipelineRejection = {
    status: "rejected",
    code,
    message: EXTRACTION_ERROR_MESSAGES[code],
    source,
  };
  if (detail.reconciliation) result.reconciliation = detail.reconciliation;
  if (detail.statement) {
    // A rejected statement is still shown to the customer so they can see what we read and
    // why it did not add up. It is never sealed and can never be exported.
    result.summary = summarize(detail.statement);
    result.preview = detail.statement.transactions.slice(0, PREVIEW_ROW_COUNT);
  }
  return result;
}
