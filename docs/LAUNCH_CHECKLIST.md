# Launch checklist

Canonical URL must be **https://statementreconcile.com**. Offer: $19 once, 50 pages, no account. Do not ship invented stats, testimonials, SOC 2/HIPAA/PCI/GDPR-certification claims, or QBO/OFX/OCR promises while flags are off.

## Legal and identity

- [x] `NEXT_PUBLIC_LEGAL_BUSINESS_NAME` is `Statement Reconcile LLC`
- [x] `NEXT_PUBLIC_LEGAL_JURISDICTION` is `Michigan`
- [ ] `support@`, `security@`, `privacy@` mailboxes receive mail
- [ ] Privacy, Terms, Security, Refund pages read as built (last updated 2026-08-24 in content files) — no leftover `[[JURISDICTION]]` if the env is set
- [ ] Issuer pages keep the non-affiliation notice; `NEXT_PUBLIC_ENABLE_BANK_SPECIFIC_CLAIMS` remains false until a layout is actually tested

## Product honesty

- [x] Homepage H1 is the converter outcome, not the differentiator
- [ ] Price on site matches Stripe Price ($19 USD)
- [x] Flags: OCR/QBO/OFX off; marketing does not mention them
- [x] Internal accuracy numbers from [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md) are **not** on the site

## Payments

- [x] Live `STRIPE_SECRET_KEY` configured on Production
- [x] `STRIPE_PRICE_ID` configured for the one-time Price (owner still verifies the Dashboard amount during the live purchase)
- [x] Webhook secret configured; events are listed in MANUAL_CONNECTIONS
- [ ] One real $19 purchase of **your** statement, export CSV + XLSX, then refund
- [ ] `E2E_MOCK_PAYMENTS` unset on Vercel
- [ ] `E2E_ISOLATE_RATE_LIMIT` unset on Vercel

## Security / privacy architecture

- [x] `EXPORT_SEAL_SECRET` set; health `resultSealing: "sealed"`
- [x] Upstash configured; health `rateLimiter: "upstash"`; production health is `ok`
- [x] `/app` CSP has no third-party `script-src`; analytics not connected from `/app`
- [x] `robots.txt` disallows `/app`, `/checkout`, `/api/`
- [x] Production health has no warnings; parser and analytics remain documented optionals

## Domain and SEO

- [x] Apex + www on Vercel, HTTPS, `NEXT_PUBLIC_SITE_URL=https://statementreconcile.com`
- [x] Sitemap fetches; canonical tags use that origin
- [x] 26 SEO slugs unique (`pnpm audit:seo`)
- [x] Google Search Console verified; sitemap submitted and homepage indexing requested on 2026-08-24
- [x] Bing Webmaster Tools imported; sitemap and homepage submitted on 2026-08-24

## Quality

- [x] CI green on the production commit; synthetic benchmark is now an explicit CI gate
- [x] Playwright e2e green in CI with mock payments
- [x] Synthetic fixtures only in git

## Observability

- [ ] Health URL bookmarked
- [ ] Stripe email notifications for disputes on
- [ ] Analytics optional; if on, event names match [`METRICS.md`](METRICS.md)

## Remaining owner work

Anything still unchecked that needs a human account or private document is in
[`../MANUAL_CONNECTIONS.md`](../MANUAL_CONNECTIONS.md): mailbox delivery, one real $19
purchase/download/refund, and private real-statement acceptance checks.
