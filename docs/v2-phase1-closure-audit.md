# V2 Phase 1 — closure audit

Closes the repository audit punch-out. Starting commit `a6e8ed9`; the working tree was clean before any change.

> **Historical audit, now fully closed.** A later independent review
> (`docs/v2-phase1-final-acceptance.md`) corrected several overstatements and governed the final
> acceptance pass. Codex subsequently verified A1–A11, including the production gate and live
> purchase/export/recovery/refund test. The acceptance contract is the final source of truth.

## Which commit is where

These are different things and the distinction matters when reading anything below.

|                                        | Commit                                     | State                                                                                                |
| -------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Production**                         | `93b55404155dafbf8ccd727723854fe0ac16497f` | Verified live at `https://statementreconcile.com`; Vercel deployment `4WRAHmcotfDfRPib7j8eQsbYRHoe`. |
| **Repository (`main`, `origin/main`)** | `93b55404155dafbf8ccd727723854fe0ac16497f` | Final verified implementation; clean and synchronized before this documentation closeout.            |

The Price gate, unified session authorization, recovery link, exact 20 MB contract, single
pack-ordering rule, production seal fail-closed behavior, release gate, and pdf.js worker build fix
are all deployed. The final acceptance contract records the independent code, CI, production, and
live-payment evidence.

---

## Closure matrix

| #    | Item                                             | Status   | Evidence                                                                                                                                       |
| ---- | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | One authoritative $19 configuration              | **PASS** | `src/config/commerce.ts`; Price validated before checkout and session terms validated before export; 20 tests in `tests/unit/commerce.test.ts` |
| P0-2 | Remove stale delayed-price copy                  | **PASS** | 6 stale strings replaced; repo-wide guard in `tests/unit/claims.test.ts`                                                                       |
| P0-3 | Price beside the `/app` uploader                 | **PASS** | `UploaderOffer` in `converter-app.tsx`; scoped E2E assertions replace body-level ones                                                          |
| P0-4 | Separate processing chrome from marketing footer | **PASS** | `src/components/site/processing-footer.tsx`; three layout E2E tests                                                                            |
| P0-5 | Correct the 30-day download claim                | **PASS** | Copy corrected; pack digest made order-stable; 10 tests in `tests/unit/pack-recovery.test.ts`                                                  |
| P0-6 | Complete limit enforcement and boundary tests    | **PASS** | 18 tests in `tests/unit/limits.test.ts` exercising `validateFile` and the request schema directly                                              |
| P0-7 | Adversarial checkout/export tests                | **PASS** | 18 tests in `tests/unit/payment-boundary.test.ts`; unit suite now seals for real                                                               |
| P1   | Test quality and coverage gates                  | **PASS** | Per-module thresholds in `vitest.config.mts`, enforced in CI; `security/headers.ts` taken from 0% to covered                                   |
| P0   | Restore a genuinely green release gate           | **PASS** | `pnpm verify:release` passed locally and in CI; Vercel automatic builds are skipped and production promotion is deliberate — see A10           |
| —    | Documentation updates                            | **PASS** | Node version, test counts, retention semantics, and price-divergence claims corrected                                                          |

---

## P0-1 — the authoritative price flow

**Before.** `siteConfig.price` came from `NEXT_PUBLIC_PRICE_USD`, inlined at build time. Production checkout used `STRIPE_PRICE_ID`, configured independently in the Stripe dashboard. `verifyEntitlement` read `amount_total` and `currency` into the entitlement object and never compared them to anything. Nothing reconciled the two systems, and comments in `structured-data.ts` and `claims.test.ts` asserted a guarantee that did not exist.

**After.** One contract in `src/config/commerce.ts`, with no environment reads:

```
product:  Verified Conversion Pack
amount:   1900 cents
currency: usd
billing:  one_time
max pages: 50
```

The flow, end to end:

