# Incident response

There is no on-call rotation and no stored statement archive. Most “delete the customer data” playbooks do not apply. Act anyway: stop the bleeding, preserve evidence that is not statement content, tell affected people honestly.

Contact: **security@statementreconcile.com** (reports), **support@statementreconcile.com** (customers). First reply target: 2 business days. Escalate immediately for active payment bypass or in-flight data exposure.

## Severity

| Severity | Examples                                                                                                                 | First actions                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Export without a paid Stripe session; XSS on `/app` that can read IndexedDB; statement text in production logs/analytics | Disable the route or take the deployment off production; rotate `EXPORT_SEAL_SECRET`, Stripe keys, parser keys, rate-limit token as relevant |
| P2       | Webhook signature bypass (observability only); rate-limit fail-open regression; formula injection in exports             | Patch and redeploy; pull a sample of recent exports only if you already have them locally — we have no copies                                |
| P3       | Missing security header; scanner noise; preview copy inaccuracy                                                          | Track and ship in normal cadence                                                                                                             |

## Because we store nothing

- We **cannot** email customers a list of “your statement was in our database.” We do not have that database.
- We **can** inspect Vercel logs for whether statement-shaped fields appeared (they should not). If they did, that is a code bug; fix logging, rotate nothing statement-related because it was never persisted.
- We **can** see Stripe payments (digest, amounts, coarse counts). A digest cannot be reversed into transactions.
- Browser copies live on customer devices. Advise: close the tab, use delete-my-data, clear site data.

Do not ask a reporter or a customer to send the PDF “so we can reproduce.” Reproduce with synthetic fixtures (`src/lib/fixtures/`).

## Playbooks

### Suspected payment bypass

1. Confirm in Stripe that the session is unpaid or missing while `/api/export` returned 200.
2. Redeploy a hotfix that fails closed (deny export) if the gate is in doubt.
3. Check `E2E_MOCK_PAYMENTS` / `APP_ENV` on Production — mock payments must be impossible there (`src/config/env.ts`).
4. Rotate Stripe restricted keys if a secret leaked.
5. Refund any charges you cannot justify; do not argue about $19.

### Statement content in logs or analytics

1. Stop the code path (revert, feature-flag analytics off: `NEXT_PUBLIC_ENABLE_ANALYTICS=false`).
2. In Vercel/log drain, estimate time window. Do not copy log lines containing statement text into tickets, Slack, or email.
3. If a third-party analytics payload included descriptions or amounts, treat that vendor as holding a copy; follow their deletion process. We should never have sent it.

### Parser provider

1. Set `PARSER_PROVIDER=none` or `PARSER_DETERMINISTIC_ONLY=true` and redeploy. Deterministic parsing continues.
2. Rotate `PARSER_API_KEY`.
3. Assume the vendor may have retained fallback payloads for that window; we cannot prove otherwise.

### Malicious or replayed webhook

Entitlement is unaffected. Rotate `STRIPE_WEBHOOK_SECRET` and the endpoint in the Stripe Dashboard if the secret leaked. Discard unverified events.

### Dependency / deploy compromise

1. Pin known-good lockfile, revoke Vercel tokens, rotate all server secrets (`STRIPE_SECRET_KEY`, `EXPORT_SEAL_SECRET`, parser, Upstash).
2. Sealed envelopes created under the old `EXPORT_SEAL_SECRET` will not open. Paying customers who still have the job in-browser need a re-parse + refund/re-issue ([`REFUNDS.md`](REFUNDS.md)).
3. Audit GitHub Actions logs and Vercel deployments for unexpected SHAs.

### Lost customer download (not an incident)

Normal product behavior: 60-minute local TTL. Refund or tell them to convert again. Do not accept the PDF over email.

## Evidence to keep

Health JSON (`/api/health`), Vercel deployment id, Stripe event ids, `digestPrefix` from `payment_completed` logs, timestamps. Never keep statement PDFs, parse bodies, or export files in the incident ticket.

## After-action

Ship the fix, add a regression test (synthetic fixture), update [`THREAT_MODEL.md`](THREAT_MODEL.md) if a new class appeared. Public post only if you have evidence of exposure — do not invent scale or “no customers affected” without a store to search.
