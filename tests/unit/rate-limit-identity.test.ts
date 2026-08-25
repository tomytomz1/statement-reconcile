import { afterEach, describe, expect, it } from "vitest";

import { rateLimitIdentityPerSession, resetServerEnvCache } from "@/config/env";
import { clientIdentity } from "@/lib/security/rate-limit";

/**
 * Regression: every Playwright browser context reaches the dev server over loopback, and
 * Next stamps `x-forwarded-for` with that one socket address. Preferring the IP therefore
 * gave the whole end-to-end suite a single rate-limit window — shared across workers,
 * projects, and consecutive runs against a surviving dev server — so tests spent each
 * other's budget and the multi-file pack test intermittently saw 429 from `POST /api/pack`.
 */

const names = ["APP_ENV", "NODE_ENV", "E2E_ISOLATE_RATE_LIMIT"] as const;
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

// NODE_ENV is typed as read-only, but both guards read it at runtime, so the tests have to
// set it the same way `tests/setup/integration-env.ts` does.
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  for (const name of names) {
    const value = original[name];
    if (value === undefined) delete mutableEnv[name];
    else mutableEnv[name] = value;
  }
  resetServerEnvCache();
});

function loopbackRequest(sessionId: string): Request {
  return new Request("http://localhost:3100/api/pack", {
    method: "POST",
    headers: { "x-forwarded-for": "::1", cookie: `sr_sid=${sessionId}` },
  });
}

function cookielessRequest(): Request {
  return new Request("http://localhost:3100/api/pack", {
    method: "POST",
    headers: { "x-forwarded-for": "::1" },
  });
}

function isolate(enabled: boolean): void {
  mutableEnv.NODE_ENV = "test";
  mutableEnv.APP_ENV = "test";
  if (enabled) mutableEnv.E2E_ISOLATE_RATE_LIMIT = "1";
  else delete mutableEnv.E2E_ISOLATE_RATE_LIMIT;
  resetServerEnvCache();
}

describe("rateLimitIdentityPerSession", () => {
  it("is off unless explicitly opted in", () => {
    isolate(false);
    expect(rateLimitIdentityPerSession()).toBe(false);
  });

  it("is on under an opted-in test environment", () => {
    isolate(true);
    expect(rateLimitIdentityPerSession()).toBe(true);
  });

  it("is impossible outside APP_ENV=test", () => {
    mutableEnv.NODE_ENV = "test";
    mutableEnv.APP_ENV = "preview";
    mutableEnv.E2E_ISOLATE_RATE_LIMIT = "1";
    resetServerEnvCache();
    expect(rateLimitIdentityPerSession()).toBe(false);
  });

  it("is impossible in production even with APP_ENV=test", () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.APP_ENV = "test";
    mutableEnv.E2E_ISOLATE_RATE_LIMIT = "1";
    resetServerEnvCache();
    expect(rateLimitIdentityPerSession()).toBe(false);
  });
});

describe("clientIdentity", () => {
  it("collapses distinct sessions behind one forwarded IP by default", async () => {
    isolate(false);
    const first = await clientIdentity(loopbackRequest("a".repeat(16)));
    const second = await clientIdentity(loopbackRequest("b".repeat(16)));
    expect(first).toBe(second);
  });

  it("separates sessions behind one forwarded IP when isolation is opted in", async () => {
    isolate(true);
    const first = await clientIdentity(loopbackRequest("a".repeat(16)));
    const second = await clientIdentity(loopbackRequest("b".repeat(16)));
    expect(first).not.toBe(second);
  });

  it("still falls back to the forwarded IP when isolation is on but no cookie is sent", async () => {
    isolate(false);
    const byIp = await clientIdentity(cookielessRequest());
    isolate(true);
    expect(await clientIdentity(cookielessRequest())).toBe(byIp);
  });

  it("ignores a malformed session cookie and keys on the IP", async () => {
    isolate(true);
    const malformed = new Request("http://localhost:3100/api/pack", {
      method: "POST",
      headers: { "x-forwarded-for": "::1", cookie: "sr_sid=not-hex" },
    });
    expect(await clientIdentity(malformed)).toBe(await clientIdentity(cookielessRequest()));
  });
});