1. `COMMERCIAL_OFFER` is the only definition. `siteConfig.price` and `siteConfig.limits.maxPages` derive from it; `NEXT_PUBLIC_PRICE_USD` and `NEXT_PUBLIC_MAX_PAGES` no longer override anything.
2. Rendering uses `publicOffer`, a projection that exposes `$19` and never minor units.
3. JSON-LD `Offer` reads the same projection.
4. **Before checkout**, `assertStripePriceMatchesOffer()` retrieves the configured Price and fails closed unless it is the expected id, active, `one_time`, exactly 1900, and `usd`. A pass is cached for five minutes so the round trip stays off nearly every checkout; failures are never cached, and a failure clears any cached pass. The export-time session check is independent of this cache and is never memoized.
5. Without `STRIPE_PRICE_ID`, the inline `price_data` is built from the same contract, so it cannot diverge by construction.
6. **After payment**, `verifyEntitlement` checks `payment_status === "paid"`, then `matchOfferAgainstSessionTerms` (amount 1900, currency usd), then the digest in constant time. A terms mismatch returns `terms_mismatch`.
7. **Export** re-runs all of that on every download, so a Price changed between checkout and export is caught.
8. The client supplies only `jobId`, `digest`, `sealed`, `pageCount`, `fileCount`. No amount, currency, or Price ID is accepted from the browser — `createCheckoutSchema` has no field for one.

---

## The verification predicate

Unchanged by this work, restated for the record. A statement is sellable only when `evaluateVerificationGate()` returns `passed`, which requires **all five**:

1. completeness passed;
2. every accepted row traced to source;
3. zero unresolved material ambiguities;
4. running balances passed;
5. `reconcile()` passed — every non-advisory structural check holds, at least one balancing method applied, and every applicable method passed.

Zero applicable balancing methods is a rejection, never a pass.

---

## Checkout and export binding

Both gated routes call `openSealedResult(sealed, digest)`, which:

1. unseals the AES-GCM envelope under the digest (wrong digest, wrong key, no plaintext);
2. re-canonicalizes and re-digests, requiring an exact reproduction;
3. re-runs the full verification gate on every file from scratch;
4. **new:** re-derives every manifest claim from the opened statement — page count, transaction count, statement type, file-level digest — and checks `fileCount` and `totalPages` against the opened contents.

Point 4 is defence in depth. The manifest is already digest-bound, so a mismatch should be unreachable; `tests/unit/payment-boundary.test.ts` includes a self-consistent tampered envelope presented under its own recomputed digest, which only that check catches.

---

## The 60-minute and 30-day behaviour

The ten questions from the punch-out, answered:

1. **What survives for 30 days?** The Stripe entitlement only — the right to download, keyed to the paid session and its digest. `ENTITLEMENT_TTL_MS`.
2. **What expires after 60 minutes?** The sealed converted result in this browser's IndexedDB. `siteConfig.limits.localJobTtlMinutes`.
3. **What happens to the local job once a file is downloaded?** Nothing automatically. Downloading does **not** delete the local job — the pack ships as four separate files and a customer may take them one at a time. The job is removed by the explicit "Delete my data now" control, or at the 60-minute TTL, whichever comes first. The in-memory PDF bytes are zeroed when the job is discarded.
4. **What does the server retain?** No PDF, no extracted text, no statement archive, no account. Stripe holds the session with a digest in metadata and coarse counts — never a balance, description, date, bank name, or filename.
5. **What must the customer retain?** Two things, and both are required: the **recovery link** offered on the download page, which carries the Checkout Session reference, and the **same original PDFs**. A Stripe receipt number or a card-statement descriptor is not a substitute — neither can be entered into the application, because we hold no record to look either one up against. Missing either one, the route is support (refund or re-issue), not recovery.
6. **Same device, within the hour?** The local result is still there; re-download directly.
7. **Same device, after the hour?** Re-upload the same PDFs. The pack is re-verified, the digest recomputed, matched to the paid session, and the download returns without a second charge.
8. **Another device?** Same as (7) — nothing is device-bound except the local copy. The recovery link and the original PDFs both have to be carried across.
9. **Recovering the session reference?** Only from the recovery link the customer saved. There is no in-application lookup: the Stripe receipt email does not carry the Checkout Session id, and a card-statement descriptor certainly does not. Those references are still worth sending to **support**, who can find the payment in Stripe and refund or re-issue — but that is a human path, not the recovery flow.
10. **Does re-upload require the same file order?** **No, as of this change.** The manifest is sorted by file-level content digest before the pack digest is computed, so identity is a function of contents alone. Previously it was input-ordered, which meant the same statements picked in a different order produced a different digest and a paying customer could be refused their own files.

