# Competitive benchmark

Public accuracy claims are forbidden until this harness has been run on a held-out corpus of **at least 48 real statements and 5,000 transaction rows**, with the methodology in `benchmarks/methodology.md`.

Until that corpus exists, release gates use synthetic fixture families plus the adversarial cases under `benchmarks/schema/`. Do not advertise “better than [named competitor]” or “100% accurate.”

## Release gates (synthetic, shipping)

| Gate             | Rule                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Fixture families | Every generating family in `src/lib/fixtures/generator.ts` must parse and pass the verification gate. |
| Fail-closed      | Altered totals, truncated input, unmapped rows, and material ambiguity must not be purchasable.       |
| Pack             | Combined 50-page cap; a `verification_rejected` file cannot enter a paid pack.                        |
| Privacy          | `rawPdfLeftBrowser` is always false; original PDF never uploaded.                                     |

## Public-claim gate (not yet met)

48 statements / 5,000 rows, recorded in `benchmarks/results/`, with per-family precision/recall of row identity (date, amount, sign, source page) and running-balance transition pass rate. Failures become tagged regression fixtures.
