import type { MetadataRoute } from "next";

import { absoluteUrl, routes } from "@/config/site";
import { seoSlugs } from "@/content/seo";

/**
 * Sitemap.
 *
 * Only indexable pages appear. `/app` and `/checkout/*` are excluded because they are
 * `noindex` and disallowed in robots.txt, and listing a page in a sitemap while telling
 * crawlers not to index it is a contradiction that costs trust in the whole file.
 *
 * Omit lastModified until individual pages have a reliable content-edited date.
 * Deployment time is not necessarily content-modified time, and stamping every
 * URL with the current build date would send inaccurate freshness signals.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const priorities: Array<{ path: string; priority: number; changeFrequency: Frequency }> = [
    { path: routes.home, priority: 1, changeFrequency: "weekly" },
    { path: routes.pricing, priority: 0.9, changeFrequency: "monthly" },
    { path: routes.howItWorks, priority: 0.9, changeFrequency: "monthly" },
    { path: routes.security, priority: 0.7, changeFrequency: "monthly" },
    { path: routes.faq, priority: 0.7, changeFrequency: "monthly" },
    { path: routes.contact, priority: 0.4, changeFrequency: "yearly" },
    { path: routes.privacy, priority: 0.4, changeFrequency: "yearly" },
    { path: routes.terms, priority: 0.3, changeFrequency: "yearly" },
    { path: routes.refundPolicy, priority: 0.4, changeFrequency: "yearly" },
  ];

  return [
    ...priorities.map((entry) => ({
      url: absoluteUrl(entry.path),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...seoSlugs().map((slug) => ({
      url: absoluteUrl(`/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

type Frequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
