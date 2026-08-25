# Statement Reconcile V2 Phase 1 — final acceptance contract

This file is the shared source of truth for the final Phase 1 closure pass. It replaces chat
summaries, self-reported completion claims, and the earlier closure matrix wherever they disagree.

## Control information

- Implementation baseline: `e91d746b8f636c4d8420baff39dbc8cf07b89db9`
- Production at contract creation: `dd06bb55ace421b642dcf51bd8437936bb40eab4`
- Contract owner and independent verifier: Codex
- Implementer: Claude Code
- Production origin: `https://statementreconcile.com`
- Scope: only the open acceptance items below

The acceptance criteria are frozen for this pass. Claude may add implementation evidence but must
not weaken, delete, reinterpret, or mark a requirement VERIFIED. If current code makes a criterion
impractical, record the exact blocker and continue with every other item.

## Status rules

- `OPEN`: not yet implemented.
- `IMPLEMENTED`: Claude completed the work and supplied code and test evidence.
- `VERIFIED`: Codex independently reviewed the diff and reran the evidence.
- `BLOCKED`: requires an owner decision, production credential, or platform change. A blocker must
  state exactly what is missing and must not be used for repository work that can still be done.

Claude may change `OPEN` to `IMPLEMENTED` and populate its evidence column. Only Codex may set
`VERIFIED`. Passing tests alone does not override a false public claim or incomplete live check.

## Non-goals and implementation constraints

- Do not redesign the product, introduce accounts, add a database, replace Stripe, or change the
  privacy architecture.
- Do not upload original PDFs. The 20 MB original-PDF limit remains browser-only.
- Do not weaken the verification predicate, sealed-result binding, export revalidation, CSP,
  analytics isolation, formula-injection defenses, rate limiting, or fail-closed payment behavior.
- Prefer small changes in existing modules. Add a new abstraction only when it provides the test
  seam needed to verify a requirement.
- Do not update unrelated dependencies or perform opportunistic refactors.
- Do not push, merge, deploy, change Stripe, or change GitHub/Vercel settings during implementation.
- Do not mark a requirement complete by changing its wording or test to match broken behavior.

## Acceptance matrix

| ID  | Requirement                                                       | Initial status | Claude evidence                                                                                                                                                            | Codex result |
| --- | ----------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A1  | Live Stripe Price contract and real-branch tests                  | IMPLEMENTED    | `src/config/commerce.ts`, `src/lib/payments/stripe.ts` (injectable `PriceCheckDeps`), `scripts/price-preflight.ts`; `tests/unit/price-contract.test.ts` (15)               | —            |
| A2  | Recovery authorization is correct before reprocessing             | IMPLEMENTED    | `authorizeSession()` in `src/lib/payments/entitlement.ts` shared by verify and export; `tests/integration/recovery-authorization.test.ts` (20)                             | —            |
| A3  | Recovery promise and customer path are accurate                   | IMPLEMENTED    | Recovery-link control in `download-panel.tsx`; copy fixed in `faq.ts`, `terms.ts`, `refund-policy.ts`; guard in `claims.test.ts`; E2E recovery-link test                   | —            |
| A4  | Exact 20 MB contract and truthful enforcement copy                | IMPLEMENTED    | `maxFileSizeMb` moved into `COMMERCIAL_OFFER`; `security.ts` server-side claim corrected; exact-value assertions in `tests/unit/limits.test.ts` (19)                       | —            |
| A5  | Obsolete environment overrides are removed or rejected            | IMPLEMENTED    | Removed from `.env.example` and `docs/ENVIRONMENT.md`; `scripts/doctor.ts` reports stale vars by name; no source-text regex used as the invariant                          | —            |
| A6  | Pack ordering and opening logic use one unambiguous identity rule | IMPLEMENTED    | Single sorted `entries` collection in `assemble-pack.ts`; positional fallback removed from `openPack`; `tests/unit/pack-recovery.test.ts`                                  | —            |
| A7  | Payment, seal-mode, and recovery tests close known gaps           | IMPLEMENTED    | Duplicate integration test removed; casts removed from `tests/helpers/statements.ts`; `tests/unit/seal-mode.test.ts` (13); production sealing fails closed                 | —            |
| A8  | Documentation and public policy match actual behavior             | IMPLEMENTED    | `security.ts`, `faq.ts`, `terms.ts`, `refund-policy.ts`, `.env.example`, `ENVIRONMENT.md`, `REFUNDS.md`, `ARCHITECTURE.md`, `DATA_FLOW.md`, `DEPLOYMENT.md`, closure audit | —            |
| A9  | One complete local release command is authoritative               | IMPLEMENTED    | `pnpm verify:release` in `package.json`; CI calls exactly that command; `DEPLOYMENT.md` and `VALIDATION_PLAN.md` state `pnpm verify` is not complete                       | —            |
| A10 | Production deployment is gated on successful verification         | BLOCKED        | Platform decision required — unchanged                                                                                                                                     | —            |
| A11 | Post-deploy live purchase, export, recovery, and refund           | BLOCKED        | Owner authorization required — unchanged                                                                                                                                   | —            |

