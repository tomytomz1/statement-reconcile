import { looksLikeSessionId, paidDigestForSession } from "@/lib/payments/entitlement";
import { logEvent } from "@/lib/security/logging";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIdentity,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { errorResponse, jsonResponse } from "@/lib/security/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/checkout/verify?session_id=…`
 *
 * Called by the success page to find out which conversion a payment covers. It returns the
 * digest and nothing else — no amount tied to a person, no email, no statement content.
 *
 * A digest is a one-way hash, so this cannot be used to obtain someone else's data: the
 * caller still has to hold the matching sealed result before `/api/export` will produce a
 * file. What it does allow is the browser matching the payment to the job it already has
 * in local storage, including after a redirect that lost the tab's memory.
 */
export async function GET(request: Request): Promise<Response> {
  const identity = await clientIdentity(request);
  const decision = await checkRateLimit(RATE_LIMITS.checkout, identity);
  if (!decision.allowed) {
    return errorResponse("rate_limited", 429, undefined, rateLimitHeaders(decision));
  }

  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim() ?? "";
  if (!looksLikeSessionId(sessionId)) {
    return errorResponse("bad_request", 400, "A valid payment reference is required.");
  }

  const result = await paidDigestForSession(sessionId);
  if (!result.ok) {
    logEvent("verify_failed", { reason: result.reason });
    return jsonResponse(
      { paid: false, reason: result.reason },
      result.reason === "not_paid" ? 200 : 404,
    );
  }

  return jsonResponse({ paid: true, digest: result.digest, sessionId });
}

export function POST(): Response {
  return errorResponse("method_not_allowed", 405, "Use GET.");
}
