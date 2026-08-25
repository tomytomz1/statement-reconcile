import Stripe from "stripe";

import {
  COMMERCIAL_OFFER,
  matchOfferAgainstPrice,
  type OfferMismatch,
  type PriceLikeForCheck,
} from "@/config/commerce";
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
 * latency-sensitive step in the funnel, so a passing check is cached — but only briefly,
 * and the bound matters.
 *
 * Stripe does not allow a Price's amount or currency to be edited, only deactivated and
 * replaced, so a Price that passed cannot silently become a different amount. It can,
 * however, be deactivated. Caching a success indefinitely would mean an instance that
 * checked once keeps creating sessions against a Price that is no longer valid until it
 * recycles, which on serverless is an unbounded and invisible window.
 *
 * A short TTL keeps the round trip off nearly every checkout while bounding that window to
 * something a person could reason about. Failures are never cached at all.
 *
 * The backstop is independent of this cache: `matchOfferAgainstSessionTerms` re-checks the
 * amount and currency of the completed session on every export, and is not memoized.
 */
const PRICE_CHECK_TTL_MS = 5 * 60 * 1000;

let priceCheck: { ok: true; checkedAt: number } | null = null;

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
export type PriceCheckResult =
  { ok: true } | { ok: false; reason: OfferMismatch | "price_lookup_failed" };

/**
 * How the Price is fetched, and how "now" is read.
 *
 * Injected rather than reached for so the cache boundary and every failure shape can be
 * driven deterministically in a unit test. Production supplies neither and gets the real
 * Stripe client and clock.
 */
export type PriceCheckDeps = {
  retrievePrice?: (priceId: string) => Promise<PriceLikeForCheck>;
  now?: () => number;
};

export async function assertStripePriceMatchesOffer(
  deps: PriceCheckDeps = {},
): Promise<PriceCheckResult> {
  const priceId = serverEnv().STRIPE_PRICE_ID;

  // No dashboard Price means the inline `price_data` above is authoritative, and it is
  // built from the contract, so there is nothing external to disagree with.
  if (!priceId) return { ok: true };

  const now = deps.now ?? Date.now;
  const retrieve = deps.retrievePrice ?? ((id: string) => stripe().prices.retrieve(id));

  if (priceCheck && now() - priceCheck.checkedAt < PRICE_CHECK_TTL_MS) {
    return { ok: true };
  }

  let price: PriceLikeForCheck;
  try {
    price = await retrieve(priceId);
  } catch {
    // A lookup failure is not a pass. It also must not leave an older pass usable, or a
    // Stripe outage would extend a stale success for the rest of the TTL.
    priceCheck = null;
    return { ok: false, reason: "price_lookup_failed" };
  }

  const result = matchOfferAgainstPrice(price, priceId);
  if (!result.ok) {
    // A previously cached pass must not outlive a Price that has stopped matching.
    priceCheck = null;
    return result;
  }

  priceCheck = { ok: true, checkedAt: now() };
  return { ok: true };
}
