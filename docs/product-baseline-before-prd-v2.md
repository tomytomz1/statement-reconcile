# Product baseline before PRD v2

Captured at commit `4b153ca` (branch `main`), 2026-08-25, immediately before any PRD v2 change.

This document exists because PRD v2 §55 requires the current implementation to be recorded before marketing amplifies it, and §106 lists eighteen questions that must be answered from the repository rather than assumed. Where the PRD and the code disagree, the disagreement is written down here rather than quietly resolved in favour of the copy.

## Test baseline

| Suite              | Command         | Result                                                                 |
| ------------------ | --------------- | ---------------------------------------------------------------------- |
| Unit + integration | `pnpm test`     | 23 files, 274 tests, all passing                                       |
| End-to-end         | `pnpm test:e2e` | 14 passing (chromium + mobile) when Playwright owns its own dev server |

`pnpm format:check` fails locally on Windows for every touched file. `core.autocrlf=true` with no `.gitattributes` means the working tree is CRLF while the committed blobs are LF, and Prettier wants LF. The byte delta is exactly one CR per line. CI runs `ubuntu-latest` and passes. Running `pnpm format` to "fix" this is churn against a non-problem.

## §106 answers

### 1–2. Is `$19` configured, and is the price server-controlled?

Defined once, in `src/config/site.ts`:

```ts
const PRICE_USD = numberFromEnv(process.env.NEXT_PUBLIC_PRICE_USD, 19);
price: { amountUsd: PRICE_USD, amountCents: Math.round(PRICE_USD * 100), currency: "USD", display: ... }
```

The checkout amount is server-controlled. `src/lib/payments/stripe.ts` prefers the dashboard `STRIPE_PRICE_ID` and falls back to inline `price_data` built from `siteConfig.price.amountCents`. The client cannot influence it: `createCheckoutSchema` in `src/lib/payments/checkout-payload.ts` accepts only `jobId`, `digest`, `sealed`, `pageCount`, and `fileCount`.

Production has `STRIPE_PRICE_ID` set (confirmed 2026-08-25 via `/api/health`: `"stripePriceId": true`), so the live charge comes from a Stripe dashboard Price rather than from inline `price_data`.

That splits the amount across two systems. `siteConfig.price` drives the marketing copy and the `Offer` schema; the dashboard Price drives what the customer is actually billed. `tests/unit/claims.test.ts` keeps the codebase internally consistent but cannot see Stripe, so **the dashboard Price has to be confirmed as $19.00 USD by hand** whenever the published figure changes.

### 3. Can a pack contain multiple statements?

Yes, and packs are first-class rather than a loop over single files. `POST /api/parse` accepts `files: [{ fileId, document }]` and returns `status: "pack"`. The canonical model is `PackManifest` (`src/lib/schema/pack.ts`) wrapped in `PackEnvelope` (`src/lib/schema/assemble-pack.ts`). Payment binds to `packDigest(manifest)`.

`fileId` derives from the file digest, so two identical statements collide and are rejected as a duplicate. A failed file can never appear in a paid pack — `assertPaidPack` and `assemblePack` both throw. Removing a file re-assembles server-side through `POST /api/pack` and produces a new pack digest.

### 4–5. Page and file-size limits

**50 pages is a per-pack limit**, enforced at four layers:

1. Client accumulation across files in `src/components/converter/converter-app.tsx`
2. Zod `parseRequestSchema.superRefine` summing `pageCount` across files (`src/lib/extraction/types.ts`)
3. Re-checked in `src/app/api/parse/route.ts` and `src/app/api/pack/route.ts`
4. `packManifestSchema` caps `totalPages`, and `openPack` re-verifies it when unsealing

**20 MB is a per-file limit, and it is client-only** (`src/lib/client/pdf.ts`). There is no server-side file-size check because the file never reaches the server. The server's equivalent protections are payload ceilings in `PAYLOAD_LIMITS`: 8 MB request body, 40,000 items, 600,000 characters, plus `MAX_GATED_BODY_BYTES` of 6 MB on checkout and export.

### 6–7. How long results and entitlements survive

| Thing                           | Lifetime       | Defined in                                                                       |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| Local sealed result (IndexedDB) | **60 minutes** | `siteConfig.limits.localJobTtlMinutes`, applied in `src/lib/client/job-store.ts` |
| Paid download entitlement       | **30 days**    | `ENTITLEMENT_TTL_MS` in `src/lib/payments/entitlement.ts`                        |

