import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as verify } from "@/app/api/checkout/verify/route";
import { COMMERCIAL_OFFER } from "@/config/commerce";
import { resetServerEnvCache } from "@/config/env";
import {
  CHECKOUT_METADATA_KEYS,
  ENTITLEMENT_TTL_MS,
  authorizeSession,
  paidDigestForSession,
} from "@/lib/payments/entitlement";
import { resetStripeClient, stripe } from "@/lib/payments/stripe";
import { resetMemoryRateLimits } from "@/lib/security/rate-limit";

/**
 * Recovery authorization, driven through the real function and the real route.
 *
 * `paidDigestForSession` used to check only `payment_status === "paid"` and the presence of
 * a digest. Export checks considerably more. That gap had a concrete customer consequence:
 * `/api/checkout/verify` would report a session as recoverable, the browser would tell the
 * customer their payment was found, and export would then refuse — for a reason the customer
 * had already been told did not apply.
 *
 * These drive wrong amount, wrong currency, unpaid, missing digest, and expired sessions
 * through the actual entitlement function and the actual route, not through the pure
 * `matchOfferAgainstSessionTerms` helper, which was already covered and was never the gap.
 */

const DIGEST = "c".repeat(64);
const SESSION_ID = "cs_test_" + "d".repeat(24);
const VERIFY_URL = `http://localhost:3000/api/checkout/verify?session_id=${SESSION_ID}`;

type SessionShape = {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  created: number;
  livemode: boolean;
  metadata: Record<string, string>;
};

function sessionOf(overrides: Partial<SessionShape> = {}): SessionShape {
  return {
    id: SESSION_ID,
    payment_status: "paid",
    amount_total: COMMERCIAL_OFFER.amountCents,
    currency: COMMERCIAL_OFFER.currency,
    created: Math.floor(Date.now() / 1000),
    livemode: true,
    metadata: {
      [CHECKOUT_METADATA_KEYS.digest]: DIGEST,
      [CHECKOUT_METADATA_KEYS.jobId]: "a".repeat(32),
    },
    ...overrides,
  };
}

/** Narrowly mock only the one Stripe call these paths make. */
function mockSession(session: SessionShape | Error): void {
  const client = stripe();
  vi.spyOn(client.checkout.sessions, "retrieve").mockImplementation(async () => {
    if (session instanceof Error) throw session;
    return session as never;
  });
}

beforeEach(() => {
  resetMemoryRateLimits();
  // A live-shaped key so `stripeConfigured()` is true; no network call is made because the
  // single retrieval these paths perform is mocked.
  process.env.STRIPE_SECRET_KEY = "sk_test_recovery_authorization_fixture";
  resetServerEnvCache();
  resetStripeClient();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetMemoryRateLimits();
  delete process.env.STRIPE_SECRET_KEY;
  resetServerEnvCache();
  resetStripeClient();
});

describe("authorizeSession", () => {
  it("authorizes a paid session at the contracted terms", async () => {
    mockSession(sessionOf());
    const result = await authorizeSession(SESSION_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entitlement.digest).toBe(DIGEST);
  });

  it("refuses an unpaid session", async () => {
    mockSession(sessionOf({ payment_status: "unpaid" }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "not_paid" });
  });

  it("refuses a paid session at the wrong amount", async () => {
    mockSession(sessionOf({ amount_total: 100 }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "terms_mismatch" });
  });

  it("refuses a paid session in the wrong currency", async () => {
    mockSession(sessionOf({ currency: "eur" }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "terms_mismatch" });
  });

  it("refuses a session with no digest in metadata", async () => {
    mockSession(sessionOf({ metadata: {} }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "no_digest" });
  });

  it("refuses a session with a malformed digest", async () => {
    mockSession(sessionOf({ metadata: { [CHECKOUT_METADATA_KEYS.digest]: "not-a-digest" } }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "no_digest" });
  });

  it("refuses a session past the 30-day entitlement window", async () => {
    const expiredAt = Date.now() - ENTITLEMENT_TTL_MS - 60_000;
    mockSession(sessionOf({ created: Math.floor(expiredAt / 1000) }));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "expired" });
  });

  it("still authorizes a session just inside the window", async () => {
    const nearlyExpired = Date.now() - ENTITLEMENT_TTL_MS + 60_000;
    mockSession(sessionOf({ created: Math.floor(nearlyExpired / 1000) }));
    expect((await authorizeSession(SESSION_ID)).ok).toBe(true);
  });

  it("refuses when the session cannot be retrieved", async () => {
    mockSession(new Error("no such session"));
    expect(await authorizeSession(SESSION_ID)).toEqual({ ok: false, reason: "session_not_found" });
  });
});

describe("paidDigestForSession applies the same conditions as export", () => {
  const rejected: Array<[string, SessionShape, string]> = [
    ["unpaid", sessionOf({ payment_status: "unpaid" }), "not_paid"],
    ["wrong amount", sessionOf({ amount_total: 100 }), "terms_mismatch"],
    ["wrong currency", sessionOf({ currency: "gbp" }), "terms_mismatch"],
    ["missing digest", sessionOf({ metadata: {} }), "no_digest"],
    [
      "expired",
      sessionOf({ created: Math.floor((Date.now() - ENTITLEMENT_TTL_MS - 60_000) / 1000) }),
      "expired",
    ],
  ];

  for (const [label, session, reason] of rejected) {
    it(`does not report a ${label} session as recoverable`, async () => {
      mockSession(session);
      expect(await paidDigestForSession(SESSION_ID)).toEqual({ ok: false, reason });
    });
  }

  it("returns the digest for a fully valid session", async () => {
    mockSession(sessionOf());
    expect(await paidDigestForSession(SESSION_ID)).toEqual({ ok: true, digest: DIGEST });
  });
});

describe("GET /api/checkout/verify", () => {
  it("reports paid with the digest for a valid session", async () => {
    mockSession(sessionOf());
    const response = await verify(new Request(VERIFY_URL));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paid: true, digest: DIGEST });
  });

  it("does not report paid for a session at the wrong amount", async () => {
    // The route is the surface the browser actually calls, so the regression has to be
    // caught here and not only one layer down.
    mockSession(sessionOf({ amount_total: 4900 }));
    const response = await verify(new Request(VERIFY_URL));
    const body = (await response.json()) as { paid: boolean; digest?: string };
    expect(body.paid).toBe(false);
    expect(body.digest).toBeUndefined();
  });

  it("does not report paid for an expired session", async () => {
    mockSession(
      sessionOf({ created: Math.floor((Date.now() - ENTITLEMENT_TTL_MS - 1000) / 1000) }),
    );
    const body = (await verify(new Request(VERIFY_URL)).then((r) => r.json())) as {
      paid: boolean;
    };
    expect(body.paid).toBe(false);
  });

  it("never leaks the amount, currency, or metadata of a session", async () => {
    mockSession(sessionOf());
    const raw = await verify(new Request(VERIFY_URL)).then((r) => r.text());
    expect(raw).not.toContain(String(COMMERCIAL_OFFER.amountCents));
    expect(raw).not.toContain("livemode");
    expect(raw).not.toContain("jobId");
  });

  it("rejects a malformed session reference before calling Stripe", async () => {
    const client = stripe();
    const spy = vi.spyOn(client.checkout.sessions, "retrieve");
    const response = await verify(
      new Request("http://localhost:3000/api/checkout/verify?session_id=nonsense"),
    );
    expect(response.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
