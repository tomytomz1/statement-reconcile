import type { MetadataRoute } from "next";

import { absoluteUrl, noindexPrefixes } from "@/config/site";

/**
 * robots.txt
 *
 * The processing and checkout routes are disallowed as well as being `noindex`. Belt and
 * braces is warranted here: those URLs can hold a live preview of somebody's bank statement,
 * and a crawler that never requests them cannot cache one.
 *
 * The API routes are disallowed too. They are all `POST`-only or `no-store`, so there is
 * nothing to index, and excluding them keeps crawl budget on the pages that matter.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...noindexPrefixes, ...noindexPrefixes.map((prefix) => `${prefix}/`), "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
