# Manual connections

Production connection record and owner-operated checks. As of 2026-08-24, the private GitHub
repository, Vercel production project, custom domain, live Stripe integration, Upstash rate
limiter, result sealing, and legal identity are connected. Keep the procedures below for rotation,
recovery, and future environment changes.

## 1. Vercel — connected

The production project is linked and `https://statementreconcile.com` is serving the current
`main` commit. `/api/health` reports `status: "ok"`, `appEnv: "production"`, and no warnings.
Use these commands only when relinking or deploying manually:

```bash
vercel login
vercel link                 # create or attach the project
vercel --prod               # first production deploy after env vars are set
```

Set environment variables in the Vercel project (Production + Preview as appropriate). See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md). `APP_ENV=production` on the production environment.

`GET /api/health` reports `degraded` (503) if Stripe or the durable rate limiter becomes unavailable.

## 2. Stripe — connected; live acceptance purchase still required

Production health confirms live mode, a Price id, and a webhook signing secret. The remaining
owner acceptance check is one real $19 purchase, download of every artifact, and a refund.

1. Create a Stripe account and complete onboarding.
2. Create a one-time product (“Verified Conversion Pack — up to 50 total pages”) and a **$19 USD** Price. Copy the Price id into `STRIPE_PRICE_ID`.
3. Put the secret key in `STRIPE_SECRET_KEY` (`sk_test_…` on Preview, `sk_live_…` only on Production).
4. If using a parser provider in production, also set `PARSER_ZERO_DATA_RETENTION=true` and `PARSER_DISABLE_TRAINING=true`. Without both, the provider is treated as unconfigured so statement text is never sent.
5. Webhook endpoint: `https://statementreconcile.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`
   - Signing secret → `STRIPE_WEBHOOK_SECRET`
6. Confirm success/cancel URLs are not needed in the Dashboard; the app sets them from the canonical origin.

The webhook is **observability only**. Entitlement is a live `checkout.sessions.retrieve` on every export. A missing webhook does not unlock or lock downloads, but disputes will be silent.

## 3. Parser API key (optional)

Deterministic parsing works with `PARSER_PROVIDER=none` (the default). An LLM is called only when that path cannot reconcile and the failure is not terminal (scanned, encrypted, multi-account, oversized).

If you want the fallback:

- `PARSER_PROVIDER`: `openai` | `anthropic` | `openai-compatible`
- `PARSER_API_KEY`
- Optional: `PARSER_MODEL`, `PARSER_BASE_URL`, `PARSER_TIMEOUT_MS` (default 45000)

Production cost and prompt-injection exposure both increase when this is on. Leave it off until you have measured deterministic coverage.

## 4. Upstash (or compatible) rate limit — connected

`RATE_LIMIT_PROVIDER=upstash`, plus `RATE_LIMIT_URL` and `RATE_LIMIT_TOKEN` (REST).

Without them, production **fails closed**: `/api/parse` returns 503 rather than serving an unmetered provider endpoint. In-memory limiting is local-dev only.

Any Upstash-compatible Redis REST endpoint works; the app speaks `INCR` / `EXPIRE` / `TTL` over `fetch`, not an SDK.

## 5. Domain `statementreconcile.com` → Vercel — connected

After the Vercel project exists, add the domain in the Vercel dashboard and apply **the records Vercel displays**. Placeholders until then:

| Host  | Type  | Value                                               |
| ----- | ----- | --------------------------------------------------- |
| `www` | CNAME | `cname.vercel-dns.com` (or the target Vercel shows) |
| `@`   | A     | the IPv4 Vercel shows for the apex                  |

Set `NEXT_PUBLIC_SITE_URL=https://statementreconcile.com` on Production so canonical tags, sitemap, and Stripe redirects match.

Point `support@`, `security@`, and `privacy@` mailboxes on that domain (or set the `NEXT_PUBLIC_*_EMAIL` overrides).

## 6. Legal business name and jurisdiction

Configured for Production and Preview:

- `NEXT_PUBLIC_LEGAL_BUSINESS_NAME=Statement Reconcile LLC`
- `NEXT_PUBLIC_LEGAL_JURISDICTION=Michigan`

These values are interpolated into Terms, Privacy, Contact, and the public footer. `pnpm run doctor` still flags a deployment where the jurisdiction variable itself is unset.

## 7. Optional analytics

Off unless both are set:

- `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible` or `vercel`
- `NEXT_PUBLIC_ANALYTICS_KEY` (Plausible domain) and optional `NEXT_PUBLIC_ANALYTICS_HOST`

No analytics script is loaded on `/app`. Do Not Track and Global Privacy Control disable measurement. Event contract: [`docs/METRICS.md`](docs/METRICS.md).

## 8. Seal secret

Set `EXPORT_SEAL_SECRET` to a long random value on every environment that serves real conversions. Without it the envelope is `v1.plain.…`; checkout and export still require Stripe, but the full table is readable in the browser. `/api/health` and `pnpm run doctor` report this as weaker mode.

## Remaining owner-operated checks

- Confirm `support@`, `security@`, and `privacy@` forwarding by sending and receiving a message.
- Complete the real $19 purchase/download/refund acceptance test.
- Keep Stripe dispute notifications enabled.
- Decide whether to enable privacy-preserving marketing analytics after traffic begins.
