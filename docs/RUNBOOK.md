# Runbook

Day-to-day operations. Refunds: [`REFUNDS.md`](REFUNDS.md). Incidents: [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

## Health

`GET /api/health` (no secrets).

| Field                              | Healthy production        |
| ---------------------------------- | ------------------------- |
| `status`                           | `ok` (HTTP 200)           |
| `integrations.stripe`              | `live`                    |
| `integrations.stripeWebhookSecret` | `true`                    |
| `integrations.rateLimiter`         | `upstash`                 |
| `integrations.resultSealing`       | `sealed`                  |
| `integrations.parserProvider`      | `none` or configured name |
| `warnings`                         | `[]`                      |

`degraded` + 503: parse fail-closed and/or Stripe missing. Customers cannot complete a paid conversion. Fix env, redeploy.

## Symptoms

| Symptom                               | Likely cause                            | Action                                                                   |
| ------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Parse 503, health warns limiter       | No Upstash in production                | Set `RATE_LIMIT_*`, redeploy                                             |
| Parse 429                             | Limit 12/10 min                         | Wait; if bot, leave limits                                               |
| Checkout 503                          | `STRIPE_SECRET_KEY` missing             | Set key                                                                  |
| Checkout 409                          | Envelope not reconciled / seal mismatch | Re-parse; if seal secret rotated, old jobs are dead                      |
| Export 403 `not_paid`                 | Session still processing                | Retry; check Stripe                                                      |
| Export 403 expired                    | >30 days since paid                     | Refund/re-issue, do not extend in code ad hoc                            |
| Export 409                            | Paid but envelope ≠ digest              | Re-convert, refund duplicate if they pay again                           |
| Preview works, paywall missing        | `reconciliation.passed` false           | Expected; do not charge                                                  |
| Scanned PDF                           | `no_text_layer`                         | Expected; OCR flag is off                                                |
| Webhook 503                           | Secret missing                          | Configure Stripe endpoint                                                |
| Logs show `webhook_signature_invalid` | Wrong secret or raw-body mutation       | Rotate secret; do not parse JSON before verify                           |
| Provider timeouts                     | Vendor down                             | Failures become `provider_unavailable`; optional: set provider to `none` |

## Payments

Stripe Dashboard is the ledger. Application logs `checkout_started`, `payment_completed` (amount, currency, page/txn counts, 8-char digest prefix), `export_delivered`. Correlate with `job_id` only if the customer still has it — we do not.

Live vs test: health `integrations.stripe`. Never mix `sk_live_` on Preview.

## Parser spend

If OpenAI/Anthropic bills spike: set `PARSER_PROVIDER=none` or `PARSER_DETERMINISTIC_ONLY=true` without taking the site down. Watch `extraction_succeeded` `source=provider` in analytics/logs.

## Customer email

| Address                         | Use                                                             |
| ------------------------------- | --------------------------------------------------------------- |
| support@statementreconcile.com  | Conversion, refund, re-download                                 |
| privacy@statementreconcile.com  | Data rights (usually: we hold nothing; Stripe holds the charge) |
| security@statementreconcile.com | Vulnerabilities only                                            |

Reply within 2 business days. Never request the PDF.

## Deploys

See [`DEPLOYMENT.md`](DEPLOYMENT.md). After each production deploy, hit health and load `/app` once.

## What you cannot do

- Look up a customer by name or email
- Re-send a file we generated
- Unseal an envelope without `EXPORT_SEAL_SECRET` and the digest
- Mark a statement reconciled in the dashboard — there is no dashboard
