import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { absoluteUrl, routes } from "@/config/site";
import { seoSlugs } from "@/content/seo";

describe("public sitemap", () => {
  it("includes the homepage and all canonical SEO landing pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain(absoluteUrl(routes.home));
    for (const slug of seoSlugs()) expect(urls).toContain(absoluteUrl(`/${slug}`));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not claim a new modification date merely because the site was deployed", () => {
    for (const entry of sitemap()) {
      expect(entry.lastModified).toBeUndefined();
    }
  });
});
