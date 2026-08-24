# Environment variables

Sources of truth: `src/config/env.ts` (server, lazy Zod), `src/config/site.ts` and `src/config/flags.ts` (`NEXT_PUBLIC_*`, inlined at **build** time).

Local: `.env.local` (copy `.env.example`). Production/Preview: Vercel project env. Never commit values. `next build` does not require production secrets.

`NODE_ENV` is set by Next/Node. Do not use it as the only production gate for payments; `mockPaymentsEnabled()` also requires `APP_ENV=test`.

## Server (secret unless noted)

| Variable                     | Secret           | Where                                  | Default / notes                                                                                                                           |
| ---------------------------- | ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                    | no               | Vercel + `.env.local`                  | `development` \| `preview` \| `production` \| `test`. Production health and fail-closed rate limit use this **or** `NODE_ENV=production`. |
| `STRIPE_SECRET_KEY`          | **yes**          | Vercel (Production live, Preview test) | Unset → checkout 503. `sk_live_` / `rk_live_` ⇒ live mode.                                                                                |
| `STRIPE_WEBHOOK_SECRET`      | **yes**          | Vercel                                 | Unset → webhook 503.                                                                                                                      |
| `STRIPE_PRICE_ID`            | no               | Vercel                                 | Preferred in production. If unset, Checkout uses inline `price_data` from `NEXT_PUBLIC_PRICE_USD`.                                        |
| `EXPORT_SEAL_SECRET`         | **yes**          | all envs that parse                    | HMAC material for AES-256-GCM. Unset → `v1.plain.` envelopes; doctor/health warn.                                                         |
| `PARSER_PROVIDER`            | no               | Vercel / local                         | `none` (default) \| `openai` \| `anthropic` \| `openai-compatible`.                                                                       |
| `PARSER_API_KEY`             | **yes**          | Vercel / local                         | Required to actually call a provider.                                                                                                     |
| `PARSER_MODEL`               | no               | optional                               | Defaults: `gpt-4.1-mini` (OpenAI-shaped), `claude-sonnet-4-5` (Anthropic).                                                                |
| `PARSER_BASE_URL`            | no               | optional                               | OpenAI-compatible default `https://api.openai.com/v1`; Anthropic default `https://api.anthropic.com/v1`.                                  |
| `PARSER_TIMEOUT_MS`          | no               | optional                               | Default `45000`, max `120000`.                                                                                                            |
| `PARSER_DETERMINISTIC_ONLY`  | no               | CI / local                             | Truthy (`1`/`true`/`yes`/`on`) disables provider even if keyed. Integration tests set this.                                               |
| `PARSER_ZERO_DATA_RETENTION` | prod if provider | Production with `PARSER_PROVIDER` set  | Must be truthy together with `PARSER_DISABLE_TRAINING` or the provider is treated as unconfigured.                                        |
| `PARSER_DISABLE_TRAINING`    | prod if provider | Production with `PARSER_PROVIDER` set  | Confirms the vendor is not training on request content.                                                                                   |
| `RATE_LIMIT_PROVIDER`        | no               | Vercel Production: `upstash`           | Default `memory` (dev only).                                                                                                              |
| `RATE_LIMIT_URL`             | no*              | Vercel                                 | Upstash REST base. *Not a customer secret but grants limiter admin; treat as secret.                                                      |
| `RATE_LIMIT_TOKEN`           | **yes**          | Vercel                                 | Upstash REST token. Production parse is 503 without both URL and token.                                                                   |
| `E2E_MOCK_PAYMENTS`          | no               | CI / `.env.test` only                  | Truthy **and** `APP_ENV=test` **and** `NODE_ENV≠production`. Never on Vercel Production.                                                  |
| `VERCEL_GIT_COMMIT_SHA`      | no               | Vercel (injected)                      | Health `commit` (12 hex).                                                                                                                 |
| `VERCEL_ENV`                 | no               | Vercel (injected)                      | Health only.                                                                                                                              |

## Public (inlined into the browser bundle — not secrets)

| Variable                                  | Secret | Where                | Default                                                            |
| ----------------------------------------- | ------ | -------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                    | no     | Production           | `https://statementreconcile.com`                                   |
| `NEXT_PUBLIC_BRAND_NAME`                  | no     | optional             | `Statement Reconcile`                                              |
| `NEXT_PUBLIC_PRICE_USD`                   | no     | optional             | `19`                                                               |
| `NEXT_PUBLIC_MAX_PAGES`                   | no     | optional             | `50`                                                               |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB`            | no     | optional             | `20`                                                               |
| `NEXT_PUBLIC_LEGAL_BUSINESS_NAME`         | no     | Production + Preview | Default: `Statement Reconcile LLC`                                 |
| `NEXT_PUBLIC_LEGAL_JURISDICTION`          | no     | Production + Preview | Default: `Michigan`; doctor flags an unset deployment variable     |
| `NEXT_PUBLIC_SUPPORT_EMAIL`               | no     | optional             | `support@statementreconcile.com`                                   |
| `NEXT_PUBLIC_SECURITY_EMAIL`              | no     | optional             | `security@statementreconcile.com`                                  |
| `NEXT_PUBLIC_PRIVACY_EMAIL`               | no     | optional             | `privacy@statementreconcile.com`                                   |
| `NEXT_PUBLIC_TWITTER_HANDLE`              | no     | optional             | empty (do not invent)                                              |
| `NEXT_PUBLIC_PRODUCT_VERSION`             | no     | optional             | `1.0.0`                                                            |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER`          | no     | optional             | `none` \| `plausible` \| `vercel`                                  |
| `NEXT_PUBLIC_ANALYTICS_KEY`               | no     | optional             | Plausible domain or empty                                          |
| `NEXT_PUBLIC_ANALYTICS_HOST`              | no     | optional             | Plausible host; also CSP `connect-src` on **marketing** pages only |
| `NEXT_PUBLIC_ENABLE_ANALYTICS`            | no     | optional             | default `false`                                                    |
| `NEXT_PUBLIC_ENABLE_OCR`                  | no     | optional             | default `false` — scanned PDFs stay rejected                       |
| `NEXT_PUBLIC_ENABLE_QBO`                  | no     | optional             | default `false`                                                    |
| `NEXT_PUBLIC_ENABLE_OFX`                  | no     | optional             | default `false`                                                    |
| `NEXT_PUBLIC_ENABLE_BANK_SPECIFIC_CLAIMS` | no     | optional             | default `false` — issuer pages stay generic eligibility            |

Rebuild after changing any `NEXT_PUBLIC_*` value.

## Test harness

`tests/setup/integration-env.ts` sets `APP_ENV=test`, `PARSER_PROVIDER=none`, `PARSER_DETERMINISTIC_ONLY=1`, `RATE_LIMIT_PROVIDER=memory`, `E2E_MOCK_PAYMENTS=1`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, and a fake `EXPORT_SEAL_SECRET`. Do not copy that file into Vercel.
