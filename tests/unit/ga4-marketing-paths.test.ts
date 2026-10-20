import { describe, expect, it } from "vitest";

import { isPublicMarketingPath } from "@/lib/analytics/marketing-paths";

describe("GA4 public marketing path allowlist", () => {
  it.each(["/", "/pricing", "/faq", "/privacy", "/how-it-works", "/bank-statement-to-excel"])(
    "allows a public marketing page: %s",
    (path) => expect(isPublicMarketingPath(path)).toBe(true),
  );

  it.each([
    "/app",
    "/app/result/job-123",
    "/checkout",
    "/checkout/success",
    "/api",
    "/api/analytics/collect",
    "/admin",
    "/admin/metrics",
    "/pricing?token=private",
    "/UPPERCASE",
    "/" + "a".repeat(101),
  ])("rejects protected or malformed paths: %s", (path) => {
    expect(isPublicMarketingPath(path)).toBe(false);
  });
});