## Correction pass (post-A1–A9)

A narrowly scoped correction pass addressed defects found in independent review of the A1–A9
implementation. No architecture changed; price, payment, pack, export, and seal were left alone.

| Finding                                                                              | Correction                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `faq.ts` second recovery paragraph contradicted the first                            | Rewritten: recovery needs the saved link plus the same PDFs; receipt references are a support path, not an application input                                                                         |
| False delete-on-download in `docs/ARCHITECTURE.md` and `src/lib/client/job-store.ts` | Corrected — the encrypted job survives until explicit deletion or the ~60-minute TTL; code already behaved correctly, only the comments were false                                                   |
| Closure audit conflated the recovery link with a Stripe receipt reference            | Answers 5, 8, and 9 rewritten; production `dd06bb5` now explicitly distinguished from the unpushed local acceptance work                                                                             |
| `src/config/site.ts` claimed all limits are mirrored server-side                     | Corrected — 50 pages is browser + server, 20 MB is browser-only because the bytes never arrive                                                                                                       |
| Retired variable names still present in `.env.example`                               | Names removed entirely; the doctor keeps its name-only, non-fatal warning                                                                                                                            |
| Node 20 accepted by `README.md`, `setup-check.ts`, `doctor.ts`                       | All now require Node major 22, matching `engines`, `.nvmrc`, and CI                                                                                                                                  |
| Claims guards too narrow to catch the above                                          | Extended to the converter UI, job store, and acceptance docs, plus a meta-test proving each guard matches a known-bad statement and a test proving it does not block legitimate support instructions |
| Release gate unstable at four workers                                                | `playwright.config.ts` pinned to `workers: 2` locally and in CI; `retries` dropped to 0 so a real failure is visible                                                                                 |

The E2E instability was development-server resource contention, not a product defect: the failing
cases were timeouts on unrelated static pages, and the recovery test passed in isolation.

## A1 — Live Stripe Price contract and real-branch tests

### Required implementation

1. Keep `src/config/commerce.ts` as the only code-owned definition of 1900 cents, USD, one-time
   billing, and the public `$19` projection.
2. Keep Stripe Price retrieval fail-closed before Checkout Session creation.
3. Retain a bounded success cache. Five minutes is acceptable. A mismatch or lookup failure must
   never be treated as a cached success.
4. Add deterministic tests around `assertStripePriceMatchesOffer`, using an injected retrieval
   function or narrowly mocked Stripe client. Tests must prove:
   - a matching active one-time live Price passes;
   - inactive, recurring, wrong-ID, wrong-amount, and wrong-currency Prices fail;
   - lookup failure fails closed;
   - a cached success expires at the documented boundary;
   - reset/failure cannot leave a stale success usable.
5. Add a read-only production preflight command or documented one-off procedure that retrieves the
   configured Price and prints only non-secret contract fields. It must not create a Checkout
   Session or charge.

### Live acceptance

Using production credentials, verify the configured Price ID matches, `active === true`,
`type === "one_time"`, `recurring === null`, `unit_amount === 1900`, `currency === "usd"`, and
`livemode === true`. This may remain BLOCKED until credentials are explicitly authorized, but all
repository implementation and tests must still be completed.

