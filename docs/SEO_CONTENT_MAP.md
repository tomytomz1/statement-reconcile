# SEO content map

Canonical origin: `https://statementreconcile.com`.

## Where the map actually lives

This document used to carry a per-page table of every title, H1, target query, and outbound link. It drifted out of date within days of launch, because all of that is already declared in `src/content/seo/*.ts` and any change there silently invalidated the copy here.

So the per-page detail is gone and the data files are the source of truth. To read the current map:

| Question | Where to look |
| --- | --- |
| Which pages exist, and in what order | `seoPages` in `src/content/seo/index.ts` |
| A page's title, H1, target query, intent | its own file in `src/content/seo/` |
| How pages link to each other | the `related` array on each page, plus `footerGroups` |
| Which URLs are indexed | `src/app/sitemap.ts`, which derives from `seoPages` |
| Why a page was merged or renamed | `docs/seo-url-migration-v2.md` |
| Whether the set is internally consistent | `pnpm audit:seo` |

`pnpm audit:seo` is the enforcement this document cannot provide. It fails the build on duplicate titles, descriptions, or H1s, on a `related` href that does not resolve, and on an issuer page missing its independence notice.

## Policy that is not derivable from the data files

These are the rules a future change has to respect, and they are the reason this file still exists.

**One page per distinct intent.** Search engines resolve "convert bank statement to excel", "pdf bank statement to excel", and "bank statement to excel" to the same intent. Writing a separate page for each phrasing produced five URLs splitting one signal. Before adding a page, establish that its search has a genuinely different answer, not just different words.

**Nothing is claimed that a flag has switched off.** `flags.ocr`, `flags.qbo`, `flags.ofx`, and `flags.bankSpecificClaims` are all false. So: no page promises OCR or scanned-statement support, no page offers `.QBO` or OFX output, and no issuer page claims a bank-specific parser has been validated against that institution's layout. The QuickBooks, Xero, and Google Sheets pages describe **CSV import only** — none of them is a live integration.

**Issuer names describe documents, never relationships.** Every issuer-named page carries an `independenceNotice`, and the audit script enforces it for anything in the `By bank or issuer` footer group.

**The price is public and stated once.** As of PRD v2 the amount appears on the homepage, the pricing page, and the landing-page template, and it is always read from `siteConfig.price`. A literal amount typed into a page is a number that can drift from what Stripe charges; `tests/unit/claims.test.ts` fails the build on one.

**No invented proof.** No testimonials, customer counts, accuracy percentages, review markup, or certification badges anywhere, until each is true. `tests/unit/claims.test.ts` holds the list of forbidden claim patterns.

## Homepage

The homepage `<title>` targets the category. Its H1 is **one of two live experiment variants** in `src/lib/analytics/copy-variant.ts`, not a fixed string — variant `a` carries the category keywords, variant `b` does not. Anything that needs a stable homepage string should read `HOMEPAGE_TITLE` or `siteConfig.primaryOutcome`, never the rendered H1.

ADR-008 in `docs/DECISIONS.md` records why the differentiator sits under the H1 rather than in it.

## Structured data

One JSON-LD graph per page, built in `src/lib/seo/structured-data.ts`. Sitewide: `Organization`, `WebSite`, `SoftwareApplication` with an `Offer`. Per page: `WebPage`, plus `BreadcrumbList`, `HowTo`, and `FAQPage` where the page genuinely renders them.

No `AggregateRating` and no `Review`. The product has neither, and marking them up would be both a manual-action risk and a lie.
