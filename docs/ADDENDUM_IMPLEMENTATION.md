# Section 41 implementation map

Authoritative source: `CURSOR_MASTER_BUILD_PROMPT_statement_reconcile_UPDATED.md` §41. Changelog is navigation only.

Pack behavior chosen (reversible): **verified subset**. Checkout is created only for the files the customer has explicitly kept, and every kept file must be `verification_passed`. Failed files are never silently omitted from a paid pack; they must be removed by the customer first. Documented in `docs/DECISIONS.md` ADR-012.

## 41.1 Positioning — Verified Bank Statement Conversion

| Status   | Detail                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Modify   | Homepage still targets Excel/CSV search intent. Differentiator copy must emphasize inspectable evidence, not uniqueness of balance-checking. |
| Modify   | Offer line becomes `$19 once · One or more statements · Up to 50 total pages · No account`.                                                  |
| Existing | H1, primary CTA, brand, no fake proof. Offer line and verified category are in `siteConfig`. Claims tests scan public copy.                  |

## 41.2 Multi-file $19 conversion pack

| Status   | Detail                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| Existing | $19 one-time Stripe Checkout; digest binding; 50-page cap per file.                                                         |
| Modify   | 50-page cap is combined across the job, not per file.                                                                       |
| New      | Multi-file upload, per-file independent verification, pack manifest digest, Stripe product copy “Verified Conversion Pack”. |
| New      | Checkout metadata: pack digest, file count, total pages, product/schema versions — never filenames or financials.           |

## 41.3 Source-linked provenance

| Status   | Detail                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | `sourcePage` on some rows; positioned PDF text items (`t,x,y,w,h`).                                                                                           |
| Modify   | Schema v2: stable transaction id, `SourceRegion`, `FieldProvenance`, raw source text, extractor version, transaction verification. Text items get stable ids. |
| Modify   | Canonicalization preserves raw values; provenance participates in the digest.                                                                                 |
| New      | Click-to-source PDF highlighter in the preview (in-memory PDF bytes only).                                                                                    |

## 41.4 Row-level / running-balance verification

| Status   | Detail                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | Aggregate opening+closing; optional running-balance chain; stated subtotals. Aggregate pass currently sufficient for checkout.                        |
| Modify   | Split engines. When running balances exist, every applicable transition must pass or the file is rejected. Aggregate is necessary but not sufficient. |
| New      | Exact denominators in UI and reports (`N / N` rows traced, transitions, pages).                                                                       |

## 41.5 Document completeness

| Status   | Detail                                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | Page-count and payload caps; scanned/encrypted rejection.                                                                                                                                     |
| New      | Completeness module: pages declared/opened/extracted/parsed, section coverage, blank-page classification, page fingerprints, truncation/timeout flags, mixed-account boundaries. Fail closed. |

## 41.6 Typed ambiguity

| Status   | Detail                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Existing | Ambiguous debit+credit on one row rejects; no typed findings model.                                                      |
| New      | `AmbiguityFinding` records. Material unresolved findings block `verification_passed` and checkout. No confidence scores. |

## 41.7 Selective secondary extraction

| Status      | Detail                                                                                                                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removed     | Full-document provider fallback. A deterministic failure now rejects; the service never sends a whole statement to a model.                                                                                                                                |
| In progress | The configured provider interface accepts clipped text regions only, and comparison/disagreement logic exists. Automatic activation for a typed material ambiguity is still pending; until then the system fails closed instead of making a provider call. |

## 41.8 Verification state machine

| Status   | Detail                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | Boolean `reconciliation.passed` gates checkout. Server re-runs reconcile on sealed payload.                                                               |
| Modify   | Named file states through `verification_passed` / `verification_rejected`. Checkout/export enforce the final state and pack digest, not a client boolean. |

## 41.9 Preview evidence

| Status   | Detail                                                                                                                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | Summary, equation, 10 preview rows, paywall only after pass.                                                                                                                                   |
| Modify   | File/page counts, completeness, source-mapped counts, running-balance denominators, ambiguity count, privacy receipt, source inspection. CTA: “Download verified Excel + CSV + reports — $19”. |

## 41.10 Paid reports

| Status   | Detail                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | CSV + XLSX (transactions + summary). Formula neutralization.                                                                                               |
| New      | Verification sheet + source-reference columns in XLSX. Per-statement verification PDF. `pack-manifest.json`. Formats: `csv`, `xlsx`, `report`, `manifest`. |

## 41.11 Privacy receipts

| Status   | Detail                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | PDF stays in browser; no-store APIs; sanitized logs; Stripe metadata is non-financial.                                                                   |
| Modify   | Keep PDF bytes in memory for source inspection (still never uploaded, never persisted).                                                                  |
| New      | Per-file `ProcessingDisclosure`. UI/report sentences only when state proves them. Provider retention-mode startup check. `docs/PRIVACY_ARCHITECTURE.md`. |

## 41.12–41.13 Benchmark and regression

| Status   | Detail                                                                                                                                                                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing | 32 synthetic fixture families; reconciling families must parse.                                                                                                                                                                                                                                       |
| New      | `pnpm benchmark:synthetic` scores 99 generated cases across three seeds, exact date/signed-amount identity, source-page evidence integrity, and fail-closed disposition. Results are local and explicitly ineligible for public claims. The held-out 48-statement / 5,000-row corpus remains pending. |

## 41.14–41.15 Claims and non-goals

| Status   | Detail                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing | No SOC2/HIPAA/PCI claims; bank pages non-affiliated; QBO/OFX flagged off.                                                                  |
| Modify   | Legal, FAQ, security, and marketing copy: “verified” = extraction verification only. Tests forbid prohibited claim strings in public copy. |

## Tests required

- Provenance survives canonicalize; digest changes when source text/bbox/amount changes.
- Completeness rejects truncated, blank-unclassified, duplicate, mixed-account inputs.
- Running-balance: first failing transition identified; cancelling errors fail even if aggregate is $0.00.
- Material ambiguity and provider disagreement block checkout.
- Multi-file: combined 50-page cap; failed file cannot be in a paid pack; subset checkout rebinds digest.
- Export: unpaid / digest mismatch / incomplete / rejected blocked; paid pack yields CSV, XLSX, report PDF, manifest.
- Privacy receipt: `rawPdfLeftBrowser` is always false; remote region counts match the pipeline.
- Copy scan: no authenticity/audit/“100% accurate”/unsupported uniqueness claims.

## Documentation required

`docs/PRIVACY_ARCHITECTURE.md`, `docs/COMPETITIVE_BENCHMARK.md`, `benchmarks/*`, updates to DATA_FLOW, ENVIRONMENT, METRICS, VALIDATION_PLAN, REFUNDS, legal content, TASKS, DECISIONS.
