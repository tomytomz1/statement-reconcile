# Adversarial benchmark harness

Synthetic until a 48-statement / 5,000-row corpus is collected. See `docs/COMPETITIVE_BENCHMARK.md`.

## Layout

- `schema/` — JSON descriptions of adversarial cases
- `runners/` — how to execute them against the parser and verification gate
- `results/` — gitignored outputs (keep `.gitkeep`)
- `methodology.md` — scoring rules

Run `pnpm benchmark:synthetic`. It scores exact date, signed amount, and source page identity,
plus fail-closed file disposition, and writes a non-public result to
`benchmarks/results/synthetic-latest.json`.

Synthetic results always carry `publicClaimEligible: false`. The separate 48-statement /
5,000-row held-out corpus remains mandatory before any public accuracy or competitor claim.