These are very different numbers and the product copy currently conflates them. See "Known copy defects" below.

Local records are AES-GCM encrypted with a non-extractable per-device key, with the digest as additional authenticated data. `paidAt` comes from the live Stripe session, not a local database.

### 8–9. Analytics

Provider is Plausible, enabled in production on 2026-08-25. No vendor script is ever injected — events are a direct `fetch` to Plausible's own event endpoint. No analytics package is a dependency.

`flags.analytics` defaults to false and `src/lib/analytics/client.ts` honours DNT and GPC. When disabled, `track()` is a no-op rather than a queue.

**Analytics does not function on `/app` or `/checkout`, by design.** `contentSecurityPolicy()` in `src/lib/security/headers.ts` gives processing paths `connect-src 'self'` with no analytics origin, so conversion-half events never leave the browser. This is not a bug to fix by widening the policy — that would let a page holding a statement talk to a vendor. The conversion funnel is read from server logs stamped with the copy variant by `copyVariantFromHeaders()`.

The taxonomy is 22 events in `src/lib/analytics/events.ts`, type-enforced as the privacy contract: every payload is a count, a bucket, an enum, or a boolean. No shape has a field for a description, amount, balance, statement date, bank name, filename, or account identifier.

### 10–12. What `verified = true` actually means

Two gates, and the distinction matters.

`reconcile()` (`src/lib/reconciliation/reconcile.ts`) sets `passed` only when every non-advisory structural check holds, at least one balancing method was applicable, and **every** applicable method passed. The four methods are `opening_closing_sum`, `running_balance_chain`, `stated_category_totals` (credit-card only), and `stated_totals`. Zero applicable methods is a rejection, never a pass — a statement without enough balancing evidence cannot be sold.

Deterministic verification covers all four statement types (`checking`, `savings`, `credit_card`, `unknown`); only `stated_category_totals` is type-gated.

The acceptance gate that actually reaches checkout is `evaluateVerificationGate()` in `src/lib/verification/gate.ts`, which requires all five of:

1. completeness passed
2. every accepted row traced to source
3. zero unresolved material ambiguities
4. running balances passed
5. `reconcile()` passed

**Can a statement pass without full source-link coverage?** `reconcile()` alone never inspects `sourceRegions`, so in isolation yes. The product, no: coverage is enforced three times over — in the gate, in `completeness.ts` via the `unmapped_rows` code, and in `sourceMappingFailures()` which additionally requires every required field to be `traced` with non-empty raw text.

### 13–15. Exports

All formats derive from the same re-opened `NormalizedStatement`. `openSealedResult` re-runs canonicalization (the digest must reproduce exactly) and then re-runs the full verification gate per file before anything is generated. Nothing is cached.

The export gate in `src/app/api/export/route.ts` requires, in order: Stripe reports `paid` → the digest matches in constant time → the envelope opens under that digest → every file re-passes verification → the entitlement window has not expired.

Multi-file packs zip per-file outputs. CSV column order is fixed; the XLSX has four sheets and writes canonical decimal strings as numbers.

### 16–17. SEO inventory

26 landing pages as data in `src/content/seo/`, plus 9 static routes; 35 URLs in the sitemap. `/app` and `/checkout` are `noindex` and robots-disallowed.

The site launched 2026-08-25, so **there is no Search Console history and effectively no accrued equity**. Duplicate-intent clusters are documented in `docs/seo-url-migration-v2.md`.

### 18. Copy inconsistent with behaviour

See below.

## Known copy defects at baseline

1. **`src/components/converter/download-panel.tsx` conflates two lifetimes.** It tells a paying customer they can re-download from this device for 30 days, but the local copy expires in 60 minutes. Only the entitlement is 30 days, and using it requires re-uploading the same files so the digest can be re-matched. PRD §101 forbids copy that hides a real limitation. Fixed in PRD v2 Phase 1.

2. **`enabledExportFormats` and `isExportFormatEnabled` in `src/config/flags.ts` are dead code.** Nothing imports them; format validation is `exportFormatSchema`. Flipping `NEXT_PUBLIC_ENABLE_QBO` would therefore advertise nothing and enable nothing. Left in place for now — it becomes live wiring in Phase 3, and removing it would only have to be rebuilt.

3. **`docs/SEO_CONTENT_MAP.md` is stale**, listing a homepage H1 that is now one of several headline variants.

## Error taxonomy: PRD §93 names versus the code

