# Launch checklist

Canonical URL must be **https://statementreconcile.com**. Offer: $19 once, 50 pages, no account. Do not ship invented stats, testimonials, SOC 2/HIPAA/PCI/GDPR-certification claims, or QBO/OFX/OCR promises while flags are off.

## Legal and identity

- [x] `NEXT_PUBLIC_LEGAL_BUSINESS_NAME` is `Statement Reconcile LLC`
- [x] `NEXT_PUBLIC_LEGAL_JURISDICTION` is `Michigan`
- [ ] `support@`, `security@`, `privacy@` mailboxes receive mail
- [ ] Privacy, Terms, Security, Refund pages read as built (last updated 2026-08-24 in content files) — no leftover `[[JURISDICTION]]` if the env is set
- [ ] Issuer pages keep the non-affiliation notice; `NEXT_PUBLIC_ENABLE_BANK_SPECIFIC_CLAIMS` remains false until a layout is actually tested

## Product honesty

- [ ] Homepage H1 is the converter outcome, not the differentiator
- [ ] Price on site matches Stripe Price ($19 USD)
- [ ] Flags: OCR/QBO/OFX off; marketing does not mention them
- [ ] Internal accuracy numbers from [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md) are **not** on the site

## Payments

- [ ] Live `STRIPE_SECRET_KEY` on Production only
- [ ] `STRIPE_PRICE_ID` points at the $19 one-time Price
- [ ] Webhook live, signatures verify, events listed in MANUAL_CONNECTIONS
- [ ] One real $19 purchase of **your** statement, export CSV + XLSX, then refund
- [ ] `E2E_MOCK_PAYMENTS` unset on Vercel

## Security / privacy architecture

- [ ] `EXPORT_SEAL_SECRET` set; health `resultSealing: "sealed"`
- [ ] Upstash configured; health `rateLimiter: "upstash"`; parse does not 503
- [ ] `/app` CSP has no third-party `script-src`; analytics not connected from `/app`
- [ ] `robots.txt` disallows `/app`, `/checkout`, `/api/`
- [ ] `pnpm run doctor` clean except documented optionals (parser, analytics)

## Domain and SEO

- [ ] Apex + www on Vercel, HTTPS, `NEXT_PUBLIC_SITE_URL=https://statementreconcile.com`
- [ ] Sitemap fetches; canonical tags use that origin
- [ ] 26 SEO slugs unique (`pnpm audit:seo`)

## Quality

- [ ] `pnpm verify` green on the commit you deploy
- [ ] Playwright e2e green in CI with mock payments
- [ ] Synthetic fixtures only in git

## Observability

- [ ] Health URL bookmarked
- [ ] Stripe email notifications for disputes on
- [ ] Analytics optional; if on, event names match [`METRICS.md`](METRICS.md)

## Remaining owner work

Anything still unchecked that needs a human login is in [`../MANUAL_CONNECTIONS.md`](../MANUAL_CONNECTIONS.md) (Vercel login, Stripe, DNS, mailboxes, legal env).
