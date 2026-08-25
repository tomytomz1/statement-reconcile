# PRD v2 — implementation plan

Companion to `docs/product-baseline-before-prd-v2.md`. Scope is PRD Phase 0, Phase 1, and the SEO consolidation of Phase 2. Phases 3–7 (QuickBooks output, correctable exceptions, verified OCR, larger packs, the accuracy benchmark) are explicitly out of scope per §114.

## Decisions taken before implementation

Four questions were resolved with the product owner rather than assumed.

| Question                         | Decision                                                              | Consequence                                                                         |
| -------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Price reveal (§17)               | Reverse the shipped price-reveal boundary; `$19` becomes public       | Two unit tests and two e2e assertions invert; a new ADR supersedes the old decision |
| Headline experiment (§22 vs §81) | Reseat to the §81 Test 1 pair, 50/50, restart the 200/50 window       | ~1 day of a/b/c data is discarded; acceptable because the test began 2026-08-25     |
| Scope                            | Phase 0 + Phase 1 + SEO audit, then consolidation as a separate stage | Offer work and redirect work stay independently reviewable                          |
| SEO timing (§45)                 | Consolidate now rather than wait for Search Console                   | Equity is ~zero today; the same merge costs more once pages age and acquire links   |

## Invariants this work does not touch

Confirmed by reading the code, not by assumption:

- `reconcile()` in `src/lib/reconciliation/reconcile.ts` remains the sole authority on `passed`.
- `evaluateVerificationGate()` in `src/lib/verification/gate.ts` remains the acceptance gate, requiring completeness, full source-link coverage, zero unresolved ambiguity, running balances, and arithmetic.
- `src/app/api/export/route.ts` continues to re-open the sealed envelope and re-run the entire gate on every download.
- `contentSecurityPolicy()` keeps `connect-src 'self'` on `/app` and `/checkout`. No analytics origin is ever added there.
- No accounts, no statement persistence, no third-party runtime script on the processing route.
- Marketing may not claim OCR, `.QBO`, or bank-specific validation while `flags.ocr`, `flags.qbo`, and `flags.bankSpecificClaims` are false.

## Stage 1 — Phase 1

### 1a. Price transparency (§17, §22, §23, §32, §41)

`siteConfig` gains `priceLine`, derived from `price.display` so the number exists in exactly one place. Rendered in the hero CTA microcopy, the hero upload component, the offer card, the final CTA, the pricing page, and the shared landing-page template (which means all landers inherit it without touching their data files).

`src/lib/seo/structured-data.ts` gains an `Offer` node on `SoftwareApplication`. It was deliberately omitted while the price was private; §50 requires price schema to match visible content, so it becomes required rather than forbidden. Still no `AggregateRating` and no `Review` — the product has neither.

The guardrail tests invert rather than disappear. `tests/unit/claims.test.ts` stops asserting the absence of a price and starts asserting that any price in public copy is derived from `siteConfig.price.display`, so a hardcoded `$19` that drifts from the Stripe amount still fails the build. The `FORBIDDEN` overclaim list is untouched.

### 1b. Headline reseat (§81 Test 1)

`CopyVariant` narrows from three values to two. Variant `a` is the SEO-safe control carrying the §22 H1; variant `b` is the aggressive direct-response line from §11. Assignment moves to a 50/50 split of the same FNV-1a hash of `sr_sid`, so the mechanism, the header, and the server-log stamping are unchanged.

### 1c. Homepage restructure (§21)

The current page reaches its proof demonstration in position 8, behind three prose sections that make overlapping arguments. The §21 information architecture moves proof to position 3 and adds the catch-up bookkeeping, avatar, and supported/unsupported sections. `ProblemAgitation` and `ReasonWhy` merge into the single §26 problem section.

`siteConfig.primaryCta` becomes "Verify My Statements Free" — §20 rejects "Check My Statements" because "check" does not describe the value exchange. `verifiedCta` stays as it is; it appears only after a pass, where "get" is the accurate verb.

`siteConfig.ownedCategory` was defined but never rendered. It becomes the hero eyebrow.

### 1d. Product state copy (§37–§40)

The failure panel already carries per-code remedies, which is most of what §37 asks for. What it lacks is a prominent "You have not been charged", a machine-safe statement of what stopped verification, and a support code for genuine infrastructure failures. The support code is derived from the error code and a random suffix — never from statement content.

The download panel's claim that files can be re-downloaded from the device for 30 days is corrected: the local copy expires within the hour, and the 30-day entitlement is redeemed by re-uploading the same files.

### 1e. Navigation and footer (§78, §87, §88)

Primary navigation gains "For Bookkeepers". A mobile menu is added — below the `md` breakpoint the site currently has no navigation at all, which §78 does not permit. The footer's 26-link conversion directory collapses to the §88 groups.

### 1f. Analytics (§58)

The existing 22-event taxonomy is kept. It is already type-enforced as the privacy contract and live in Plausible, and renaming it would break both the dashboard history and the headline experiment's server-log attribution. Four genuinely missing events are added: `file_picker_open`, `source_reference_opened`, `pricing_viewed`, `refund_link_clicked`. The full name mapping is in the baseline document.

### 1g. Bookkeeper positioning (§42)

The accountants lander is rewritten to the §42 structure and moves to `/bank-statement-converter-for-bookkeepers`, which matches the target avatar's language. The old URL 301s. §42 permits either retaining or redirecting; redirecting is chosen because equity is zero today.

## Stage 2 — SEO consolidation

Documented in full in `docs/seo-url-migration-v2.md`. Twenty-six landers become eighteen through three merges, then three §47 use-case pages are added, ending at twenty-one.

Order matters because `dynamicParams = false` means a slug 404s the moment its data file is deleted. Redirects land first, then the data files go, then every surviving page's `related` array is swept for links into retired slugs — a `related` link pointing at a 301 is exactly the redirect chain §100 forbids.

## Verification

Each stage runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit:seo`, and `pnpm build`, then `pnpm test:e2e` with no stray dev server on port 3000.

`pnpm format:check` fails locally on Windows for line-ending reasons unrelated to this work. See the baseline document.
