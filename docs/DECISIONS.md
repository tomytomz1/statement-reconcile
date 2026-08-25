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

## ADR-011 — 26 SEO pages, not 20 (superseded by ADR-015)

**Superseded 2026-08-25.** The set is now 21 pages; see ADR-015. Retained because it records why the six pages beyond the required twenty were added in the first place, and three of those six survived consolidation.

The 20 URLs required by the PRD are present. Six additional distinct pages cover adjacent intents (Google Sheets, accountants, QuickBooks/Xero CSV _import_, business statements, extract-from-PDF) without claiming QBO/OFX export.

## ADR-014 — Public price, superseding the price-reveal boundary (PRD v2 §17)

**Supersedes the V1 decision to withhold the amount until a pack had passed.**

V1 revealed the price only at the verified-result paywall, on the theory that the customer's own verification result was what sold it. Two unit tests and two e2e assertions enforced the absence of the amount from every public surface.

That is now reversed. The visitor sees `$19` in the hero, the upload card, the offer block, the final CTA, the pricing page, and the landing-page template.

The reasoning is that the old boundary asked someone to hand a bank statement to an unknown tool in order to find out what it charges. For the target customer — a bookkeeper putting a client's financial documents through a service they have not used before — that is the wrong order. The commercial terms are the cheapest thing to disclose and the most reassuring to see early.

The economics were checked before publishing rather than assumed. Production `/api/health` reported `"parserProvider": "none"` on 2026-08-25, so a successful pack costs the Stripe fee (roughly $0.85 on $19) plus serverless compute, not a model call. Enabling a provider is an env-var change that needs no deploy, so re-check `/api/health` rather than assuming the code still describes production.

Note that production also has `STRIPE_PRICE_ID` set, so the billed amount comes from a Stripe dashboard Price. The published price and the charged price are therefore two values in two systems, and only the first is guarded by tests.

The guardrails were inverted rather than deleted. `tests/unit/claims.test.ts` now asserts that any price in public copy derives from `siteConfig.price`, so a literal amount typed into a component fails the build. What a customer reads and what Stripe charges cannot drift apart.

`SoftwareApplication` gains an `Offer` node, which §50 requires now that the price is visible content. There is still no `AggregateRating` and no `Review`.

## ADR-015 — One landing page per distinct intent (PRD v2 §43, §45)

Twenty-six landing pages became twenty-one. Three clusters were collapsing their own signals: five URLs for "bank statement to Excel", four for the CSV mirror, three for "transaction extractor" with the qualifiers reordered.

The pages were not thin — `pnpm audit:seo` fails the build on duplicate titles, descriptions, or prose, so each was a genuinely distinct document. The problem was that several distinct documents answered the same search.

Consolidating on day one was deliberate. §45 asks for Search Console data before deciding redirects, and none exists: the site launched 2026-08-25. That absence is the argument for acting rather than waiting — there is no equity to lose now, and the same merge gets more expensive as pages age and acquire links.

Retired slugs redirect in a single hop via `RETIRED_SLUG_REDIRECTS` in `next.config.ts`. Next emits 308 for `permanent: true`, which Google treats as equivalent to 301. `tests/unit/redirects.test.ts` enforces that every destination is live and never itself a source, because `dynamicParams = false` means a missing entry is a dead URL rather than a warning.

Full inventory and classification in `docs/seo-url-migration-v2.md`.
