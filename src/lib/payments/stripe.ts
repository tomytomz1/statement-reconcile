import Stripe from "stripe";

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
 * A configured Price is preferred so the amount can be changed in the Stripe dashboard.
 * Without one, an inline price is built from the site config, which keeps local
 * development working with nothing but a secret key.
 */
export function lineItem(): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = serverEnv().STRIPE_PRICE_ID;
  if (priceId) return { price: priceId, quantity: 1 };

  return {
    quantity: 1,
    price_data: {
      currency: siteConfig.price.currency.toLowerCase(),
      unit_amount: siteConfig.price.amountCents,
      product_data: {
        name: "Verified Conversion Pack — up to 50 total pages",
        description: `One or more PDF statements converted to Excel, CSV, and verification reports, up to ${siteConfig.limits.maxPages} total pages.`,
      },
    },
  };
}
