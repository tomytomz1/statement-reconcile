# Google organic visibility recovery — 2026-10-27

## Verified baseline (Search Console via connected Windsor.ai)

Property: `sc-domain:statementreconcile.com`, Web Search, page-level aggregation. Comparable 18-day windows:

| Metric | Aug 25–Sep 11 | Sep 12–Sep 29 |
| --- | ---: | ---: |
| Impressions | 696 | 10 |
| Landing pages with impressions | 32 | 3 |
| Clicks | 3 | 0 |

October 1–23: 13 page-level impressions across 4 URLs, 0 clicks. Search Console query-level sums can be much lower than page-level totals because Google anonymizes low-volume queries.

The leading pages before the decline were:
- `/bank-statement-to-google-sheets` (72 impressions; average position 53.7)
- `/credit-card-statement-to-excel` (69; position 49.6)
- `/credit-card-statement-to-csv` (60; position 56.0)
- `/pdf-bank-transaction-extractor` (56; position 64.7; now redirected)
- `/chase-statement-to-excel` (47; position 58.2)
- `/extract-transactions-from-pdf` (46; position 60.3)

**Interpretation:** The site never had established sustained search traffic. Many early impressions were at positions ~40–80; the collapse is overwhelmingly a loss of *exposure*, not a loss of high-ranking Google traffic. No evidence currently proves a manual action or algorithmic link penalty.

## Verified source-code review

- Public landing pages use unique metadata and self-referencing canonical tags; the static slug registry rejects unknown URLs.
- Robots excludes processing, checkout and API routes, not public landing pages.
- `src/proxy.ts` applies the `X-Robots-Tag: noindex` response header to processing and API routes only.
- `docs/seo-url-migration-v2.md` records 308 redirect consolidation on 2026-08-25, *before* the September 12 decline.
- `src/app/sitemap.ts` had a real hygiene defect: build time was published as every URL's `lastModified`. Recovery PR removes that field until page-specific content-change dates are available. This is a reliability fix, **not** a demonstrated cause of the visibility decline.

## Backlink audit — Ahrefs (Oct 25/27)

- 638 live referring domains; 686 backlinks; Ahrefs Domain Rating 0.
- In the examined top 100 referring domains, all were spam-flagged and none carried dofollow links.
- An exact `dofollow_links > 0` domain filter returned 11 spam-flagged domains, 11 dofollow links total. Most were first seen from Sep 12 onward, at or after the loss.
- 61 of the top 100 referring domains overlap those linking to BuildSite Calc, consistent with broad automated SEO spam.
- This is **not proof of Google ranking suppression**. Do not submit disavows on this evidence alone. Only consider a narrowly reviewed disavow with a verified manual action or substantial manipulative link pattern reasonably likely to result in one.

## Outstanding verification and recovery work

1. Search Console **Manual Actions / Security Issues** for this property: not verified through the current data API; obtain authoritative dashboard result. Do not claim clean without verification.
2. Search Console **Page indexing**: capture indexed/excluded counts; inspect the 5 main money pages for Google-selected canonical and last crawl.
3. Compare post-redirect URLs against pre-change pages, ensuring no redirect chains or accidental missing landing-page intents.
4. Prioritize real user proof, not doorway expansion: create authentic anonymized example exports + a linked sample reconciliation report after product acceptance tests. Don't invent documents or results.
5. Review 21 existing pages for duplicated conversion intent and test if page purpose is substantially unique, prioritizing bank-statement-to-google-sheets and credit-card-statement-to-excel.
6. Only after indexing clearance, pursue editorial referrals with actual accounting/bookkeeping organizations and useful documentation.
7. Record every 28 days: Google impressions, page-specific clicks, average position where enough data, and completed conversions. Treat no one-day spikes as recovery.

## Safety constraints

No mass content deletion, forced reindexing, sitewide canonical changes, backlinks purchases, or automatic disavow. Sitemap and metadata changes must pass existing unit tests, `pnpm audit:seo` and a production-equivalent build before deployment.

External reference: Google Search Central — Debugging Google Search traffic drops: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
