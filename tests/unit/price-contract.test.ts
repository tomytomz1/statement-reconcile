import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { COMMERCIAL_OFFER, type PriceLikeForCheck } from "@/config/commerce";
import { resetServerEnvCache } from "@/config/env";
import { assertStripePriceMatchesOffer, resetPriceCheck } from "@/lib/payments/stripe";

/**
 * The Stripe Price gate, driven deterministically.
 *
 * `assertStripePriceMatchesOffer` fails checkout closed unless the configured Price is
 * exactly the offer. That makes it the single most consequential piece of logic added in
 * this pass — a false negative takes checkout down for every customer, and a false positive
 * lets the site advertise one amount while Stripe bills another.
 *
 * Retrieval and the clock are injected so every branch, including the cache boundary, runs
 * without a Stripe account or a real timer.
 */

const PRICE_ID = "price_live_expected";

const MATCHING: PriceLikeForCheck = {
  id: PRICE_ID,
  active: true,
  type: "one_time",
  unit_amount: 1900,
  currency: "usd",
};

const mutableEnv = process.env as Record<string, string | undefined>;
const originalPriceId = process.env.STRIPE_PRICE_ID;

function configurePriceId(value: string | undefined): void {
  if (value === undefined) delete mutableEnv.STRIPE_PRICE_ID;
  else mutableEnv.STRIPE_PRICE_ID = value;
  resetServerEnvCache();
}

/** Counts calls so cache behaviour is observable rather than inferred. */
function retrieverFor(price: PriceLikeForCheck | Error) {
  let calls = 0;
  return {
    calls: () => calls,
    retrieve: async (): Promise<PriceLikeForCheck> => {
      calls += 1;
      if (price instanceof Error) throw price;
      return price;
    },
  };
}

beforeEach(() => {
  resetPriceCheck();
  configurePriceId(PRICE_ID);
});

afterEach(() => {
  resetPriceCheck();
  configurePriceId(originalPriceId);
});

describe("a matching Price passes", () => {
  it("accepts an active, one-time, 1900 USD Price with the expected id", async () => {
    const stripe = retrieverFor(MATCHING);
    const result = await assertStripePriceMatchesOffer({ retrievePrice: stripe.retrieve });
    expect(result).toEqual({ ok: true });
  });

  it("passes without any lookup when no Price ID is configured", async () => {
    // Inline `price_data` is built from the contract, so there is nothing external to check.
    configurePriceId(undefined);
    const stripe = retrieverFor(MATCHING);
    const result = await assertStripePriceMatchesOffer({ retrievePrice: stripe.retrieve });
    expect(result).toEqual({ ok: true });
    expect(stripe.calls()).toBe(0);
  });
});

describe("a mismatching Price fails closed", () => {
  const cases: Array<[string, PriceLikeForCheck, string]> = [
    ["inactive", { ...MATCHING, active: false }, "price_inactive"],
    [
      "recurring",
      { ...MATCHING, type: "recurring", recurring: { interval: "month" } },
      "price_recurring",
    ],
    ["wrong id", { ...MATCHING, id: "price_some_other_product" }, "price_unexpected_id"],
    ["wrong amount", { ...MATCHING, unit_amount: 2900 }, "price_wrong_amount"],
    ["wrong currency", { ...MATCHING, currency: "eur" }, "price_wrong_currency"],
  ];

  for (const [label, price, reason] of cases) {
    it(`rejects a ${label} Price`, async () => {
      const stripe = retrieverFor(price);
      const result = await assertStripePriceMatchesOffer({ retrievePrice: stripe.retrieve });
      expect(result).toEqual({ ok: false, reason });
    });
  }

  it("fails closed when the lookup itself throws", async () => {
    // A Stripe outage must not be read as approval.
    const stripe = retrieverFor(new Error("network"));
    const result = await assertStripePriceMatchesOffer({ retrievePrice: stripe.retrieve });
    expect(result).toEqual({ ok: false, reason: "price_lookup_failed" });
  });
});

describe("the success cache is bounded and cannot go stale", () => {
  const TTL_MS = 5 * 60 * 1000;

  it("does not re-retrieve inside the window", async () => {
    const stripe = retrieverFor(MATCHING);
    let now = 1_000_000;
    const deps = { retrievePrice: stripe.retrieve, now: () => now };

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });
    now += TTL_MS - 1;
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });

    expect(stripe.calls()).toBe(1);
  });

  it("re-retrieves at the documented boundary", async () => {
    const stripe = retrieverFor(MATCHING);
    let now = 1_000_000;
    const deps = { retrievePrice: stripe.retrieve, now: () => now };

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });
    now += TTL_MS;
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });

    expect(stripe.calls()).toBe(2);
  });

  it("stops passing once the Price stops matching, after the window", async () => {
    // The failure this guards: a Price deactivated in the dashboard while a warm instance
    // keeps creating sessions against it.
    let current: PriceLikeForCheck = MATCHING;
    let now = 1_000_000;
    const deps = {
      retrievePrice: async () => current,
      now: () => now,
    };

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });

    current = { ...MATCHING, active: false };
    now += TTL_MS;

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({
      ok: false,
      reason: "price_inactive",
    });
  });

  it("does not leave a usable cached success behind a failure", async () => {
    let current: PriceLikeForCheck = MATCHING;
    let now = 1_000_000;
    const deps = { retrievePrice: async () => current, now: () => now };

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });

    current = { ...MATCHING, unit_amount: 100 };
    now += TTL_MS;
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({
      ok: false,
      reason: "price_wrong_amount",
    });

    // Immediately afterwards, still inside what would have been the original window: the
    // failure must have cleared the cached pass rather than sitting in front of it.
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({
      ok: false,
      reason: "price_wrong_amount",
    });
  });

  it("does not let a lookup failure extend an earlier success", async () => {
    let shouldThrow = false;
    let now = 1_000_000;
    const deps = {
      retrievePrice: async (): Promise<PriceLikeForCheck> => {
        if (shouldThrow) throw new Error("network");
        return MATCHING;
      },
      now: () => now,
    };

    expect(await assertStripePriceMatchesOffer(deps)).toEqual({ ok: true });

    shouldThrow = true;
    now += TTL_MS;
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({
      ok: false,
      reason: "price_lookup_failed",
    });

    // Still failing on the next call, rather than falling back to the stale pass.
    expect(await assertStripePriceMatchesOffer(deps)).toEqual({
      ok: false,
      reason: "price_lookup_failed",
    });
  });

  it("resetPriceCheck forces a fresh retrieval", async () => {
    const stripe = retrieverFor(MATCHING);
    const deps = { retrievePrice: stripe.retrieve, now: () => 1_000_000 };

    await assertStripePriceMatchesOffer(deps);
    resetPriceCheck();
    await assertStripePriceMatchesOffer(deps);

    expect(stripe.calls()).toBe(2);
  });
});

describe("the gate checks the contract, not a copy of it", () => {
  it("would reject the contract amount if it were ever changed independently", () => {
    // Guards against someone "fixing" a failing test by editing the expected amount here
    // instead of the contract.
    expect(COMMERCIAL_OFFER.amountCents).toBe(1900);
    expect(MATCHING.unit_amount).toBe(COMMERCIAL_OFFER.amountCents);
    expect(MATCHING.currency).toBe(COMMERCIAL_OFFER.currency);
  });
});
