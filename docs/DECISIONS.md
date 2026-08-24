# Architecture decisions

Decisions below are the defaults chosen so the build could continue without pausing for approval. Reversible unless noted.

## ADR-001 — Next.js 16 App Router on Vercel

One deployable web application. App Router, React 19, TypeScript strict (`noUncheckedIndexedAccess`), Tailwind CSS 4. The Next 16 request interceptor is `src/proxy.ts` (the replacement for `middleware`). Route handlers live under `src/app/api/`.

## ADR-002 — No application database in V1

Entitlement is Stripe Checkout Session verification plus a SHA-256 digest of the canonicalized statement. The browser holds a sealed envelope in IndexedDB. Adding a database would create a statement-data store we have explicitly refused.

## ADR-003 — Decimal.js for money

All reconciliation and export amounts are exact decimals. JavaScript `number` is never used for statement arithmetic.

## ADR-004 — Deterministic parser first, provider second

The free, auditable parser runs on every request. An LLM provider is called only when the deterministic path cannot produce a reconciling result, a provider is configured, and the failure is not terminal (scanned, encrypted, multi-account, oversized). The reconciliation engine is the only thing that may mark a result `passed`.

## ADR-005 — AES-GCM sealing with digest-bound key

`EXPORT_SEAL_SECRET` derives an AES-256-GCM key from the result digest. Stripe records that digest. Export requires a paid session for that digest _and_ an envelope that opens under it. Without the secret, the envelope is plaintext but still payment-gated; `pnpm run doctor` reports the weaker mode.

## ADR-006 — In-memory rate limit in development, fail-closed in production

Production without Upstash (or compatible) credentials refuses `/api/parse` rather than serving an unmetered provider endpoint.

## ADR-007 — pnpm, Vitest, Playwright, ExcelJS, pdfjs-dist, Zod 4, Stripe SDK

All are maintained, commercially usable, and Vercel-compatible at build time. Parser providers are spoken with `fetch`, not vendor SDKs, so request bodies are not logged by an SDK.

## ADR-008 — Homepage SEO vs differentiator

The `<title>` and H1 target **Bank Statement Converter** / **Convert Bank Statements to Excel & CSV**. “See whether the numbers balance before you pay” is the supporting differentiator, never the H1.

## ADR-009 — QBO / OFX / OCR flagged off

Modules can be added later. V1 never advertises a disabled format. Scanned PDFs are rejected with the copy specified in the PRD.

## ADR-010 — Stripe Checkout, one-time $19, no customer account

Inline `price_data` is used when `STRIPE_PRICE_ID` is absent so local development works with only a secret key. A dashboard Price is preferred in production.

## ADR-012 — Verified subset pack behavior (Section 41)

Checkout is available only for files the customer has explicitly kept, and every kept file must be `verification_passed`. A failed or ambiguous file is never dropped from a paid pack automatically. Removing it is a customer action and produces a new canonical pack digest.

Schema version is 2. Provenance, completeness, ambiguity, and the verification state participate in the file digest. Stripe binds to the pack-manifest digest.

## ADR-013 — In-memory PDF bytes for source inspection

The original PDF still never leaves the browser and is never written to IndexedDB. Bytes are held in RAM for the job TTL so the preview can highlight source regions. They are zeroed when the job is discarded.

## ADR-011 — 26 SEO pages, not 20

The 20 URLs required by the PRD are present. Six additional distinct pages cover adjacent intents (Google Sheets, accountants, QuickBooks/Xero CSV _import_, business statements, extract-from-PDF) without claiming QBO/OFX export.
