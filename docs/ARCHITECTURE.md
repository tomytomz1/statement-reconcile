# Architecture

Statement Reconcile is a single Next.js 16 App Router application on Vercel. React 19, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind CSS 4. There is **no application database**. Decisions: [`DECISIONS.md`](DECISIONS.md).

## Runtime split

| Surface         | Path                                    | Role                                                                                 |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Marketing       | `src/app/(site)/`                       | Home, pricing, how-it-works, FAQ, legal, 21 SEO landers at `/(slug)`                 |
| Converter       | `/app`                                  | Dropzone, preview, paywall. `noindex`. Strict CSP + per-request nonce                |
| Checkout return | `/checkout/success`, `/checkout/cancel` | Match Stripe session to the local sealed job                                         |
| API             | `src/app/api/`                          | Parse, checkout, verify, export, webhook, health                                     |
| Proxy           | `src/proxy.ts`                          | Next 16 replacement for middleware: CSP, security headers, anonymous `sr_sid` cookie |

Brand, price, limits, and canonical URL live in `src/config/site.ts`. Server secrets in `src/config/env.ts`. V1 feature flags (OCR, QBO, OFX, bank-specific claims, analytics) in `src/config/flags.ts`.

## Request interceptor

`src/proxy.ts` runs on HTML and API routes (not `_next/static`). It:

- Generates a CSP nonce for processing routes (`/app`, `/checkout`, `/api`)
- Applies HSTS (production), `X-Frame-Options: DENY`, a locked-down Permissions-Policy
- Sets `Cache-Control: no-store` and `X-Robots-Tag: noindex` on processing and API paths
- Issues an httpOnly `sr_sid` cookie (16 hex chars) used only as a rate-limit fallback identity — it grants nothing

Marketing pages are statically generated and therefore cannot use a nonce; their `script-src` allows `'unsafe-inline'`. Those pages never read IndexedDB or render statement data.

## Extraction

1. **Browser** (`src/lib/client/pdf.ts`): pdf.js worker from this origin (`/pdf.worker.min.mjs`). Rejects non-PDF, >20 MB, encrypted, or image-only (below ~120 chars/page). Combined pack cap is 50 pages. PDF bytes stay in RAM for source highlighting and never leave the device or IndexedDB.
2. **`POST /api/parse`**: positioned text only (`t, x, y, w, h` per run, plus stable item ids). One or more files. Origin-checked, size-capped, rate-limited.
3. **Deterministic parser** first (`src/lib/extraction/deterministic/`). Free, auditable, layout-aware. Attaches source regions.
4. **Optional region extractor** (`src/lib/extraction/providers/configured-provider.ts`) accepts clipped ambiguous text regions only. Full-document fallback is forbidden. Until typed ambiguity activation is wired, deterministic failures reject without calling a provider. Request/response bodies are never logged.
5. **Normalize + canonicalize** (`src/lib/extraction/normalize.ts`, `canonicalize.ts`). Money is `decimal.js`, never IEEE-754. Provenance survives canonicalization (schema v2).
6. **Completeness, running-balance, ambiguity, then reconcile** (`src/lib/verification/`, `src/lib/reconciliation/reconcile.ts`). A provider cannot declare `verification_passed`.
7. **Pack digest + seal**. File digests use `statement-reconcile/result/v2\n` + canonical JSON. Payment binds to `statement-reconcile/pack/v2\n` + the pack manifest. AES-256-GCM envelope if `EXPORT_SEAL_SECRET` is set. Without it, non-production falls back to a `v1.plain.` envelope so local development needs no secrets; **production refuses to seal at all**, because a plaintext fallback there would put the whole converted table in the browser before payment.

The parse response on success: 10-row preview, summary, verification evidence, pack digest, sealed pack envelope. A rejected file still returns HTTP 200 with `status: "rejected"` (or a mixed `status: "pack"` with `eligible: false`) so the customer can see why; failed files are never included in a paid pack.

