# V2 Phase 1 — closure audit

Closes the repository audit punch-out. Starting commit `a6e8ed9`; the working tree was clean before any change.

> **Superseded in part.** A later independent review (`docs/v2-phase1-final-acceptance.md`) found
> several items below overstated. Where the two disagree, the acceptance contract wins. In
> particular the platform and live-purchase items were marked PASS here and are correctly
> **BLOCKED**; see the corrected statuses in that document.

## Which commit is where

These are different things and the distinction matters when reading anything below.

|                                     | Commit                                     | State                                                                                            |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Production**                      | `dd06bb55ace421b642dcf51bd8437936bb40eab4` | Live at `https://statementreconcile.com`. This is the commit the punch-out work was deployed at. |
| **Local acceptance implementation** | after `dd06bb5`, unpushed                  | The A1–A9 acceptance work and this correction pass. **Not deployed and not pushed.**             |

So every A1–A9 change — the Price gate, unified session authorization, the recovery link, the
exact 20 MB contract, the single pack-ordering rule, production seal fail-closed, and
`pnpm verify:release` — exists **only locally**. Production is still running `dd06bb5` and does
not have them. Anything below describing current behaviour describes the local tree unless it
explicitly says production.

Nothing in this pass was deployed, pushed, or merged, and no live Stripe configuration was modified.

---

## Closure matrix

| #    | Item                                             | Status      | Evidence                                                                                                                                       |
| ---- | ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1 | One authoritative $19 configuration              | **PASS**    | `src/config/commerce.ts`; Price validated before checkout and session terms validated before export; 20 tests in `tests/unit/commerce.test.ts` |
| P0-2 | Remove stale delayed-price copy                  | **PASS**    | 6 stale strings replaced; repo-wide guard in `tests/unit/claims.test.ts`                                                                       |
| P0-3 | Price beside the `/app` uploader                 | **PASS**    | `UploaderOffer` in `converter-app.tsx`; scoped E2E assertions replace body-level ones                                                          |
| P0-4 | Separate processing chrome from marketing footer | **PASS**    | `src/components/site/processing-footer.tsx`; three layout E2E tests                                                                            |
| P0-5 | Correct the 30-day download claim                | **PASS**    | Copy corrected; pack digest made order-stable; 10 tests in `tests/unit/pack-recovery.test.ts`                                                  |
| P0-6 | Complete limit enforcement and boundary tests    | **PASS**    | 18 tests in `tests/unit/limits.test.ts` exercising `validateFile` and the request schema directly                                              |
| P0-7 | Adversarial checkout/export tests                | **PASS**    | 18 tests in `tests/unit/payment-boundary.test.ts`; unit suite now seals for real                                                               |
| P1   | Test quality and coverage gates                  | **PASS**    | Per-module thresholds in `vitest.config.mts`, enforced in CI; `security/headers.ts` taken from 0% to covered                                   |
| P0   | Restore a genuinely green release gate           | **PARTIAL** | Green locally and behind one `pnpm verify:release`, but CI is not a required check and production still deploys on push — see A10              |
| —    | Documentation updates                            | **PASS**    | Node version, test counts, retention semantics, and price-divergence claims corrected                                                          |

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

Every command run on the final tree:

| Command                    | Result                                                         |
| -------------------------- | -------------------------------------------------------------- |
| `pnpm format:check`        | **pass** — all matched files use Prettier code style           |
| `pnpm lint`                | **pass** — eslint, `--max-warnings=0`                          |
| `pnpm typecheck`           | **pass** — `tsc --noEmit`                                      |
| `pnpm test`                | **pass** — 30 files, 365 tests                                 |
| `pnpm test:coverage`       | **pass** — thresholds enforced; verified to fail when raised   |
| `pnpm benchmark:synthetic` | **pass** — 99/99 dispositions, precision 1.0000, recall 1.0000 |
| `pnpm audit:seo`           | **pass** — 21 landing pages                                    |
| `pnpm build`               | **pass** — compiled successfully                               |
| `pnpm test:e2e`            | **pass** — 24 tests (chromium + mobile)                        |

Test count went from 286 at the start of this pass to **365**.

Coverage on the security-critical modules:

| Module                                   | Statements | Branches |
| ---------------------------------------- | ---------- | -------- |
| reconciliation                           | 99.05%     | 89.51%   |
| verification                             | 92.76%     | 84.28%   |
| schema (pack assembly/opening)           | 89.14%     | 88.76%   |
| security (headers, rate limit, origin)   | 73.64%     | 64.80%   |
| export                                   | 77.62%     | 66.32%   |
| payments (checkout, entitlement, unseal) | 57.05%     | 56.14%   |

`payments` is the lowest and knowingly so: `stripe.ts` is largely client construction and one network retrieval. The decision logic inside it is `matchOfferAgainstPrice`, which is pure and fully covered.

### One correction worth recording

The audit found `pnpm format:check` failing on 14 tracked files. A note in the working memory for this repository claimed those failures were a CRLF artefact of `core.autocrlf=true` and advised against running `pnpm format`. **That note was wrong.** Diffing prettier's output against the working copy with carriage returns stripped from both sides left real line-length reflow. Acting on the note meant committing unformatted code that failed the repository's own release command — and because production deploys from `main`, that code was live. The note has been corrected.

---

## Remaining manual actions

None of these can be completed from the repository.

1. **Stripe dashboard.** `assertStripePriceMatchesOffer` fails checkout closed unless the configured Price is active, one-time, 1900, and USD. Still **not verified against live Stripe**. `pnpm run price:preflight` now performs that check read-only, with no session and no charge — run it with production credentials before relying on checkout.
2. **GitHub branch protection.** The punch-out asks that CI be required before production deployment. This cannot be set from the repository. Production currently deploys on push to `main` via the Vercel Git integration, which does not wait for the GitHub check. To close it: enable a branch protection rule on `main` requiring the `verify` check, and either set the Vercel project to "only deploy when checks pass" or move production deploys behind a manual promote.
3. **Live purchase test.** Still outstanding from the earlier checklist: one real $19 purchase of your own statement, export XLSX and CSV, then refund. The E2E funnel uses `E2E_MOCK_PAYMENTS`, so nothing in the automated suite proves a real card works end to end.

---

## Risks

**Pack digest change.** Sorting the manifest changes the pack digest for any multi-file pack. Single-file packs are unaffected. No purchase has been made against the old ordering, so nothing existing is invalidated — but had this shipped after a real multi-file sale, that customer's entitlement would have become unredeemable. It is order-stable from here on.

**Coverage thresholds are a floor, not a target.** `payments` at 55% statements will pass while real gaps remain in `stripe.ts` and `entitlement.ts`. The threshold prevents regression; it does not assert sufficiency.

**Provider determinism is assumed, not enforced.** Re-upload recovery depends on identical canonical output for identical PDFs. Nothing in the code prevents enabling a probabilistic provider, and nothing would fail loudly if one were enabled — the symptom would be paying customers unable to recover files. See the standing condition above.
