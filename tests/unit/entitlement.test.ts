import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/config/env";
import { timingSafeEqualHex } from "@/lib/crypto/digest";
import {
  ENTITLEMENT_TTL_MS,
  buildCheckoutMetadata,
  isWithinEntitlementWindow,
  looksLikeSessionId,
  paidDigestForSession,
  verifyEntitlement,
  type Entitlement,
} from "@/lib/payments/entitlement";

const DIGEST = "ab".repeat(32);
const OTHER = "cd".repeat(32);

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    sessionId: "cs_test_abcdefghij",
    digest: DIGEST,
    jobId: "job",
    paidAt: Date.now(),
    amountTotal: 1900,
    currency: "usd",
    livemode: false,
    ...overrides,
  };
}

describe("looksLikeSessionId", () => {
  beforeEach(() => {
    process.env.APP_ENV = "test";
    process.env.E2E_MOCK_PAYMENTS = "1";
    resetServerEnvCache();
  });

  afterEach(() => {
    resetServerEnvCache();
  });

  it("accepts Stripe test and live ids and mock ids in test", () => {
    expect(looksLikeSessionId("cs_test_abcdefghij")).toBe(true);
    expect(looksLikeSessionId("cs_live_abcdefghij")).toBe(true);
    expect(looksLikeSessionId(`cs_mock_${DIGEST}`)).toBe(true);
  });

  it("rejects values that are not session ids", () => {
    expect(looksLikeSessionId("not-a-session")).toBe(false);
    expect(looksLikeSessionId("cs_test_short")).toBe(false);
    expect(looksLikeSessionId(12)).toBe(false);
    expect(looksLikeSessionId(null)).toBe(false);
  });
});

describe("buildCheckoutMetadata", () => {
  it("rejects a non-digest", () => {
    expect(() =>
      buildCheckoutMetadata({
        digest: "not-a-digest",
        jobId: "a".repeat(32),
        pageCount: 1,
        transactionCount: 1,
      }),
    ).toThrow(/digest/i);
  });
});

describe("timing-safe digest comparison", () => {
  it("matches equal hex and rejects mismatches", () => {
    expect(timingSafeEqualHex(DIGEST, DIGEST)).toBe(true);
    expect(timingSafeEqualHex(DIGEST, OTHER)).toBe(false);
    expect(timingSafeEqualHex(DIGEST, DIGEST.slice(0, 32))).toBe(false);
  });
});

describe("mock entitlement", () => {
  beforeEach(() => {
    process.env.APP_ENV = "test";
    process.env.E2E_MOCK_PAYMENTS = "1";
    resetServerEnvCache();
  });

  afterEach(() => {
    resetServerEnvCache();
  });

  it("matches a mock session to its encoded digest", async () => {
    const result = await verifyEntitlement(`cs_mock_${DIGEST}`, DIGEST);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.entitlement.digest).toBe(DIGEST);

    const paid = await paidDigestForSession(`cs_mock_${DIGEST}`);
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(paid.digest).toBe(DIGEST);
  });

  it("rejects a digest mismatch on a mock session", async () => {
    const result = await verifyEntitlement(`cs_mock_${DIGEST}`, OTHER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("digest_mismatch");
  });
});

describe("isWithinEntitlementWindow", () => {
  it("allows 30 days and refuses after", () => {
    const now = Date.parse("2026-08-24T12:00:00Z");
    expect(isWithinEntitlementWindow(entitlement({ paidAt: now }), now)).toBe(true);
    expect(isWithinEntitlementWindow(entitlement({ paidAt: now - ENTITLEMENT_TTL_MS }), now)).toBe(
      true,
    );
    expect(
      isWithinEntitlementWindow(entitlement({ paidAt: now - ENTITLEMENT_TTL_MS - 1 }), now),
    ).toBe(false);
    expect(isWithinEntitlementWindow(entitlement({ paidAt: null }), now)).toBe(true);
  });
});
