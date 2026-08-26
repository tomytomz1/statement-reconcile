/**
 * Read-only Stripe Price preflight.
 *
 * Answers one question without touching money: does the configured Stripe Price match the
 * commercial contract that the site advertises and that `assertStripePriceMatchesOffer`
 * enforces before every Checkout Session?
 *
 * This exists because that gate now fails checkout closed. A mismatch takes checkout down
 * for every customer, and without this the only way to discover one is a customer failing to
 * pay. Running this against production credentials converts that into a ten-second check.
 *
 * It performs a single `prices.retrieve`. It does **not** create a Checkout Session, a
 * PaymentIntent, a charge, or a refund, and it does not write anything to Stripe.
 *
 * Usage:
 *   STRIPE_SECRET_KEY='<live secret key>' STRIPE_PRICE_ID=price_... pnpm run price:preflight
 *
 * Output is limited to non-secret contract fields. The secret key is never printed, and the
 * Price ID is truncated, because this output is likely to be pasted into a ticket.
 */
import Stripe from "stripe";

import { COMMERCIAL_OFFER, matchOfferAgainstPrice } from "@/config/commerce";

function shortId(value: string): string {
  return value.length <= 14 ? value : `${value.slice(0, 10)}…${value.slice(-4)}`;
}

async function main(): Promise<void> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();

  console.log("contract:");
  console.log(`  product      ${COMMERCIAL_OFFER.productName}`);
  console.log(`  amount       ${COMMERCIAL_OFFER.amountCents} (minor units)`);
  console.log(`  currency     ${COMMERCIAL_OFFER.currency}`);
  console.log(`  billing      ${COMMERCIAL_OFFER.billing}`);
  console.log(`  max pages    ${COMMERCIAL_OFFER.maxTotalPages}`);
  console.log("");

  if (!secret) {
    console.log("skipped: STRIPE_SECRET_KEY is not set in this shell");
    console.log("         nothing was contacted; set it to run the live check");
    process.exitCode = 1;
    return;
  }

  if (!priceId) {
    // Not a failure. Without a dashboard Price, checkout builds the line item inline from
    // the contract above, so there is nothing external that could disagree with it.
    console.log("no STRIPE_PRICE_ID configured");
    console.log("checkout uses inline price_data built from the contract; nothing to verify");
    return;
  }

  const stripe = new Stripe(secret, { apiVersion: "2026-07-29.dahlia", maxNetworkRetries: 2 });

  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    // Deliberately not printing the error: a Stripe error can echo the key prefix.
    console.log(`FAIL: could not retrieve price ${shortId(priceId)}`);
    process.exitCode = 1;
    return;
  }

  console.log("configured price:");
  console.log(`  id           ${shortId(price.id)}`);
  console.log(`  active       ${price.active}`);
  console.log(`  type         ${price.type}`);
  console.log(`  recurring    ${price.recurring ? "present" : "null"}`);
  console.log(`  unit_amount  ${price.unit_amount}`);
  console.log(`  currency     ${price.currency}`);
  console.log(`  livemode     ${price.livemode}`);
  console.log("");

  const result = matchOfferAgainstPrice(price, priceId);
  if (!result.ok) {
    console.log(`FAIL: ${result.reason}`);
    console.log("checkout will refuse to create a session while this holds");
    process.exitCode = 1;
    return;
  }

  // `livemode` is reported rather than enforced: the same check is expected to pass against
  // a test-mode Price during development, and only production should be livemode.
  if (!price.livemode) {
    console.log("PASS (test mode): the price matches the contract but is not a live price");
    return;
  }

  console.log("PASS: the live price matches the contract");
}

void main().catch(() => {
  console.error("price preflight could not complete");
  process.exitCode = 1;
});
