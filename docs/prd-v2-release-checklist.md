# PRD v2 — release checklist

The §113 launch gate, plus the manual checks that cannot be automated. Nothing here is ticked on the strength of an intention; each line is ticked when it has been observed.

## Baseline

- [x] Existing product behaviour documented — `docs/product-baseline-before-prd-v2.md`
- [x] Existing test baseline recorded — 274 unit/integration tests, 14 e2e
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
- [ ] Performance checked — no new runtime dependency was added and the one new client component is the disclosure menu, but Core Web Vitals have not been measured

## SEO

- [x] SEO URL inventory complete — `docs/seo-url-migration-v2.md`
- [x] No accidental duplicate pages created
- [x] Sitemap and canonical behaviour verified
- [x] No redirect chains — every retired URL reaches its target in one hop
- [x] No `related` link points at a retired slug
- [x] `pnpm audit:seo` green

## Manual checks

- [ ] Google Rich Results Test on `/`, `/pricing`, and one lander — external validation still outstanding. Locally confirmed the graph parses and the `Offer` reads `price: "19"`, `priceCurrency: "USD"`, matching `siteConfig.price`, with no `AggregateRating` or `Review` present
- [x] Mobile at 375px — verified in-browser at 375x812: page `scrollWidth` equals `clientWidth` (no sideways scroll), the picker sits 0.75 screens down, the comparison table scrolls inside its own keyboard-focusable container, and the disclosure menu opens with all five links and a correct `aria-expanded`
- [ ] Production `PARSER_PROVIDER` confirmed as `none` — if a paid provider is live, recompute unit economics before leaving the price public

## Experiment

- [x] Headline variants reseated to two, 50/50
- [x] The 200 qualified verified previews / 50 per variant window **restarts from the deploy date** — the previous a/b/c counter is void
- [x] Exposure still read from client analytics on marketing pages; conversion still read from server logs stamped with `copyVariant`

## Release documentation

- [x] `docs/PRD-v2.md` — recorded in the repository; sections marked *(condensed)* defer to the owner's original
- [x] `docs/product-baseline-before-prd-v2.md`
- [x] `docs/prd-v2-implementation-plan.md`
- [x] `docs/seo-url-migration-v2.md`
- [x] `docs/prd-v2-release-checklist.md`
- [x] `docs/DECISIONS.md` updated with the ADR superseding the price-reveal boundary

## Deployment

- [ ] Merge to `main` explicitly approved by the product owner
- [ ] Deploy to production explicitly approved by the product owner

Production is treated as unchanged until both are given, even with the full suite green. Live Stripe keys and a fail-closed financial product make an accidental deploy costly.
