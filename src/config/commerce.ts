/**
 * The commercial contract. One definition, no environment overrides.
 *
 * The amount a visitor reads, the amount encoded in JSON-LD, the amount Stripe charges, and
 * the page cap all resolve here. That matters because these used to be independent: the
 * public figure came from `NEXT_PUBLIC_PRICE_USD` at build time while the live charge came
 * from a Stripe dashboard Price, so a deployment could advertise one amount and bill
 * another with nothing in the system objecting.
 *
 * The values are deliberately literals rather than environment reads. An environment
 * variable is exactly the mechanism by which the two could drift, so the price is a code
 * change, reviewed and tested, or it is not a change at all.
 *
 * When `STRIPE_PRICE_ID` is configured, the dashboard Price is not trusted either — it is
 * retrieved and checked against this contract before a Checkout Session is created, and the
 * completed session is checked again before anything is exported. See
 * `assertStripePriceMatchesOffer` and `verifyEntitlement`.
 */

/** Server-authoritative. Never send this object to the browser wholesale. */
export const COMMERCIAL_OFFER = {
  productName: "Verified Conversion Pack",
  /** Minor units, matching Stripe's `unit_amount` and `amount_total`. */
  amountCents: 1900,
  /** Lowercase, matching Stripe's `currency` on both Price and Session. */
  currency: "usd",
  /** Stripe `price.type`. A recurring Price would be a subscription, which we do not sell. */
  billing: "one_time",
  /** Combined page ceiling for a single pack, at this price. */
  maxTotalPages: 50,
  /**
   * Per-file ceiling for an original PDF, in megabytes.
   *
   * Enforced in the browser and only in the browser, because the original PDF bytes never
   * reach the server — that is the privacy design, not an oversight. The server bounds what
   * it actually receives: extracted-text body bytes, page count, item count, and character
   * count. Any copy claiming a server-side byte check is false.
   *
   * Code-owned like the price. It was environment-adjustable, which meant the uploader could
   * advertise one ceiling while a test asserted another.
   */
  maxFileSizeMb: 20,
} as const;

export type CommercialOffer = typeof COMMERCIAL_OFFER;

/** Whole currency units, for display only. Exact because the amount is a whole number. */
export const OFFER_AMOUNT_MAJOR = COMMERCIAL_OFFER.amountCents / 100;

/** `$19`. Built from the authoritative amount so it cannot be typed in by hand. */
export const OFFER_PRICE_DISPLAY = `$${OFFER_AMOUNT_MAJOR}`;

/**
 * The safe public projection.
 *
 * Only these strings are allowed into rendered output. Components must not reach for
 * `COMMERCIAL_OFFER` directly — a component that reads `amountCents` is one refactor away
 * from rendering `1900`.
 */
export const publicOffer = {
  productName: COMMERCIAL_OFFER.productName,
  display: OFFER_PRICE_DISPLAY,
  amountMajor: OFFER_AMOUNT_MAJOR,
  currencyDisplay: COMMERCIAL_OFFER.currency.toUpperCase(),
  maxTotalPages: COMMERCIAL_OFFER.maxTotalPages,
  maxFileSizeMb: COMMERCIAL_OFFER.maxFileSizeMb,

  /**
   * The sentence form, for prose and meta descriptions.
   *
   * "Only if your pack passes" is the honest framing: checkout opens after verification,
   * and the amount is known before a file is chosen. Copy that says the charge is revealed
   * after verification is stale and is rejected by `tests/unit/claims.test.ts`.
   */
  longForm: `Free to verify. ${OFFER_PRICE_DISPLAY} only if your pack passes. No subscription.`,

  /** The strip form, for CTAs and microcopy. */
  compactForm: `Verify free · ${OFFER_PRICE_DISPLAY} only if your pack passes · No subscription`,

  /** The converter form. Adds "no signup" because that is the objection at the uploader. */
  uploaderForm: `Verify free · ${OFFER_PRICE_DISPLAY} only if your pack passes · No signup · No subscription`,
} as const;

/** Shape of a Stripe Price, narrowed to what the contract cares about. */
export type PriceLikeForCheck = {
  id?: string | null;
  active?: boolean | null;
  type?: string | null;
  unit_amount?: number | null;
  currency?: string | null;
  recurring?: unknown;
};

export type OfferMismatch =
  | "price_not_found"
  | "price_inactive"
  | "price_recurring"
  | "price_wrong_amount"
  | "price_wrong_currency"
  | "price_unexpected_id";

/**
 * Check a Stripe Price against the contract.
 *
 * Pure and synchronous so it can be unit-tested against every failure shape without a
 * network or a Stripe account. The caller does the retrieval.
 */
export function matchOfferAgainstPrice(
  price: PriceLikeForCheck | null | undefined,
  expectedPriceId: string | undefined,
): { ok: true } | { ok: false; reason: OfferMismatch } {
  if (!price || typeof price !== "object") return { ok: false, reason: "price_not_found" };

  if (expectedPriceId && price.id !== expectedPriceId) {
    return { ok: false, reason: "price_unexpected_id" };
  }
  if (price.active !== true) return { ok: false, reason: "price_inactive" };
  if (price.type !== "one_time" || price.recurring) {
    return { ok: false, reason: "price_recurring" };
  }
  if (price.unit_amount !== COMMERCIAL_OFFER.amountCents) {
    return { ok: false, reason: "price_wrong_amount" };
  }
  if ((price.currency ?? "").toLowerCase() !== COMMERCIAL_OFFER.currency) {
    return { ok: false, reason: "price_wrong_currency" };
  }
  return { ok: true };
}

export type SessionTermsMismatch = "session_wrong_amount" | "session_wrong_currency";

/**
 * Check a completed Checkout Session's commercial terms against the contract.
 *
 * `payment_status` and the digest are checked separately; this is only about money. It runs
 * before export so that a session which was somehow paid at the wrong amount cannot be
 * redeemed for files, even though it says "paid".
 */
export function matchOfferAgainstSessionTerms(session: {
  amount_total?: number | null;
  currency?: string | null;
}): { ok: true } | { ok: false; reason: SessionTermsMismatch } {
  if (session.amount_total !== COMMERCIAL_OFFER.amountCents) {
    return { ok: false, reason: "session_wrong_amount" };
  }
  if ((session.currency ?? "").toLowerCase() !== COMMERCIAL_OFFER.currency) {
    return { ok: false, reason: "session_wrong_currency" };
  }
  return { ok: true };
}
