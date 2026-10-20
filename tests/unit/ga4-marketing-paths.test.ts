import { describe, expect, it } from "vitest";

import { isPublicMarketingPath } from "@/lib/analytics/marketing-paths";
import { seoSlugs } from "@/content/seo";

describe("GA4 public marketing path allowlist", () => {
  it("keeps all SEO landing pages on the explicit allowlist", () => {
    for (const slug of seoSlugs()) {
      expect(isPublicMarketingPath(`/${slug}`)).toBe(true);
    }
  });

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
    "/future-private-page",
    "/pricing?token=private",
    "/UPPERCASE",
    "/" + "a".repeat(101),
  ])("rejects protected or malformed paths: %s", (path) => {
    expect(isPublicMarketingPath(path)).toBe(false);
  });
});
