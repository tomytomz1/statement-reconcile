import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

/**
 * The Content-Security-Policy, and specifically the processing-route invariant.
 *
 * `/app` and `/checkout` can have a bank statement in memory. They are given
 * `connect-src 'self'` with no analytics origin, so a page holding a statement cannot talk
 * to a third party at all. That is a deliberate measurement gap — the funnel's conversion
 * half is read from server logs instead — and widening the policy to close it would trade
 * the core privacy property for a dashboard number.
 *
 * This module had no tests at all before, which is the worst possible place for a coverage
 * hole: the invariant is easy to break with a well-meaning one-line change and nothing would
 * have failed.
 */

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name ?? "", values];
    }),
  );
}

const ANALYTICS = ["https://plausible.io"];

describe("processing-route CSP", () => {
  const csp = contentSecurityPolicy({
    nonce: "abc123",
    processing: true,
    connectSrc: ANALYTICS,
    development: false,
  });
  const parsed = directives(csp);

  it("permits no connect target other than our own origin", () => {
    expect(parsed.get("connect-src")).toEqual(["'self'"]);
  });

  it("drops an analytics origin even when one is passed in", () => {
    // The caller supplies `connectSrc` unconditionally; the policy is what refuses it.
    expect(csp).not.toContain("plausible");
    for (const origin of ANALYTICS) expect(csp).not.toContain(origin);
  });

  it("uses a nonce and strict-dynamic rather than unsafe-inline scripts", () => {
    const scriptSrc = parsed.get("script-src") ?? [];
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("forbids eval in a production build", () => {
    expect(parsed.get("script-src")).not.toContain("'unsafe-eval'");
  });

  it("blocks framing, objects, and cross-origin form posts", () => {
    expect(parsed.get("frame-ancestors")).toEqual(["'none'"]);
    expect(parsed.get("frame-src")).toEqual(["'none'"]);
    expect(parsed.get("object-src")).toEqual(["'none'"]);
    expect(parsed.get("form-action")).toEqual(["'self'"]);
    expect(parsed.get("base-uri")).toEqual(["'self'"]);
  });

  it("allows the blob worker pdf.js needs, and no remote worker", () => {
    expect(parsed.get("worker-src")).toEqual(["'self'", "blob:"]);
  });
});

describe("marketing-route CSP", () => {
  const csp = contentSecurityPolicy({
    nonce: undefined,
    processing: false,
    connectSrc: ANALYTICS,
    development: false,
  });
  const parsed = directives(csp);

  it("does allow the analytics origin, because no statement can be on the page", () => {
    expect(parsed.get("connect-src")).toEqual(["'self'", "https://plausible.io"]);
  });

  it("still refuses framing and objects", () => {
    expect(parsed.get("frame-ancestors")).toEqual(["'none'"]);
    expect(parsed.get("object-src")).toEqual(["'none'"]);
  });
});

describe("development affordances never leak into production", () => {
  it("adds eval and websockets only in development", () => {
    const dev = contentSecurityPolicy({
      nonce: undefined,
      processing: false,
      development: true,
    });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");

    const prod = contentSecurityPolicy({
      nonce: undefined,
      processing: false,
      development: false,
    });
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
  });

  it("keeps the processing connect-src closed even in development", () => {
    const dev = contentSecurityPolicy({
      nonce: "n",
      processing: true,
      connectSrc: ANALYTICS,
      development: true,
    });
    expect(dev).not.toContain("plausible");
  });
});

describe("baseline security headers", () => {
  it("denies framing and sniffing", () => {
    const headers = securityHeaders({ production: true });
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  it("does not leak a full referrer cross-origin", () => {
    const headers = securityHeaders({ production: true });
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
