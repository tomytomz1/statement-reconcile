import type Stripe from "stripe";

import { serverEnv } from "@/config/env";
import { CHECKOUT_METADATA_KEYS } from "@/lib/payments/entitlement";
import { isStripeReady, stripe } from "@/lib/payments/stripe";
import { logEvent, logFailure } from "@/lib/security/logging";
import { errorResponse, jsonResponse } from "@/lib/security/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/stripe/webhook`
 *
 * The webhook exists for observability and for reacting to disputes. It deliberately does
 * not grant entitlement: `/api/export` re-reads the session from Stripe on every download,
 * so a delayed, dropped, or replayed webhook cannot make a paid download fail or an unpaid
 * one succeed. That means there is no delivery-ordering problem to get wrong.
 *
 * The raw body is read as text because signature verification is computed over the exact
 * bytes Stripe sent; parsing first would invalidate it. An unsigned or badly signed request
 * is rejected before anything is read out of it.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = serverEnv().STRIPE_WEBHOOK_SECRET;
  if (!isStripeReady() || !secret) {
    // 503 rather than 200: Stripe should keep retrying until the deployment is configured.
    return errorResponse("internal_error", 503, "Webhooks are not configured.");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return errorResponse("bad_request", 400, "Missing signature.");

  const payload = await request.text();
  if (payload.length > 1_000_000) return errorResponse("payload_too_large", 413);

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    logEvent("webhook_signature_invalid");
    return errorResponse("forbidden", 400, "Signature verification failed.");
  }

  try {
    handleEvent(event);
  } catch (error) {
    // Never fail the webhook because of our own logging: Stripe would retry indefinitely
    // for an event that is already irrelevant to entitlement.
    logFailure("webhook_handler_error", error, { type: event.type });
  }

  return jsonResponse({ received: true });
}

function handleEvent(event: Stripe.Event): void {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      logEvent("payment_completed", {
        livemode: event.livemode,
        currency: session.currency,
        amountTotal: session.amount_total,
        pageCount: session.metadata?.[CHECKOUT_METADATA_KEYS.pageCount] ?? null,
        transactionCount: session.metadata?.[CHECKOUT_METADATA_KEYS.transactionCount] ?? null,
        productVersion: session.metadata?.[CHECKOUT_METADATA_KEYS.productVersion] ?? null,
        // The digest is a hash of the statement, not the statement, but there is no reason
        // to keep it in logs either, so only its prefix is recorded for correlation.
        digestPrefix: session.metadata?.[CHECKOUT_METADATA_KEYS.digest]?.slice(0, 8) ?? null,
      });
      break;
    }
    case "checkout.session.expired":
      logEvent("checkout_expired", { livemode: event.livemode });
      break;
    case "charge.refunded":
      logEvent("payment_refunded", { livemode: event.livemode });
      break;
    case "charge.dispute.created":
      // Worth surfacing loudly: a dispute on a $19 one-time charge usually means the
      // conversion was wrong in a way reconciliation did not catch.
      logEvent("payment_disputed", { livemode: event.livemode });
      break;
    default:
      logEvent("webhook_ignored", { type: event.type });
  }
}

export function GET(): Response {
  return errorResponse("method_not_allowed", 405, "Use POST.");
}