## A2 — Recovery authorization is correct before reprocessing

`GET /api/checkout/verify` and its underlying payment lookup must not report a session as recoverable
unless all applicable conditions already hold:

1. the Checkout Session exists;
2. `payment_status === "paid"`;
3. amount and currency match the commercial contract;
4. a valid paid digest exists;
5. the session remains inside the 30-day entitlement window.

Refactor shared session validation if needed so verification and export cannot drift. Export must
continue to recheck payment, terms, expiry, digest, sealed contents, canonicalization, the complete
verification gate, reconciliation, and manifest consistency. Recovery authorization must not
replace export authorization.

Tests must drive wrong amount, wrong currency, unpaid, missing digest, expired, and valid sessions
through the actual entitlement/recovery function or route—not only through pure helper functions.

## A3 — Recovery promise and customer path are accurate

The implemented promise is:

- the encrypted local result lasts about 60 minutes or until explicit deletion;
- the payment entitlement lasts 30 days;
- after the local result expires, recovery requires the same original PDFs and the paid Checkout
  Session reference;
- the PDFs are reprocessed and must reproduce the paid pack digest;
- file-selection order does not matter;
- no original PDF or recoverable converted result is stored server-side.

Update all public copy that still says recovery works only while the original browser retains the
sealed result, including the FAQ, terms, and refund policy.

Make the session-reference requirement honest and usable. Either:

1. provide a clear post-payment control to copy/save the recovery link containing the Checkout
   Session reference, with appropriate explanation; or
2. narrow the public promise so recovery without that link is described as a support/refund path.

Do not claim that a Stripe receipt number or card-statement descriptor is directly accepted by the
application unless such a lookup is actually implemented. Cross-device recovery may be claimed only
when the customer carries the recovery link/session reference and the same PDFs to that device.

Add a focused browser test covering the chosen recovery-link behavior and a content guard that fails
if obsolete browser-only recovery language returns.

## A4 — Exact 20 MB contract and truthful enforcement copy

1. Make 20 MB an exact code-owned product limit rather than an environment-adjustable value.
2. Derive uploader labels and other interpolated copy from that contract where practical.
3. Test exactly 20 MB accepted and 20 MB plus one byte rejected.
4. Assert the configured limit is exactly 20 MB, so an environment change cannot make the test pass
   at a different value.
5. Preserve the exact 50-total-page contract and 50/51 boundary tests.
6. Correct public and internal copy: 20 MB original-PDF size is browser-enforced because original PDF
   bytes never reach the server. Server controls instead bound extracted-text body bytes, page count,
   item count, and character count.

In particular, remove the false statement in `src/content/legal/security.ts` that 20 MB is enforced
server-side.

## A5 — Obsolete environment overrides are removed or rejected

`NEXT_PUBLIC_PRICE_USD` and `NEXT_PUBLIC_MAX_PAGES` must not remain advertised as functioning
configuration. `NEXT_PUBLIC_MAX_FILE_SIZE_MB` must also be retired when A4 locks the exact limit.

1. Remove them from `.env.example` and current environment documentation.
2. Correct descriptions that say inline Stripe pricing comes from an environment variable.
3. Add a robust setup/doctor/build-time diagnostic for legacy variables if silent deployment drift
   remains plausible. Do not use a source-text regex as the sole invariant.
4. Before making legacy variables fatal in production, check whether they are still configured in
   Vercel. Do not cause an avoidable production outage merely to improve diagnostics.

## A6 — One pack identity and ordering rule

1. Sort manifest and envelope files using the same full file-level result digest, or construct both
   from one already-sorted intermediate collection.
2. Preserve order-independent pack digests and duplicate protection.
3. Remove the `raw.files[index]` fallback in `openPack`; a missing matching `fileId` must fail
   explicitly.
4. Keep tests for multiple permutations, genuinely different contents, duplicates, and recovery of a
   reassembled pack under the original paid digest.
5. Document the digest migration risk accurately. Do not claim there were no affected purchases
   without Stripe evidence.

## A7 — Close the known test gaps

In addition to tests required by A1–A6:

1. Remove the duplicated verification-PDF/manifest integration test in
   `tests/integration/payments.test.ts`.
