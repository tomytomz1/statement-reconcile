<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Statement Reconcile — project notes

Brand: Statement Reconcile. Canonical URL: `https://statementreconcile.com`. Offer: $19 once, 50 pages, no account. The raw PDF never leaves the browser.

## `src/` layout

| Path                      | Role                                                                             |
| ------------------------- | -------------------------------------------------------------------------------- |
| `src/app/(site)/`         | Marketing: home, pricing, how-it-works, FAQ, legal, `[slug]` SEO landers         |
| `src/app/app/`            | Converter UI (`noindex`)                                                         |
| `src/app/checkout/`       | Stripe return (`noindex`)                                                        |
| `src/app/api/`            | `parse`, `checkout`, `checkout/verify`, `export`, `stripe/webhook`, `health`     |
| `src/proxy.ts`            | Next 16 request interceptor (CSP, headers, `sr_sid`) — not `middleware.ts`       |
| `src/config/`             | `site.ts` brand/offer, `env.ts` server secrets, `flags.ts` OCR/QBO/OFX/analytics |
| `src/lib/client/`         | In-browser pdf.js extract + IndexedDB job store                                  |
| `src/lib/extraction/`     | Deterministic parser, optional LLM provider, canonicalize, pipeline              |
| `src/lib/reconciliation/` | Decimal engine — **final authority on `passed`**                                 |
| `src/lib/payments/`       | Digest-bound Stripe entitlement, sealed-envelope open                            |
| `src/lib/crypto/`         | Canonical digest, AES-GCM seal                                                   |
| `src/lib/export/`         | CSV/XLSX + formula neutralization                                                |
| `src/lib/security/`       | Rate limit (fail-closed in production), logging, origin, headers                 |
| `src/content/seo/`        | 26 landing pages as data                                                         |
| `src/content/legal/`      | Privacy, terms, security, refunds, contact                                       |
| `src/lib/fixtures/`       | Synthetic statements only — never commit real PDFs                               |

## Rule: reconciliation is never decided by an LLM

A parsing provider may propose structured rows. It must not assert that a statement balances. `src/lib/reconciliation/reconcile.ts` recomputes every total from the transaction list (pure, no I/O). Checkout and export re-run that engine after unsealing. Missing balancing data is a rejection, not a pass. Do not add a `reconciled` field from model output, and do not skip the engine on a “high confidence” provider response.
