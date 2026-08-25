# Statement Reconcile

Convert one or more PDF bank or credit-card statements into Excel (`.xlsx`), CSV, a verification report, and a pack manifest. The original PDF is read in the browser and never uploaded. Extraction is checked (source mapping, completeness, running-balance transitions when printed, and aggregate arithmetic) **before** the $19 paywall appears. No account, no database, no stored statements.

Canonical site: [https://statementreconcile.com](https://statementreconcile.com)

Offer: **$19 once · one or more statements · up to 50 total pages · no account**. QBO, OFX, and OCR are flagged off in V1. “Verified” means those extraction checks, not authenticity or an audit.

## Prerequisites

- Node.js 22.x — required, not merely recommended. `package.json` declares `engines.node: 22.x`, `.nvmrc` pins 22, and CI runs Node 22.
- [pnpm](https://pnpm.io) 11.x (`corepack enable` then `corepack prepare pnpm@11.23.0 --activate`)

## Run locally (< 10 minutes)

```bash
git clone <this-repo>
cd statement-reconcile
cp .env.example .env.local   # Windows: Copy-Item .env.example .env.local
pnpm install
pnpm run doctor              # reports missing secrets; local parse works without them
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The converter is `/app`.

Without Stripe keys, conversion and preview work; checkout returns 503. Without a parser API key, the deterministic parser still runs. Without `EXPORT_SEAL_SECRET`, the result envelope is plaintext but still payment-gated.

## Tests

```bash
pnpm test                    # Vitest unit + integration
pnpm test:e2e:install        # Chromium, once
pnpm test:e2e                # Playwright (uses mock payments; see docs/ENVIRONMENT.md)
pnpm verify                  # format, lint, typecheck, tests, production build
```

## Useful commands

| Command                        | What it does                                                            |
| ------------------------------ | ----------------------------------------------------------------------- |
| `pnpm run doctor`              | Launch readiness: Stripe, seal secret, rate limiter, legal placeholders |
| `pnpm setup:check`             | Tooling / Node / pnpm sanity                                            |
| `pnpm fixtures:generate`       | Rebuild synthetic statement fixtures                                    |
| `pnpm audit:seo`               | Unique titles, descriptions, and internal links across landing pages    |
| `pnpm lint` / `pnpm typecheck` | ESLint (zero warnings) and `tsc --noEmit`                               |

## Architecture in one paragraph

The browser extracts positioned text with pdf.js. `POST /api/parse` runs the deterministic parser first, optionally an LLM fallback, then completeness, source mapping, and `src/lib/reconciliation/reconcile.ts`. Only the verification gate may mark a file `verification_passed`. Passing files are sealed as a conversion pack. Stripe Checkout metadata stores the **pack-manifest digest** and coarse counts — nothing from the statement. `POST /api/export` re-reads the session from Stripe, opens the envelope, re-digests, and re-runs the gate. There is no application database.

Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DATA_FLOW.md`](docs/DATA_FLOW.md), [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

Owner-only production wiring: [`MANUAL_CONNECTIONS.md`](MANUAL_CONNECTIONS.md).

## What this repo will not do

- Store a PDF, a statement, or a customer account
- Let an LLM decide whether numbers balance
- Advertise QBO, OFX, or OCR while those flags are off
- Claim SOC 2, HIPAA, PCI, or GDPR certification
