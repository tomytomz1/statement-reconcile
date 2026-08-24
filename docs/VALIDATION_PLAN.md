# Validation plan

These targets are **internal**. They are not public guarantees, SLAs, or marketing claims. The product already refuses to charge when reconciliation fails.

## Never commit real statements

No customer PDF, no staff PDF, no redacted-but-real dump. Fixtures are generated (`src/lib/fixtures/generator.ts`): invented names, masked account placeholders, seeded layouts. If a real file is needed to debug a layout, keep it off-repo and off shared disks; extract a synthetic family that reproduces the _layout_, then delete the real file.

`pnpm fixtures:generate` rebuilds synthetic PDFs/text from families. Tests should call the generator, not check in binary statements.

## Fixture families (32)

Expected to reconcile unless named `invalid-*` or designed to reject.

**Checking / savings:** `checking-debit-credit-balance`, `checking-signed-amount-balance`, `checking-signed-no-balance`, `checking-parenthesised-negatives`, `checking-cr-dr-markers`, `checking-sectioned-unsigned`, `checking-multipage`, `checking-wrapped-descriptions`, `checking-dates-without-year`, `checking-iso-dates`, `checking-named-months`, `checking-large-amounts`, `checking-unicode-descriptions`, `checking-no-stated-totals`, `savings-with-interest`, `savings-quarterly-multipage`.

**Credit card:** `credit-card-standard`, `credit-card-with-refund`, `credit-card-parenthesised-payments`, `credit-card-multipage`.

**Locale:** `european-decimal-comma`, `european-dotted-dates`, `uk-money-in-out`.

**Adversarial:** `adversarial-prompt-injection`, `adversarial-formula-injection`, `adversarial-huge-description`.

**Must reject:** `invalid-missing-row`, `invalid-duplicated-row`, `invalid-altered-closing-balance`, `invalid-corrupted-amount`, `invalid-ambiguous-sign`, `invalid-impossible-date`, `invalid-multiple-accounts`.

Mutations covered: dropped row, duplicate row, altered closing balance, corrupt amount, impossible date, second account, prompt injection, formula injection, huge description, unicode.

## What “correct” means

For a fixture expected to reconcile:

1. **Dates** — ISO `YYYY-MM-DD` matching fixture truth (period slack is an engine check, not a free pass).
2. **Values** — every amount, debit, credit, running balance, opening/closing, stated totals match truth at currency scale (`decimal.js`, one minor-unit tolerance in the engine).
3. **Row count** — exact.
4. **`reconcile().passed === true`** and method is not `insufficient_data`.

For a fixture expected to reject: `passed === false` and no sealed success path, no checkout.

Provider output, if used, is run through the same canonicalize + reconcile. A green provider test that skips reconcile is invalid.

## Internal targets (not for the website)

Measured on the synthetic suite plus any **private**, never-committed layout pack the owner keeps locally.

| Metric                                             | Internal bar | Notes                                                                          |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| Date + value accuracy on accepted extractions      | 99.5%        | Per field vs truth; one wrong amount fails the statement                       |
| Reconciliation success on statements we **accept** | 98%+         | Denominator = extractions we would offer for sale                              |
| Zero human intervention                            | 97%+         | No manual row edits; reject-and-don’t-charge counts as success for this metric |

Do not put these numbers on landing pages, ads, or sales email.

## Automated gates

- `pnpm test` — unit + integration (parser, reconcile, canonicalize, money, dates, export sanitization)
- `pnpm test:e2e` — funnel with mock payments (`APP_ENV=test`)
- `pnpm audit:seo` — unique titles/descriptions; no orphan SEO URLs
- `pnpm verify` — format, lint (zero warnings), typecheck, tests, build

Add a fixture family when a new layout class or a production reject/false-accept appears. Do not “fix” a failing invalid-* fixture by loosening the engine.

## Human review (pre-launch, private)

Owner converts a handful of **their own** statements locally, confirms preview vs PDF, then deletes the job. Record only: layout family name, pass/fail, reconciliation method. Never file the PDF in GitHub issues.