Checkout and export **re-run** completeness, source mapping, running-balance (when applicable), and this engine after unsealing. Incomplete, ambiguous, or `verification_rejected` jobs cannot be purchased.

## Reconciliation (non-negotiable)

`src/lib/reconciliation/reconcile.ts` is pure: no I/O, no clock, no randomness. A provider may propose rows; it **must not** mark a result reconciled. The engine recomputes aggregates from signed amounts and requires:

- Structural checks (at least one row, unambiguous debit/credit, column agreement, no impossible duplicates, dates inside the period ±5 days)
- **Every** available primary balancing method to pass (missing data is a rejection, not a pass):
  - `opening_closing_sum`
  - `running_balance_chain`
  - `stated_category_totals` (credit cards, ≥2 stated category totals)
  - `stated_totals` (stated debit/credit totals vs row sums)

Tolerance is one minor unit of the currency. Sign convention: deposits positive on asset accounts; charges positive on credit cards, so `opening + sum(amount) = closing` in both families.

Checkout and export **re-run** this engine after unsealing, together with the verification gate. A result that no longer balances, or that fails completeness or source mapping, is refused even if Stripe was paid.

## Entitlement (no DB)

Stripe Checkout Session metadata (`src/lib/payments/entitlement.ts`):

- `result_digest` — SHA-256 hex of the **pack manifest** (ordered file digests, counts, versions)
- `job_id` — client-generated 32 hex chars
- `page_count`, `transaction_count`, `file_count` — coarse counts
- `product_version`, `schema_version` (currently `2`)

No balances, bank names, descriptions, dates, filenames, or account identifiers.

`POST /api/export` requires, in order: origin + JSON + rate limit; live Stripe `payment_status === "paid"`; constant-time digest match; envelope opens under that digest; every included file re-canonicalizes and passes the verification gate; paid-at within 30 days. Downloads of the **same** pack are repeatable inside that window; the browser job itself expires after 60 minutes.

The webhook (`POST /api/stripe/webhook`) logs `payment_completed` / refunds / disputes. It does not grant entitlement. Signature verification runs on the raw body.

`E2E_MOCK_PAYMENTS` exists only when `APP_ENV=test` and `NODE_ENV !== production`. Mock session ids encode the digest (`cs_mock_<digest>`).

## Browser job store

IndexedDB database `statement-reconcile`. The sealed envelope, digest, 10-row preview, and summary are encrypted at rest with a non-extractable per-device AES-GCM `CryptoKey`. TTL 60 minutes, plus an explicit delete control. Downloading does **not** delete the record: the pack ships as four separate files and a customer may take them one at a time. This defends disk inspection, not XSS — hence the strict CSP on `/app`.

## Exports

CSV columns (fixed): Date, Posted Date, Description, Debit, Credit, Amount, Balance. UTF-8 BOM. XLSX: Transactions, Statement Summary, Verification, and Source references. Paid packs also include a per-statement verification PDF and `pack-manifest.json`. Every text cell passes `neutralizeFormula` (`src/lib/export/sanitize.ts`). QBO/OFX modules are not shipped.

## Rate limiting

| Route                                   | Limit | Window |
| --------------------------------------- | ----- | ------ |
| `/api/parse`                            | 12    | 600 s  |
| `/api/checkout`, `/api/checkout/verify` | 20    | 600 s  |
| `/api/export`                           | 40    | 600 s  |

Identity: SHA-256 of `APP_ENV|ip:…` (or session cookie). Production without Upstash credentials: `rateLimitMisconfigured()` → parse returns 503. Limiter errors fail closed.

## Observability

Structured logs (`src/lib/security/logging.ts`): event name plus booleans, integers, short enums. Forbidden keys (description, amount, statement, payload, …) are redacted. Exception messages are not logged in production — only the constructor name. `/api/health` returns integration booleans, never secrets.