**Provider nondeterminism.** `PARSER_PROVIDER` is `none` in production (`/api/health` reports `parserDeterministicOnly: true`), so the deterministic parser produces identical canonical output for identical input and re-upload recovery is sound. **If a probabilistic provider is ever enabled, this claim must be re-examined before it is advertised** — a provider that produces even slightly different canonical output would break digest reproduction, and the recovery copy would become false. Recorded here as a standing condition rather than a resolved item.

---

## Limits, and where each is enforced

| Limit                           | Enforced                                                                                             | Why there                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 20 MB per original PDF          | **Browser only** (`validateFile`)                                                                    | The PDF bytes never reach the server. A server-side byte check is impossible by design, and claiming one would be false. |
| 50 pages per pack               | Browser, Zod `superRefine` across files, both routes, `packManifestSchema`, and re-checked on unseal | Extracted text does cross the boundary, so a direct API caller must be stopped there.                                    |
| Items / characters / body bytes | Server (`PAYLOAD_LIMITS`)                                                                            | Independent of page count; bounds the request regardless of what the client claims.                                      |

`tests/unit/limits.test.ts` covers each boundary exactly: at the limit, one over, zero-byte, MIME/extension combinations, declared-count mismatch, non-sequential pages, and the per-page and per-item ceilings.

---

## Release gate

Two sets of numbers appear below and they are not interchangeable. The first is what the punch-out pass produced. The second is what the current local tree produces after the A1–A9 acceptance work and its correction passes, independently reproduced. Anything citing this document for "current" results wants the second table.

### Current — verified production tree

Reproduced under Node 22 and pnpm 11.23.0 via the single `pnpm verify:release` command.

| Command                    | Result                                                  |
| -------------------------- | ------------------------------------------------------- |
| `pnpm format:check`        | **pass**                                                |
| `pnpm lint`                | **pass**                                                |
| `pnpm typecheck`           | **pass**                                                |
| `pnpm test:coverage`       | **pass** — 33 files, **422 tests**, thresholds enforced |
| `pnpm benchmark:synthetic` | **pass** — 99/99, precision 1.0000, recall 1.0000       |
| `pnpm audit:seo`           | **pass** — 21 landing pages                             |
| `pnpm build`               | **pass**                                                |
| `pnpm test:e2e`            | **pass** — **28/28**, two workers                       |

Overall coverage: **70.07% statements, 63.02% branches**.

The test count was independently reproduced at **419** on commit `cd15d32`; this correction pass added three claims-guard tests, giving 422. Coverage percentages are unchanged, because the additions assert over documentation rather than over `src/lib`.

`payments` is now **82.31% statements / 77.39% branches**, raised by the A1 and A2 branch tests — deterministic Price-gate cases and route-level recovery authorization — rather than by excluding files.

E2E runs at two workers deliberately. At the default four, independent verification saw 22/4 and 24/2 while the same tests passed in isolation and the full suite passed at two; the failures were timeouts on unrelated static pages, which is one Next dev server compiling routes for several workers at once, not a product defect. See `playwright.config.ts`.

### Historical — punch-out pass only

**Superseded. Do not cite these as current.** They describe the tree at the end of the punch-out pass, before the A1–A9 acceptance work existed.

| Command                    | Result at that time                                      |
| -------------------------- | -------------------------------------------------------- |
| `pnpm format:check`        | pass                                                     |
| `pnpm lint`                | pass                                                     |
| `pnpm typecheck`           | pass                                                     |
| `pnpm test`                | pass — 30 files, 365 tests                               |
| `pnpm test:coverage`       | pass — thresholds enforced; verified to fail when raised |
| `pnpm benchmark:synthetic` | pass — 99/99, precision 1.0000, recall 1.0000            |
| `pnpm audit:seo`           | pass — 21 landing pages                                  |
| `pnpm build`               | pass                                                     |
| `pnpm test:e2e`            | pass — 24 tests (chromium + mobile)                      |

