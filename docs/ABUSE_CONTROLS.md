# Abuse controls

The service is one person, one $19 conversion pack (one or more statements, 50 total pages). Scripted bulk conversion is forbidden (Terms) and rate-limited in code.

## Fail closed in production

If `RATE_LIMIT_PROVIDER` is not durable Upstash (URL + token), `/api/parse` returns **503** and logs `parse_blocked_unprotected`. There is no “open the door so the site still works” fallback. Upstash errors also deny the request.

Dev uses an in-memory window (per process). That is not protection on serverless.

## Numeric limits

| Control                | Value                        | Where                    |
| ---------------------- | ---------------------------- | ------------------------ |
| Parse                  | 12 / 600 s / hashed identity | `RATE_LIMITS.parse`      |
| Checkout + verify      | 20 / 600 s                   | `RATE_LIMITS.checkout`   |
| Export                 | 40 / 600 s                   | `RATE_LIMITS.exportFile` |
| PDF size               | 20 MB                        | `siteConfig` + client    |
| Pages                  | 50                           | client + parse Zod       |
| Parse body             | 4 MB                         | `readJsonBody`           |
| Checkout/export body   | 6 MB                         |                          |
| Text items             | 4 000/page, 40 000 total     | Zod                      |
| Item / total chars     | 400 / 600 000                | Zod                      |
| Envelope               | 3 000 000 chars              | `MAX_ENVELOPE_CHARS`     |
| Provider payload       | 220 000 chars                | `MAX_PROVIDER_CHARS`     |
| Transactions in schema | 5 000                        | `MAX_TRANSACTIONS`       |
| Parse/export duration  | 60 s                         | route `maxDuration`      |

429 responses include `Retry-After` and `X-RateLimit-*`.

Identity is SHA-256 of `APP_ENV` plus client IP (`x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`) or `sr_sid`. Raw IPs are not stored in Redis keys.

## Origin and method

Mutating JSON routes require `Content-Type: application/json` and an allowed Origin (canonical host, same Host, or localhost in non-production). Missing Origin is allowed (non-browser). GET on POST-only routes → 405.

## Cost abuse (LLM)

Deterministic parser always runs first. Terminal failures never call a provider. `PARSER_DETERMINISTIC_ONLY` for CI. Leave `PARSER_PROVIDER=none` until needed. Rate limit is the backstop on provider spend.

## Payment abuse

Checkout idempotency key `checkout:<digest>:<jobId>`. Unreconciled results cannot start Checkout. Export re-verifies Stripe live. No customer object to brute-force. Mock payments cannot be enabled in production.

## Content abuse

Formula neutralization on export. Prompt-injection fixtures. Multi-account documents rejected. Encrypted PDFs rejected. Preview is not a bulk dump of every row.

## What we will not do

No CAPTCHA in V1. No IP blocklist UI. No WAF config in-repo (Vercel platform defaults). If a single hashed identity is burning parse quota, raise the Upstash TTL/limit only with a measured reason — do not fail open.
