import Stripe from "stripe";

import { COMMERCIAL_OFFER, matchOfferAgainstPrice, type OfferMismatch } from "@/config/commerce";
import { serverEnv, stripeConfigured } from "@/config/env";
import { siteConfig } from "@/config/site";

/**
 * Stripe client and product configuration.
 *
 * There is exactly one product: a single one-time charge for one verified conversion pack.
 * No subscriptions, no customer records, no saved payment methods.
 */

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = serverEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  if (!client) {
    client = new Stripe(key, {
      // Pinning avoids a silent behaviour change when Stripe ships a new default.
      apiVersion: "2026-07-29.dahlia",
      appInfo: { name: siteConfig.brandName, version: siteConfig.productVersion },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

/** Test helper: drop the memoized client after changing the environment. */
export function resetStripeClient(): void {
  client = null;
}

export function isStripeReady(): boolean {
  return stripeConfigured();
}

/**
 * The line item for a conversion.
 *
 * A configured Price is used when present so the dashboard remains the operational record.
 * It is not trusted on that basis alone — `assertStripePriceMatchesOffer` retrieves and
 * checks it against `COMMERCIAL_OFFER` before this is ever handed to Stripe.
 *
 * Without a Price ID, the line item is built inline from the same contract, which keeps
 * local development working with nothing but a secret key and cannot diverge by
 * construction.
 */
export function lineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = serverEnv().STRIPE_PRICE_ID;
  if (priceId) return { price: priceId, quantity: 1 };

  return {
    quantity: 1,
    price_data: {
      currency: COMMERCIAL_OFFER.currency,
      unit_amount: COMMERCIAL_OFFER.amountCents,
      product_data: {
        name: `${COMMERCIAL_OFFER.productName} — up to ${COMMERCIAL_OFFER.maxTotalPages} total pages`,
        description: `One or more PDF statements converted to Excel, CSV, and verification reports, up to ${COMMERCIAL_OFFER.maxTotalPages} total pages.`,
      },
    },
  };
}

/**
 * Cached result of the Price check.
 *
 * Retrieving the Price on every checkout would add a network round trip to the most
 * latency-sensitive step in the funnel. The Price is immutable in the ways that matter
 * here — Stripe does not allow a Price's amount or currency to be edited, only
 * deactivated and replaced — so a success is cached for the life of the process. A
 * failure is never cached, so deactivating a Price takes effect on the next request
 * rather than the next deploy.
 */
let priceCheck: { ok: true } | null = null;

/** Test helper: forget the cached Price check after changing the environment. */
export function resetPriceCheck(): void {
  priceCheck = null;
}

/**
 * Fail closed unless the configured Stripe Price is exactly the offer we advertise.
 *
 * Without this, the public price and the charge are two independent values in two systems
 * and nothing reconciles them. A dashboard edit, a copied Price ID from another product,
 * or a Price left in test mode would all quietly bill an amount the site never mentioned.
 *
 * Returns a reason rather than throwing so the route can log the category without leaking
 * configuration detail into an HTTP response.
 */
export async function assertStripePriceMatchesOffer(): Promise<
  { ok: true } | { ok: false; reason: OfferMismatch | "price_lookup_failed" }
> {
  const priceId = serverEnv().STRIPE_PRICE_ID;

  // No dashboard Price means the inline `price_data` above is authoritative, and it is
  // built from the contract, so there is nothing external to disagree with.
  if (!priceId) return { ok: true };

  if (priceCheck) return priceCheck;

  let price: Stripe.Price;
  try {
    price = await stripe().prices.retrieve(priceId);
  } catch {
    return { ok: false, reason: "price_lookup_failed" };
  }

  const result = matchOfferAgainstPrice(price, priceId);
  if (!result.ok) return result;

  priceCheck = { ok: true };
  return priceCheck;
}
