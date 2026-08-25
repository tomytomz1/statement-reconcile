import { describe, expect, it } from "vitest";

import {
  COMMERCIAL_OFFER,
  matchOfferAgainstPrice,
  matchOfferAgainstSessionTerms,
  publicOffer,
} from "@/config/commerce";
import { siteConfig } from "@/config/site";
import { softwareApplicationSchema } from "@/lib/seo/structured-data";

/**
 * The commercial contract is the one place the amount is defined. These tests exist because
 * it previously was not: the public figure came from `NEXT_PUBLIC_PRICE_USD` at build time
 * and the charge came from a Stripe dashboard Price, so a deployment could advertise one
 * amount and bill another with nothing in the system objecting.
 */

const VALID_PRICE = {
  id: "price_live_expected",
  active: true,
  type: "one_time",
  unit_amount: 1900,
  currency: "usd",
} as const;

describe("commercial contract", () => {
  it("is the amount the product actually sells", () => {
    expect(COMMERCIAL_OFFER.amountCents).toBe(1900);
    expect(COMMERCIAL_OFFER.currency).toBe("usd");
    expect(COMMERCIAL_OFFER.billing).toBe("one_time");
    expect(COMMERCIAL_OFFER.maxTotalPages).toBe(50);
  });

  it("cannot be overridden by the environment", async () => {
    // The failure this guards against is a deployment publishing a different amount from
    // the one Stripe charges. Reading the module source is crude, but it is the only way to
    // assert the absence of an env read that a future edit might reintroduce.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../../src/config/commerce.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toMatch(/process\.env/);
  });

  it("projects a public form that never exposes minor units", () => {
    expect(publicOffer.display).toBe("$19");
    expect(publicOffer.amountMajor).toBe(19);
    expect(JSON.stringify(publicOffer)).not.toContain("1900");
  });

  it("keeps siteConfig in agreement with the contract", () => {
    expect(siteConfig.price.amountCents).toBe(COMMERCIAL_OFFER.amountCents);
    expect(siteConfig.price.display).toBe(publicOffer.display);
    expect(siteConfig.price.currency.toLowerCase()).toBe(COMMERCIAL_OFFER.currency);
    expect(siteConfig.limits.maxPages).toBe(COMMERCIAL_OFFER.maxTotalPages);
  });
});

describe("Stripe Price validation", () => {
  it("accepts the expected Price", () => {
    expect(matchOfferAgainstPrice(VALID_PRICE, "price_live_expected")).toEqual({ ok: true });
  });

  it("accepts a matching Price when no specific id is expected", () => {
    expect(matchOfferAgainstPrice(VALID_PRICE, undefined)).toEqual({ ok: true });
  });

  it("rejects a missing Price", () => {
    expect(matchOfferAgainstPrice(null, "price_live_expected")).toEqual({
      ok: false,
      reason: "price_not_found",
    });
  });

  it("rejects an unexpected Price ID", () => {
    expect(matchOfferAgainstPrice(VALID_PRICE, "price_something_else")).toEqual({
      ok: false,
      reason: "price_unexpected_id",
    });
  });

  it("rejects an inactive Price", () => {
    expect(
      matchOfferAgainstPrice({ ...VALID_PRICE, active: false }, "price_live_expected"),
    ).toEqual({ ok: false, reason: "price_inactive" });
  });

  it("rejects a recurring Price", () => {
    expect(
      matchOfferAgainstPrice(
        { ...VALID_PRICE, type: "recurring", recurring: { interval: "month" } },
        "price_live_expected",
      ),
    ).toEqual({ ok: false, reason: "price_recurring" });
  });

  it("rejects a one_time Price that still carries a recurring block", () => {
    expect(
      matchOfferAgainstPrice(
        { ...VALID_PRICE, recurring: { interval: "month" } },
        "price_live_expected",
      ),
    ).toEqual({ ok: false, reason: "price_recurring" });
  });

  it("rejects the wrong amount, in either direction", () => {
    for (const unit_amount of [1800, 2000, 0, 190_000]) {
      expect(
        matchOfferAgainstPrice({ ...VALID_PRICE, unit_amount }, "price_live_expected"),
      ).toEqual({ ok: false, reason: "price_wrong_amount" });
    }
  });

  it("rejects the wrong currency", () => {
    for (const currency of ["eur", "gbp", "cad"]) {
      expect(matchOfferAgainstPrice({ ...VALID_PRICE, currency }, "price_live_expected")).toEqual({
        ok: false,
        reason: "price_wrong_currency",
      });
    }
  });

  it("accepts an uppercase currency from the API", () => {
    expect(
      matchOfferAgainstPrice({ ...VALID_PRICE, currency: "USD" }, "price_live_expected"),
    ).toEqual({ ok: true });
  });
});

describe("paid session terms", () => {
  it("accepts a session at the contracted amount", () => {
    expect(matchOfferAgainstSessionTerms({ amount_total: 1900, currency: "usd" })).toEqual({
      ok: true,
    });
  });

  it("rejects a paid session at the wrong amount", () => {
    // "payment_status: paid" is checked separately. This is the case where the money is
    // real but is not the money we advertised.
    expect(matchOfferAgainstSessionTerms({ amount_total: 100, currency: "usd" })).toEqual({
      ok: false,
      reason: "session_wrong_amount",
    });
  });

  it("rejects a paid session in the wrong currency", () => {
    expect(matchOfferAgainstSessionTerms({ amount_total: 1900, currency: "eur" })).toEqual({
      ok: false,
      reason: "session_wrong_currency",
    });
  });

  it("rejects a session with no amount at all", () => {
    expect(matchOfferAgainstSessionTerms({ amount_total: null, currency: "usd" })).toEqual({
      ok: false,
      reason: "session_wrong_amount",
    });
  });
});

describe("published price agrees with the contract", () => {
  it("marks up the same amount in JSON-LD that the contract bills", () => {
    const node = softwareApplicationSchema() as {
      offers?: { price?: string; priceCurrency?: string };
    };
    expect(node.offers?.price).toBe(String(COMMERCIAL_OFFER.amountCents / 100));
    expect(node.offers?.priceCurrency?.toLowerCase()).toBe(COMMERCIAL_OFFER.currency);
  });

  it("states the same amount in every public copy form", () => {
    for (const form of [publicOffer.longForm, publicOffer.compactForm, publicOffer.uploaderForm]) {
      expect(form).toContain(publicOffer.display);
    }
  });
});
