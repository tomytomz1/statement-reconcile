# Methodology

## What is scored

A row is a true positive only when date, signed amount, and source page match the fixture. Extra rows are false positives. Missing rows are false negatives. Running-balance transitions are scored separately and cannot be traded against an aggregate $0.00 difference.

## Fail-closed outcomes

Truncation, mixed-account boundaries, unresolved material ambiguity, provider disagreement, and incomplete source mapping are scored as file-level failures, not partial credit.

## Public claims

Do not publish a percentage or a competitor comparison from this harness until the 48 / 5,000 corpus documented in `docs/COMPETITIVE_BENCHMARK.md` has been run and archived under `results/`.