2. Replace or narrow unsafe casts in `tests/helpers/statements.ts` so callers cannot construct a
   production-impossible statement unnoticed. The final statement must still pass the production
   schema/canonicalization path.
3. Add explicit seal-mode tests for:
   - AES-GCM sealing with a configured secret;
   - wrong digest/key and tampering rejection;
   - plaintext fallback behavior when intentionally unconfigured outside production;
   - downgrade rejection when sealing is configured.
4. Decide and test the production behavior when `EXPORT_SEAL_SECRET` is missing. Production must not
   silently expose the full converted table in a plaintext browser envelope. Prefer failing closed.
5. Keep coverage thresholds as regression floors, but raise payment-path coverage only as a result of
   meaningful branch tests—not empty assertions or excluded files.

## A8 — Documentation and public policy agree with code

Review and correct at least:

- `src/content/faq.ts`
- `src/content/legal/terms.ts`
- `src/content/legal/refund-policy.ts`
- `src/content/legal/security.ts`
- `.env.example`
- `docs/ENVIRONMENT.md`
- `docs/REFUNDS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_FLOW.md`
- `docs/DEPLOYMENT.md`
- `docs/v2-phase1-closure-audit.md`

Remove false delete-on-download claims unless delete-on-download is deliberately implemented. The
current multi-format product should normally retain the encrypted local job for additional downloads
until explicit deletion or the one-hour TTL.

The closure audit must state the actual deployed/local commits and must mark platform and live
actions PARTIAL/BLOCKED until they are truly completed.

## A9 — Authoritative release command

Add one documented package command, preferably `pnpm verify:release`, that runs the complete local
release gate in a safe order:

1. format check;
2. lint;
3. typecheck;
4. unit/integration tests with coverage thresholds;
5. synthetic benchmark;
6. SEO audit;
7. production build;
8. browser/E2E tests.

CI must call this command or an exactly equivalent sequence. Documentation must not call the shorter
`pnpm verify` complete if it omits coverage, SEO, or E2E. Do not run build and E2E concurrently when
they share output or a local server.

## A10 — Production deployment gate

Repository work is not sufficient. GitHub reported that branch protection for this private
repository requires a plan upgrade or a public repository. The owner must choose one minimal option:

1. upgrade/enable required GitHub checks and configure Vercel to wait for them;
2. use an available Vercel checks-required deployment setting; or
3. disable automatic production deployment from `main` and deploy/promote only after the release
   workflow succeeds.

Until one option is verified, A10 remains BLOCKED and Phase 1 is not 100% operationally closed.

## A11 — Post-deploy live acceptance

After A1–A10 repository work is VERIFIED and deployment is explicitly approved:

1. deploy the verified commit;
2. confirm `/api/health` reports that exact commit, live Stripe, sealed results, deterministic-only
   parsing, durable rate limiting, correct limits, and no warnings;
3. confirm live `/app` CSP, analytics isolation, `noindex`, price adjacency, and processing footer;
4. run one real $19 purchase using the owner's statement;
5. download XLSX, CSV, verification PDF, and manifest;
6. test recovery using the documented recovery path;
7. refund the purchase and confirm the refund in Stripe;
8. record evidence without storing or committing statement data, filenames, account data, secrets,
   or payment credentials.

## Required Claude handoff

Claude must finish with:

1. the final commit and `git status --short --branch`;
2. an item-by-item A1–A9 `IMPLEMENTED` report with exact files and tests;
3. any A10–A11 blockers without claiming them complete;
4. the complete `pnpm verify:release` result;
5. a concise diff summary;
6. an explicit statement that nothing was pushed, deployed, charged, refunded, or reconfigured.

## Codex verification protocol

Codex will:

1. compare the final tree to baseline `e91d746b8f636c4d8420baff39dbc8cf07b89db9`;
2. inspect code and public copy rather than relying on the handoff;
3. rerun `pnpm verify:release` sequentially;
4. verify every concern and acceptance item independently;
5. confirm the worktree and deployment state;
6. return one consolidated correction list if anything remains;
7. mark an item VERIFIED only when its implementation, tests, behavior, and claims agree.
