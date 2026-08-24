import { MAX_GATED_BODY_BYTES, exportRequestSchema } from "@/lib/payments/checkout-payload";
import {
  isWithinEntitlementWindow,
  looksLikeSessionId,
  verifyEntitlement,
} from "@/lib/payments/entitlement";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { deliverExport } from "@/lib/export/deliver";
import { logEvent, logFailure } from "@/lib/security/logging";
import { isAllowedOrigin, isJsonRequest, readJsonBody } from "@/lib/security/origin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIdentity,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { errorResponse, fileResponse } from "@/lib/security/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * `POST /api/export`
 *
 * The paid gate. Producing a file requires all of the following, checked in this order:
 *
 * 1. A Checkout Session that Stripe reports as `paid`, read live from Stripe.
 * 2. That session's recorded digest matching the digest being claimed, compared in
 *    constant time.
 * 3. The sealed envelope opening under that digest.
 * 4. Every included file re-canonicalizing and passing the verification gate.
 *
 * There is no local record of purchases and no signed token that could be replayed against
 * different data. A session buys exactly one pack: the one it paid for.
 */

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return errorResponse("forbidden", 403, "This request did not come from an allowed origin.");
  }
  if (!isJsonRequest(request)) {
    return errorResponse("bad_request", 415, "Expected a JSON request body.");
  }

  const identity = await clientIdentity(request);
  const decision = await checkRateLimit(RATE_LIMITS.exportFile, identity);
  if (!decision.allowed) {
    return errorResponse("rate_limited", 429, undefined, rateLimitHeaders(decision));
  }

  const body = await readJsonBody(request, MAX_GATED_BODY_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? errorResponse("payload_too_large", 413)
      : errorResponse("bad_request", 400, "The request body could not be read.");
  }

  const parsed = exportRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return errorResponse("bad_request", 400, "The request payload was not in the expected shape.");
  }

  const { sessionId, digest, sealed, format } = parsed.data;
  if (!looksLikeSessionId(sessionId)) {
    return errorResponse("forbidden", 403, "That payment reference is not valid.");
  }

  const entitlement = await verifyEntitlement(sessionId, digest);
  if (!entitlement.ok) {
    logEvent("export_denied", { reason: entitlement.reason, format });
    return errorResponse("forbidden", 403, entitlementMessage(entitlement.reason));
  }
  if (!isWithinEntitlementWindow(entitlement.entitlement)) {
    logEvent("export_denied", { reason: "expired", format });
    return errorResponse(
      "forbidden",
      403,
      "This download link has expired. Please get in touch and we will help.",
    );
  }

  const opened = await openSealedResult(sealed, digest);
  if (!opened.ok) {
    logEvent("export_denied", { reason: opened.reason, format, paid: true });
    return errorResponse(
      "forbidden",
      409,
      "The converted data could not be confirmed against your payment. Please re-run the conversion; you will not be charged again.",
    );
  }

  try {
    const delivered = await deliverExport(opened, format);
    logEvent("export_delivered", {
      format,
      rows: opened.files.reduce((sum, file) => sum + file.statement.transactions.length, 0),
      files: opened.files.length,
      method: opened.reconciliation.method,
    });
    return fileResponse(delivered.body, delivered.contentType, delivered.filename);
  } catch (error) {
    logFailure("export_failed", error, { format });
    return errorResponse("internal_error", 500, "The file could not be generated. Please retry.");
  }
}

function entitlementMessage(reason: string): string {
  switch (reason) {
    case "not_paid":
      return "This payment has not completed yet. If you have just paid, wait a moment and retry.";
    case "session_not_found":
      return "That payment reference could not be found.";
    case "stripe_unavailable":
      return "Payments are not available on this deployment.";
    default:
      return "This download is not authorized for the data provided.";
  }
}

export function GET(): Response {
  return errorResponse("method_not_allowed", 405, "Use POST.");
}