The repository already has an 18-code machine-readable taxonomy in `src/lib/extraction/types.ts` (`EXTRACTION_ERROR_CODES`), with a parallel user-facing message record. PRD §93 proposes different names for overlapping concepts. **The code keeps its names**; renaming a working, tested enum to match a document would churn the analytics `code` property and every failure-copy test for no behavioural gain. The mapping:

| PRD §93 name                    | Existing code           | Notes                                             |
| ------------------------------- | ----------------------- | ------------------------------------------------- |
| `IMAGE_ONLY_PDF`                | `no_text_layer`         | Triggered below 120 characters per page           |
| `PASSWORD_PROTECTED`            | `encrypted_pdf`         |                                                   |
| `PAGE_LIMIT_EXCEEDED`           | `too_many_pages`        | Per-pack                                          |
| `FILE_TOO_LARGE`                | `file_too_large`        | Per-file, client-side                             |
| `NO_TRANSACTION_TABLE`          | `no_transactions_found` |                                                   |
| `MULTIPLE_ACCOUNTS_UNRESOLVED`  | `multiple_accounts`     |                                                   |
| `PAGE_COVERAGE_INCOMPLETE`      | `completeness_failed`   | Detail in completeness codes                      |
| `BALANCE_MISMATCH`              | `reconciliation_failed` |                                                   |
| `SIGN_AMBIGUITY`                | `verification_rejected` | Detail in `ambiguityCodeSchema.debit_credit_sign` |
| `AMOUNT_AMBIGUITY`              | `verification_rejected` | Detail in `ambiguityCodeSchema.amount_digits`     |
| `SOURCE_LINK_MISSING`           | `verification_rejected` | Detail in completeness `unmapped_rows`            |
| `UNSUPPORTED_LAYOUT`            | `layout_not_recognized` |                                                   |
| `INSUFFICIENT_BALANCE_EVIDENCE` | `reconciliation_failed` | Rejection reason distinguishes it                 |
| `PROCESSING_ERROR`              | `internal_error`        |                                                   |

Three adjacent taxonomies also exist and are unchanged: `ambiguityCodeSchema` (12 codes), `fileVerificationStateSchema` (9 states), and the completeness codes (strings, not an enum).

## Analytics: PRD §58 names versus the code

PRD §58 proposes 17 event names. The existing 22 already cover the funnel and are live in Plausible. Renaming them would break both the dashboard history and the running headline experiment's server-log attribution, so the existing names stand and only genuinely missing events are added.

| PRD §58                          | Existing                | Action                       |
| -------------------------------- | ----------------------- | ---------------------------- |
| `homepage_view`                  | `page_view`             | Existing, covers all paths   |
| `converter_cta_click`            | `cta_clicked`           | Existing, carries `location` |
| `file_picker_open`               | —                       | **Added**                    |
| `conversion_started`             | `extraction_started`    | Existing                     |
| `conversion_rejected_input`      | `file_rejected`         | Existing                     |
| `conversion_processing_error`    | `extraction_failed`     | Existing                     |
| `conversion_verification_failed` | `reconciliation_failed` | Existing                     |
| `conversion_verification_passed` | `reconciliation_passed` | Existing                     |
| `verification_preview_viewed`    | `preview_viewed`        | Existing                     |
| `source_reference_opened`        | —                       | **Added**                    |
| `pricing_viewed`                 | —                       | **Added**                    |
| `checkout_started`               | `checkout_clicked`      | Existing                     |
| `checkout_returned_paid`         | `payment_confirmed`     | Existing                     |
| `checkout_returned_unpaid`       | `checkout_failed`       | Existing                     |
| `export_started`                 | `export_requested`      | Existing                     |
| `export_completed`               | `export_downloaded`     | Existing                     |
| `refund_link_clicked`            | —                       | **Added**                    |

## Unit economics for the $19 price (§13)

`PARSER_PROVIDER` defaults to `"none"` and `parserProviderConfigured()` returns false without an API key. Confirmed in production on 2026-08-25 via `/api/health`, which reported `"parserProvider": "none"` and `"parserDeterministicOnly": true`, so the shipped path is the deterministic parser with no per-pack model cost. Marginal cost of a successful pack is the Stripe fee (roughly $0.85 on $19) plus serverless compute for parse, checkout, and export. The price is comfortably positive and §17's price transparency is therefore economically approved.

This holds only while no paid provider is enabled in production, and that is a snapshot rather than a guarantee: enabling a provider is an environment-variable change that needs no deploy and touches no file in this repository. `/api/health` reports the effective value, so re-check it there rather than inferring it from the code.
