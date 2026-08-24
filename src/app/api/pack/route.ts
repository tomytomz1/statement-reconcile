import { MAX_GATED_BODY_BYTES, assemblePackRequestSchema } from "@/lib/payments/checkout-payload";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { assemblePack } from "@/lib/schema/assemble-pack";
import { logEvent } from "@/lib/security/logging";
import { isAllowedOrigin, isJsonRequest, readJsonBody } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIdentity,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { errorResponse, jsonResponse } from "@/lib/security/responses";
import { PAYLOAD_LIMITS } from "@/lib/extraction/types";
import { verificationEvidence } from "@/lib/verification/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/pack`
 *
 * Assemble a verified subset. The customer must have explicitly kept every included file.
 * Failed files cannot be omitted here — they must already be absent from the request.
 */

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return errorResponse("forbidden", 403, "This request did not come from an allowed origin.");
  }
  if (!isJsonRequest(request)) {
    return errorResponse("bad_request", 415, "Expected a JSON request body.");
  }

  const identity = await clientIdentity(request);
  const decision = await checkRateLimit(RATE_LIMITS.checkout, identity);
  if (!decision.allowed) {
    return errorResponse("rate_limited", 429, undefined, rateLimitHeaders(decision));
  }

  const body = await readJsonBody(request, MAX_GATED_BODY_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? errorResponse("payload_too_large", 413)
      : errorResponse("bad_request", 400, "The request body could not be read.");
  }

  const parsed = assemblePackRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return errorResponse("bad_request", 400, "The request payload was not in the expected shape.");
  }

  const openedFiles = [];
  for (const file of parsed.data.files) {
    const opened = await openSealedResult(file.sealed, file.digest);
    if (!opened.ok) {
      logEvent("pack_refused", { reason: opened.reason });
      return errorResponse(
        "forbidden",
        409,
        "A selected file has not been verified, so it cannot be added to a paid pack.",
      );
    }
    const selected =
      opened.kind === "statement" && opened.files.length === 1
        ? opened.files[0]
        : opened.files.find((entry) => entry.fileId === file.fileId);
    if (!selected) {
      return errorResponse("forbidden", 409, "A selected file could not be confirmed.");
    }
    const verifiedPageCount = selected.statement.completeness.pagesDeclared;
    if (file.pageCount !== verifiedPageCount || selected.pageCount !== verifiedPageCount) {
      logEvent("pack_refused", { reason: "page_count_mismatch" });
      return errorResponse(
        "forbidden",
        409,
        "A selected file's page count did not match its verified result.",
      );
    }
    openedFiles.push({
      fileId: file.fileId,
      pageCount: verifiedPageCount,
      statement: selected.statement,
    });
  }

  const totalPages = openedFiles.reduce((sum, file) => sum + file.pageCount, 0);
  if (totalPages > PAYLOAD_LIMITS.maxPages) {
    return errorResponse("too_many_pages", 413);
  }

  try {
    const assembled = await assemblePack(openedFiles);
    logEvent("pack_assembled", {
      fileCount: assembled.manifest.fileCount,
      totalPages: assembled.manifest.totalPages,
    });
    return jsonResponse({
      jobId: parsed.data.jobId,
      digest: assembled.digest,
      sealed: assembled.sealed,
      fileCount: assembled.manifest.fileCount,
      totalPages: assembled.manifest.totalPages,
      files: assembled.envelope.files.map((file) => ({
        fileId: file.fileId,
        verification: verificationEvidence(file.statement),
        totalTransactions: file.statement.transactions.length,
      })),
    });
  } catch {
    return errorResponse(
      "forbidden",
      409,
      "The selected files could not be assembled into a verified pack.",
    );
  }
}

export function GET(): Response {
  return errorResponse("method_not_allowed", 405, "Use POST.");
}
