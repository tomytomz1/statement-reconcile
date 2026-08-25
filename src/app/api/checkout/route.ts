import { mockPaymentsEnabled } from "@/config/env";
import { siteConfig } from "@/config/site";
import { copyVariantFromHeaders } from "@/lib/analytics/copy-variant";
import { MAX_GATED_BODY_BYTES, createCheckoutSchema } from "@/lib/payments/checkout-payload";
import { buildCheckoutMetadata } from "@/lib/payments/entitlement";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { isStripeReady, lineItem, stripe } from "@/lib/payments/stripe";
import { logEvent, logFailure } from "@/lib/security/logging";
import { isAllowedOrigin, isJsonRequest, readJsonBody, requestOrigin } from "@/lib/security/origin";
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
 * `POST /api/checkout`
 *
 * Creates the one-time Stripe Checkout Session for a verified conversion pack.
 *
 * The paywall cannot be reached for a pack that is incomplete, ambiguous, or rejected:
 * the route opens the sealed envelope, re-runs completeness, source mapping, running-
 * balance, and aggregate checks, and refuses unless every included file is
 * `verification_passed`. Session metadata carries the pack digest and coarse counts —
 * never a balance, a description, a date from the statement, a bank name, or a filename.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return errorResponse("forbidden", 403, "This request did not come from an allowed origin.");
  }
  if (!isJsonRequest(request)) {
    return errorResponse("bad_request", 415, "Expected a JSON request body.");
  }
  if (!isStripeReady() && !mockPaymentsEnabled()) {
    return errorResponse(
      "internal_error",
      503,
      "Payments are not configured on this deployment yet.",
    );
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

  const parsed = createCheckoutSchema.safeParse(body.value);
  if (!parsed.success) {
    return errorResponse("bad_request", 400, "The request payload was not in the expected shape.");
  }

  const { jobId, digest, sealed, pageCount, fileCount } = parsed.data;

  const opened = await openSealedResult(sealed, digest);
  if (!opened.ok) {
    logEvent("checkout_refused", { reason: opened.reason });
    const message =
      opened.reason === "not_reconciled"
        ? "This conversion has not been verified, so it cannot be purchased."
        : "This conversion could not be confirmed. Please run the conversion again.";
    return errorResponse("forbidden", 409, message);
  }

  const packPages = opened.files.reduce((sum, file) => sum + file.pageCount, 0);
  const packRows = opened.files.reduce((sum, file) => sum + file.statement.transactions.length, 0);
  const packFiles = opened.files.length;
  if (pageCount !== packPages || (fileCount !== undefined && fileCount !== packFiles)) {
    logEvent("checkout_refused", { reason: "count_mismatch" });
    return errorResponse(
      "forbidden",
      409,
      "This conversion could not be confirmed. Please run the conversion again.",
    );
  }

  const origin = requestOrigin(request);

  if (mockPaymentsEnabled()) {
    // The end-to-end suite has to be able to walk the whole funnel, including the export
    // gate, without a Stripe account. This branch is unreachable unless APP_ENV=test and
    // NODE_ENV is not production, and the mock reference still encodes the digest, so the
    // gate is genuinely exercised rather than bypassed.
    const sessionId = `cs_mock_${digest}`;
    logEvent("checkout_started", {
      mock: true,
      pageCount,
      copyVariant: copyVariantFromHeaders(request.headers),
    });
    return jsonResponse({
      url: `${origin}/checkout/success?session_id=${sessionId}`,
      sessionId,
    });
  }

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [lineItem()],
        // No customer object is created, so nothing is stored against a person.
        customer_creation: "if_required",
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel?job=${jobId}`,
        metadata: buildCheckoutMetadata({
          digest,
          jobId,
          pageCount: packPages,
          transactionCount: packRows,
          fileCount: packFiles,
        }),
        payment_intent_data: {
          description: `Verified Conversion Pack (${siteConfig.productVersion})`,
          metadata: { result_digest: digest },
        },
        automatic_tax: { enabled: false },
      },
      // Two clicks on the pay button must not create two sessions or two charges.
      { idempotencyKey: `checkout:${digest}:${jobId}` },
    );

    if (!session.url) {
      logEvent("checkout_no_url");
      return errorResponse("internal_error", 502, "Stripe did not return a checkout URL.");
    }

    logEvent("checkout_started", {
      pageCount: packPages,
      transactionCount: packRows,
      fileCount: packFiles,
      statementType: opened.statement.statementType,
      method: opened.reconciliation.method,
      copyVariant: copyVariantFromHeaders(request.headers),
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error) {
    const stripeError = error as {
      type?: unknown;
      code?: unknown;
      statusCode?: unknown;
      param?: unknown;
    };
    logFailure("checkout_failed", error, {
      route: "checkout",
      stripeType: typeof stripeError.type === "string" ? stripeError.type : undefined,
      stripeCode: typeof stripeError.code === "string" ? stripeError.code : undefined,
      stripeStatus: typeof stripeError.statusCode === "number" ? stripeError.statusCode : undefined,
      stripeParam: typeof stripeError.param === "string" ? stripeError.param : undefined,
    });
    return errorResponse("internal_error", 502, "Checkout could not be started. Please try again.");
  }
}

export function GET(): Response {
  return errorResponse("method_not_allowed", 405, "Use POST.");
}
