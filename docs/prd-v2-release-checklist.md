# PRD v2 — release checklist

The §113 launch gate, plus the manual checks that cannot be automated. Nothing here is ticked on the strength of an intention; each line is ticked when it has been observed.

## Baseline

- [x] Existing product behaviour documented — `docs/product-baseline-before-prd-v2.md`
- [x] Existing test baseline recorded — 274 unit/integration tests, 14 e2e at the start of PRD v2. After the Phase 1 closure audit: **365 unit/integration, 24 e2e** (see `docs/v2-phase1-closure-audit.md`)
- [x] $19 economics verified — deterministic parser, no per-pack model cost, ~$0.85 Stripe fee

## Positioning and offer

- [x] Homepage rewritten to the §21 information architecture
- [x] Hero price visible before file selection
- [x] Primary CTA standardised to "Verify My Statements Free"
- [x] Proof demonstration moved near the top
- [x] Catch-up bookkeeping use case prominent
- [x] Pricing page rewritten
- [x] Accountant/bookkeeper positioning improved
- [x] Privacy language technically precise — "the original PDF never leaves your device", never "nothing leaves your device"
- [x] Failure states rewritten
- [x] Successful verification state rewritten
- [x] No fake proof introduced — no testimonials, customer counts, accuracy percentages, or certification badges

## Regression

- [x] Verification regression suite passes
- [x] Security regression suite passes
- [x] Analytics remains content-free — `privacy.test.ts` and `analytics-events.test.ts` unchanged and passing
- [x] CSP remains intact — processing routes still `connect-src 'self'`
- [x] Payment and export gate remain intact
- [x] Accessibility audit passes — axe scan in `funnel.spec.ts`
- [x] Performance checked — measured against `next start` (production build) at 1280x900, homepage:

  | Metric               | Value                                         | Threshold    |
  | -------------------- | --------------------------------------------- | ------------ |
  | LCP                  | 156 ms (the `h1`)                             | < 2500 ms    |
  | CLS                  | **0**                                         | < 0.1        |
  | Long tasks           | **0**                                         | —            |
  | Interactions > 16 ms | 0 of 6 FAQ toggles                            | INP < 200 ms |
  | TTFB                 | 30 ms                                         | —            |
  | Transfer             | 30 KB HTML + 46 KB resources over 25 requests | —            |

  LCP and TTFB are flattered by localhost having no network latency, so treat those two as a floor rather than a field measurement. CLS, long-task count, and interaction latency are network-independent and are the meaningful results. No new runtime dependency was added; the only new client component is the header disclosure menu.

## SEO

- [x] SEO URL inventory complete — `docs/seo-url-migration-v2.md`
- [x] No accidental duplicate pages created
- [x] Sitemap and canonical behaviour verified
- [x] No redirect chains — every retired URL reaches its target in one hop
- [x] No `related` link points at a retired slug
- [x] `pnpm audit:seo` green

## Manual checks

- [x] Structured data validated — the `/pricing` graph was run through validator.schema.org and returned **0 errors, 0 warnings**, detecting `WebPage`, `SoftwareApplication`, and `FAQPage` as separate clean items. The `Offer` reads `price: "19"`, `priceCurrency: "USD"`, matching `siteConfig.price`; no `AggregateRating` or `Review` is present anywhere.

  Google's own Rich Results Test was not used because it needs a publicly reachable URL and this markup is not deployed yet. Re-run it against the live URL after deploy if a rich result is actually wanted — schema validity and Google eligibility are different questions.

- [x] Mobile at 375px — verified in-browser at 375x812: page `scrollWidth` equals `clientWidth` (no sideways scroll), the picker sits 0.75 screens down, the comparison table scrolls inside its own keyboard-focusable container, and the disclosure menu opens with all five links and a correct `aria-expanded`
- [x] Production `PARSER_PROVIDER` confirmed as `none` — `/api/health` on 2026-08-25 reported `"parserProvider": "none"`, `"parserDeterministicOnly": true`. Re-check at deploy time: enabling a provider is an env-var change that needs no deploy, so this is a snapshot rather than a standing guarantee
- [x] **Stripe dashboard Price confirmed as $19.00 USD** — confirmed by the product owner on 2026-08-25. Production has `STRIPE_PRICE_ID` set, so the charge comes from a Stripe dashboard Price rather than from `siteConfig.price`; `claims.test.ts` keeps the codebase internally consistent but cannot see Stripe. Re-confirm by hand whenever the published figure changes

## Experiment

- [x] Headline variants reseated to two, 50/50
- [x] The 200 qualified verified previews / 50 per variant window **restarts from the deploy date** — the previous a/b/c counter is void
- [x] Exposure still read from client analytics on marketing pages; conversion still read from server logs stamped with `copyVariant`

## Release documentation

- [x] `docs/PRD-v2.md` — recorded in the repository; sections marked _(condensed)_ defer to the owner's original
- [x] `docs/product-baseline-before-prd-v2.md`
- [x] `docs/prd-v2-implementation-plan.md`
- [x] `docs/seo-url-migration-v2.md`
- [x] `docs/prd-v2-release-checklist.md`
- [x] `docs/DECISIONS.md` updated with the ADR superseding the price-reveal boundary

## Deployment

- [x] Merge to `main` explicitly approved by the product owner — 2026-08-25
- [x] Deploy to production explicitly approved by the product owner — 2026-08-25, with the owner confirming that merging auto-deploys on this setup and that this is intended

Production is treated as unchanged until both are given, even with the full suite green. Live Stripe keys and a fail-closed financial product make an accidental deploy costly.
