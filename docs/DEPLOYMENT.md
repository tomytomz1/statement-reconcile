# Deployment

Target: Vercel, production origin **https://statementreconcile.com**.

## Preconditions

Owner completed [`../MANUAL_CONNECTIONS.md`](../MANUAL_CONNECTIONS.md): `vercel login`, Stripe, Upstash, domain, legal env, `EXPORT_SEAL_SECRET`. GitHub remote exists (agent or `gh repo create`).

## Build

```bash
pnpm verify:release  # the complete gate: format, lint, typecheck, coverage, benchmark, SEO audit, build, E2E
pnpm verify          # the short loop: format, lint, typecheck, test, benchmark, build (NOT complete — omits coverage, SEO audit, and E2E)
```

Next config: TypeScript errors fail the build; production browser source maps off; `poweredByHeader` off; ExcelJS files traced into `/api/export`.

`NEXT_PUBLIC_*` is baked in at build. Changing price, flags, or site URL requires a new deploy.

## Vercel

**Pushing to `main` deploys production automatically.** The GitHub repo is connected to Vercel and production tracks `main`'s HEAD — confirmed 2026-08-25, when `/api/health` reported the merge commit `88432c0` within about thirty seconds of the push. Treat a merge to `main` as a production release, not as a staging step.

The CLI flow below still works for a manual or out-of-band deploy:

```bash
vercel link
vercel env pull .env.local          # optional, local
vercel --prod
```

Suggested Production env: `APP_ENV=production`, live Stripe, webhook secret, Upstash, seal secret, `NEXT_PUBLIC_SITE_URL=https://statementreconcile.com`, legal name/jurisdiction.

Preview: test Stripe keys, `APP_ENV=preview`, never `E2E_MOCK_PAYMENTS`.

**Node 22.x** in project settings. `package.json` declares `engines.node: 22.x` and CI runs Node 22 with pnpm 11.23.0; Node 20 does not satisfy that and should not be selected.

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
6. `robots.txt` disallows `/app`, `/checkout`, `/api/`. Sitemap lists marketing + 21 SEO slugs only.

## Rollback

Vercel → Deployments → Promote previous production deployment. Stripe Price can stay; do not leave live keys on a preview URL.

## CI

CI runs `pnpm verify:release`, which is the same command used locally, so the two cannot drift. Do not inject production secrets into PR CI; the suite uses mock payments and a test seal secret.
