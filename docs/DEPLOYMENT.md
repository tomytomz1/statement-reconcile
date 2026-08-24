# Deployment

Target: Vercel, production origin **https://statementreconcile.com**.

## Preconditions

Owner completed [`../MANUAL_CONNECTIONS.md`](../MANUAL_CONNECTIONS.md): `vercel login`, Stripe, Upstash, domain, legal env, `EXPORT_SEAL_SECRET`. GitHub remote exists (agent or `gh repo create`).

## Build

```bash
pnpm verify          # format, lint, typecheck, test, next build
```

Next config: TypeScript errors fail the build; production browser source maps off; `poweredByHeader` off; ExcelJS files traced into `/api/export`.

`NEXT_PUBLIC_*` is baked in at build. Changing price, flags, or site URL requires a new deploy.

## Vercel

```bash
vercel link
vercel env pull .env.local          # optional, local
vercel --prod
```

Suggested Production env: `APP_ENV=production`, live Stripe, webhook secret, Upstash, seal secret, `NEXT_PUBLIC_SITE_URL=https://statementreconcile.com`, legal name/jurisdiction.

Preview: test Stripe keys, `APP_ENV=preview`, never `E2E_MOCK_PAYMENTS`.

Node 20.x (or 22) in project settings to match `engines`.

## Stripe webhook after first prod URL exists

Endpoint `https://statementreconcile.com/api/stripe/webhook`. Redeploy if the secret was added after the last build (secret is server-side; no rebuild required, but the process must restart — Vercel env changes apply on next deployment).

## Domain

Attach `statementreconcile.com` and `www` in Vercel; use the DNS records the dashboard shows. Confirm TLS. Confirm `https://statementreconcile.com/api/health`.

## Post-deploy checks

1. `GET https://statementreconcile.com/api/health` → `status: "ok"`, `integrations.stripe: "live"`, `rateLimiter: "upstash"`, `resultSealing: "sealed"`. 503/`degraded` means do not advertise the converter.
2. Homepage title/H1 still target converter queries, not the differentiator.
3. `/app` loads, CSP present, pdf worker `200` at `/pdf.worker.min.mjs`.
4. Test-mode Checkout on Preview; **one live $19 test** on Production using your own statement, then refund.
5. Webhook in Stripe → recent `checkout.session.completed` delivered.
6. `robots.txt` disallows `/app`, `/checkout`, `/api/`. Sitemap lists marketing + 26 SEO slugs only.

## Rollback

Vercel → Deployments → Promote previous production deployment. Stripe Price can stay; do not leave live keys on a preview URL.

## CI

When GitHub Actions exist, run `pnpm verify` (and Playwright with mock payments) on PRs. Do not inject production secrets into PR CI.
