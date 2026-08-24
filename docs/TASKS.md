# Task ledger — Statement Reconcile

Authoritative source: `CURSOR_MASTER_BUILD_PROMPT_statement_reconcile_UPDATED.md` (Sections 1–40 plus authoritative Section 41). Changelog is navigation only. Section 41 wins conflicts.

## Sections 1–40 (preserved)

| Phase                 | Status      | Notes                                                                                                                                                |
| --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–11 Core V1 funnel   | done        | Domain engine, client PDF text extract, Stripe digest gate, CSV/XLSX, SEO, analytics skeleton.                                                       |
| 12 Test matrix        | in progress | Expanded for Section 41.                                                                                                                             |
| 13 GitHub             | pending     |                                                                                                                                                      |
| 14 Vercel             | blocked     | CLI logged out.                                                                                                                                      |
| 15–16 Audit / handoff | in progress | Operator docs written (README, SECURITY, MANUAL_CONNECTIONS, docs/*). Remaining owner actions in `MANUAL_CONNECTIONS.md`. Section 41 DoD still open. |

## Section 41 addendum

| Item                                  | Status      | Notes                                                                                                                                                                       |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 41.1 Positioning / claims policy      | done        | Offer line, verified category, prohibited-claim tests.                                                                                                                      |
| 41.2 Multi-file conversion pack       | done        | Combined 50 pages; pack digest; verified subset.                                                                                                                            |
| 41.3 Provenance schemas + PDF inspect | done        | Schema v2; source regions; click-to-source.                                                                                                                                 |
| 41.4 Running-balance row checks       | done        | Mandatory when balances printed.                                                                                                                                            |
| 41.5 Completeness module              | done        | Fail closed.                                                                                                                                                                |
| 41.6 Typed ambiguity                  | done        | Material findings block payment.                                                                                                                                            |
| 41.7 Selective secondary extraction   | in progress | Full-document fallback removed; provider API is region-only and comparison rejects disagreement. Typed automatic activation remains pending; current behavior fails closed. |
| 41.8 Verification state machine       | done        | Server-enforced gate.                                                                                                                                                       |
| 41.9 Preview evidence                 | done        | Exact denominators; new CTA; source inspector.                                                                                                                              |
| 41.10 Verification PDF + manifest     | done        | Plus XLSX Verification sheet.                                                                                                                                               |
| 41.11 Privacy receipts                | done        | Must match routing.                                                                                                                                                         |
| 41.12 Benchmark harness               | in progress | Executable synthetic scorer is a release gate; the 48×5000 held-out corpus and competitor runs remain the public-claim gate.                                                |
| 41.13 Regression fixture tags         | in progress | Adversarial schema stub; generating fixtures remain the live regression set.                                                                                                |
| 41.14–15 Copy / legal / non-goals     | done        | FAQ, terms, pricing, claims tests.                                                                                                                                          |
| Addendum DoD                          | in progress | Unit + integration tests show payment impossible for incomplete/rejected/mismatched jobs. Public corpus not yet collected.                                                  |
