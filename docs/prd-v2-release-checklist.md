# PRD v2 — release checklist

The §113 launch gate, plus the manual checks that cannot be automated. Nothing here is ticked on the strength of an intention; each line is ticked when it has been observed.

## Baseline

- [x] Existing product behaviour documented — `docs/product-baseline-before-prd-v2.md`
- [x] Existing test baseline recorded — 274 unit/integration tests, 14 e2e
- [x] $19 economics verified — deterministic parser, no per-pack model cost, ~$0.85 Stripe fee

## Positioning and offer

- [ ] Homepage rewritten to the §21 information architecture
- [ ] Hero price visible before file selection
- [ ] Primary CTA standardised to "Verify My Statements Free"
- [ ] Proof demonstration moved near the top
- [ ] Catch-up bookkeeping use case prominent
- [ ] Pricing page rewritten
- [ ] Accountant/bookkeeper positioning improved
- [ ] Privacy language technically precise — "the original PDF never leaves your device", never "nothing leaves your device"
- [ ] Failure states rewritten
- [ ] Successful verification state rewritten
- [ ] No fake proof introduced — no testimonials, customer counts, accuracy percentages, or certification badges

## Regression

- [ ] Verification regression suite passes
- [ ] Security regression suite passes
- [ ] Analytics remains content-free — `privacy.test.ts` and `analytics-events.test.ts` unchanged and passing
- [ ] CSP remains intact — processing routes still `connect-src 'self'`
- [ ] Payment and export gate remain intact
- [ ] Accessibility audit passes — axe scan in `funnel.spec.ts`
- [ ] Performance checked

## SEO

- [ ] SEO URL inventory complete — `docs/seo-url-migration-v2.md`
- [ ] No accidental duplicate pages created
- [ ] Sitemap and canonical behaviour verified
- [ ] No redirect chains — every retired URL reaches its target in one hop
- [ ] No `related` link points at a retired slug
- [ ] `pnpm audit:seo` green

## Manual checks

- [ ] Google Rich Results Test on `/`, `/pricing`, and one lander — the new `Offer` validates and its price matches the Stripe amount
- [ ] Mobile at 375px: no horizontal overflow, upload control reachable, comparison table readable, mobile navigation works
- [ ] Production `PARSER_PROVIDER` confirmed as `none` — if a paid provider is live, recompute unit economics before leaving the price public

## Experiment

- [ ] Headline variants reseated to two, 50/50
- [ ] The 200 qualified verified previews / 50 per variant window **restarts from the deploy date** — the previous a/b/c counter is void
- [ ] Exposure still read from client analytics on marketing pages; conversion still read from server logs stamped with `copyVariant`

## Release documentation

- [ ] `docs/PRD-v2.md`
- [x] `docs/product-baseline-before-prd-v2.md`
- [x] `docs/prd-v2-implementation-plan.md`
- [ ] `docs/seo-url-migration-v2.md`
- [x] `docs/prd-v2-release-checklist.md`
- [ ] `docs/DECISIONS.md` updated with the ADR superseding the price-reveal boundary

## Deployment

- [ ] Merge to `main` explicitly approved by the product owner
- [ ] Deploy to production explicitly approved by the product owner

Production is treated as unchanged until both are given, even with the full suite green. Live Stripe keys and a fail-closed financial product make an accidental deploy costly.