Test count at that point had gone from 286 to 365. Module coverage then:

| Module                                   | Statements | Branches |
| ---------------------------------------- | ---------- | -------- |
| reconciliation                           | 99.05%     | 89.51%   |
| verification                             | 92.76%     | 84.28%   |
| schema (pack assembly/opening)           | 89.14%     | 88.76%   |
| security (headers, rate limit, origin)   | 73.64%     | 64.80%   |
| export                                   | 77.62%     | 66.32%   |
| payments (checkout, entitlement, unseal) | 57.05%     | 56.14%   |

The `payments` figure in that table is the one the A1/A2 tests later moved to 82.31%.

### One correction worth recording

The audit found `pnpm format:check` failing on 14 tracked files. A note in the working memory for this repository claimed those failures were a CRLF artefact of `core.autocrlf=true` and advised against running `pnpm format`. **That note was wrong.** Diffing prettier's output against the working copy with carriage returns stripped from both sides left real line-length reflow. Acting on the note meant committing unformatted code that failed the repository's own release command — and because production deploys from `main`, that code was live. The note has been corrected.

---

## Final manual actions — completed

1. **Stripe Price:** the read-only production preflight verified the configured live Price is active,
   one-time, 1900 cents, and USD.
2. **Deployment gate:** Vercel now skips automatic builds. The verified production deployment was
   promoted deliberately after CI passed, then the skip gate was restored.
3. **Live acceptance:** a real $19 payment completed for a synthetic statement; all four export
   requests succeeded; re-upload recovery restored the paid result without another checkout; and
   Stripe confirmed the full refund.

Phase 1 has no remaining acceptance blocker. See `docs/v2-phase1-final-acceptance.md` for the
privacy-safe evidence record.

---

## Risks

**Pack digest change.** Sorting the manifest changes the pack digest for any multi-file pack. Single-file packs are unaffected, because a one-file manifest has only one possible ordering.

**Whether any multi-file purchase used the earlier ordering is unknown.** No Stripe evidence was obtained, and none is claimed here. An earlier version of this document asserted that no purchase had been made against the old ordering; that assertion had nothing behind it and has been removed. Server-side logs cannot answer the question either — the pack digest is recorded in Stripe session metadata, so establishing this requires querying Stripe for sessions created before the ordering change and inspecting their `fileCount` metadata.

If such a purchase exists, its symptom is specific and recognisable: the customer re-uploads the same PDFs, everything verifies, and the download is still refused because the recomputed pack digest no longer matches the one recorded at payment. Handle it as a support case rather than a bug report — verify the payment in Stripe, then re-issue the conversion against the current ordering or refund, whichever the customer prefers. Do not tell them their files are unrecoverable; the data is fine and the mismatch is ours.

Ordering is stable from here on, so this is a bounded, one-time window rather than an ongoing risk.

**Coverage thresholds are a floor, not a target.** `vitest.config.mts` requires `src/lib/payments/**` to hold 80% statements, 75% branches, 82% functions, and 83% lines. Measured coverage is 82.31% statements and 77.39% branches — above the floor, but only by about two points on each. The gate would still pass after a change that removed a meaningful amount of payment-path testing.

Two things that number cannot tell you. The thresholds apply to the directory in aggregate, so an individual file may sit below them while the directory passes: `stripe.ts` is at 71.42% functions against a directory floor of 82%. And the lines that remain uncovered are not incidental — they include the inline `price_data` fallback in `lineItem()`, the branch that builds the charge from `COMMERCIAL_OFFER` when no dashboard Price is configured, and the digest-mismatch branch of `verifyEntitlement` on the real-Stripe path as opposed to the mocked one.

The threshold prevents regression. It does not assert that payment behaviour is sufficiently tested, and nothing in this document should be read as claiming it does.

**Provider determinism is assumed, not enforced.** Re-upload recovery depends on identical canonical output for identical PDFs. Nothing in the code prevents enabling a probabilistic provider, and nothing would fail loudly if one were enabled — the symptom would be paying customers unable to recover files. See the standing condition above.
