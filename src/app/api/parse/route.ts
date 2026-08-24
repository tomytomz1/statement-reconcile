import { runExtractionPipeline, type PipelineOutcome } from "@/lib/extraction/pipeline";
import { PAYLOAD_LIMITS, parseRequestSchema } from "@/lib/extraction/types";
import { assemblePack, packFileId } from "@/lib/schema/assemble-pack";
import { logEvent, logFailure } from "@/lib/security/logging";
import { isAllowedOrigin, isJsonRequest, readJsonBody } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIdentity,
  rateLimitHeaders,
  rateLimitMisconfigured,
} from "@/lib/security/rate-limit";
import { errorResponse, jsonResponse } from "@/lib/security/responses";
import { verificationEvidence } from "@/lib/verification/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * `POST /api/parse`
 *
 * Accepts the positioned text of one or more PDFs — never the PDFs themselves — and
 * returns per-file verification plus, when every included file passed, a sealed pack
 * bound to the pack-manifest digest.
 */

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return errorResponse("forbidden", 403, "This request did not come from an allowed origin.");
  }
  if (!isJsonRequest(request)) {
    return errorResponse("bad_request", 415, "Expected a JSON request body.");
  }

  if (rateLimitMisconfigured()) {
    logEvent("parse_blocked_unprotected");
    return errorResponse(
      "internal_error",
      503,
      "The service is temporarily unavailable. Please try again shortly.",
    );
  }

  const identity = await clientIdentity(request);
  const decision = await checkRateLimit(RATE_LIMITS.parse, identity);
  if (!decision.allowed) {
    logEvent("rate_limited", { route: "parse" });
    return errorResponse("rate_limited", 429, undefined, rateLimitHeaders(decision));
  }

  const body = await readJsonBody(request, PAYLOAD_LIMITS.maxBodyBytes);
  if (!body.ok) {
    return body.reason === "too_large"
      ? errorResponse("payload_too_large", 413)
      : errorResponse("bad_request", 400, "The request body could not be read.");
  }

  const parsed = parseRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    logEvent("parse_request_invalid");
    const tooManyPages = parsed.error.issues.some((issue) => issue.message === "too many pages");
    return tooManyPages
      ? errorResponse("too_many_pages", 413)
      : errorResponse("bad_request", 400, "The request payload was not in the expected shape.");
  }

  const jobId = parsed.data.jobId;
  const files = parsed.data.files?.length
    ? parsed.data.files
    : [
        {
          fileId: packFileId(jobId, 0),
          document: parsed.data.document!,
          hint: parsed.data.hint,
        },
      ];

  const totalPages = files.reduce((sum, file) => sum + file.document.pageCount, 0);
  if (totalPages > PAYLOAD_LIMITS.maxPages) {
    return errorResponse("too_many_pages", 413);
  }

  try {
    const outcomes: Array<{
      fileId: string;
      pageCount: number;
      outcome: PipelineOutcome;
    }> = [];

    for (const file of files) {
      const outcome = await runExtractionPipeline(file.document, file.hint ?? {});
      outcomes.push({ fileId: file.fileId, pageCount: file.document.pageCount, outcome });
    }

    const fileBodies = outcomes.map(({ fileId, pageCount, outcome }) => {
      if (outcome.status === "rejected") {
        return {
          fileId,
          pageCount,
          status: "rejected" as const,
          code: outcome.code,
          message: outcome.message,
          source: outcome.source,
          reconciliation: outcome.reconciliation ?? null,
          summary: outcome.summary ?? null,
          preview: outcome.preview ?? null,
          digest: null,
          sealed: null,
          verification: null,
        };
      }
      return {
        fileId,
        pageCount,
        status: "reconciled" as const,
        code: null,
        message: null,
        source: outcome.source,
        layout: outcome.layout ?? null,
        reconciliation: outcome.reconciliation,
        summary: outcome.summary,
        preview: outcome.preview,
        totalTransactions: outcome.statement.transactions.length,
        warnings: outcome.statement.extractionWarnings,
        digest: outcome.digest,
        sealed: outcome.sealed,
        verification: verificationEvidence(outcome.statement),
      };
    });

    const passing = outcomes.filter((entry) => entry.outcome.status === "reconciled");
    const eligible = passing.length === outcomes.length && passing.length > 0;

    let packDigest: string | null = null;
    let packSealed: string | null = null;
    if (eligible) {
      const assembled = await assemblePack(
        passing.map((entry) => ({
          fileId: entry.fileId,
          pageCount: entry.pageCount,
          statement: (entry.outcome as Extract<PipelineOutcome, { status: "reconciled" }>)
            .statement,
        })),
      );
      packDigest = assembled.digest;
      packSealed = assembled.sealed;
    }

    if (files.length === 1) {
      const only = fileBodies[0];
      if (!only || only.status === "rejected") {
        const rejected = outcomes[0]?.outcome;
        return jsonResponse({
          status: "rejected",
          jobId,
          code:
            rejected && rejected.status === "rejected" ? rejected.code : "verification_rejected",
          message:
            rejected && rejected.status === "rejected"
              ? rejected.message
              : "We could not verify this statement reliably. You will not be charged.",
          source: only?.source ?? "none",
          reconciliation: only?.reconciliation ?? null,
          summary: only?.summary ?? null,
          preview: only?.preview ?? null,
          verification: only?.verification ?? null,
        });
      }

      return jsonResponse({
        status: "reconciled",
        jobId,
        source: only.source,
        layout: only.layout ?? null,
        digest: packDigest,
        sealed: packSealed,
        summary: only.summary,
        reconciliation: only.reconciliation,
        preview: only.preview,
        totalTransactions: only.totalTransactions,
        warnings: only.warnings,
        verification: only.verification,
        fileCount: 1,
        totalPages,
        files: fileBodies,
      });
    }

    return jsonResponse({
      status: "pack",
      jobId,
      eligible,
      fileCount: files.length,
      totalPages,
      digest: packDigest,
      sealed: packSealed,
      files: fileBodies,
    });
  } catch (error) {
    logFailure("parse_unhandled", error, { route: "parse" });
    return errorResponse("internal_error", 500);
  }
}

export function GET(): Response {
  return errorResponse("method_not_allowed", 405, "Use POST.");
}
