# SEO URL migration — PRD v2

The complete inventory of indexable landing pages before consolidation, the classification applied to each, and the redirect map. Required by PRD §45 and §61; the acceptance criteria are §100.

## Why this ran now rather than later

§45 asks for Search Console impressions and backlink data before deciding redirects. **Neither exists.** The site launched 2026-08-25 and this work began the same day, so no URL has accrued rankings, impressions, or links.

That absence is the argument for acting immediately rather than waiting. The caution in §45 protects aged URLs with measurable equity; consolidating on day one costs nothing because there is nothing to lose. Every month of delay makes the same merge more expensive — pages acquire links, rankings settle onto the wrong URL of a cannibalising pair, and the eventual redirect throws away real signal instead of none.

The classifications below are therefore judgment-based, made on query-intent overlap rather than performance data, and that is stated plainly rather than dressed up as analysis.

## Inventory before: 26 landing pages

All 26 were unique documents — the audit script fails the build on duplicate titles, descriptions, or body prose, so none of these were spun templates. The problem was not thin content. It was that several genuinely distinct documents were written to answer the same search.

| #     | Slug                                                                       | Target query                                  | Classification                                                          |
| ----- | -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| 1     | `bank-statement-converter`                                                 | bank statement converter                      | **KEEP** — category hub (§52)                                           |
| 2     | `bank-statement-to-excel`                                                  | bank statement to excel                       | **KEEP** — Excel cluster survivor                                       |
| 3     | `bank-statement-to-csv`                                                    | bank statement to csv                         | **KEEP** — CSV cluster survivor                                         |
| 4     | `convert-bank-statement-to-excel`                                          | convert bank statement to excel               | **MERGE + 301** → 2                                                     |
| 5     | `convert-bank-statement-to-csv`                                            | convert bank statement to csv                 | **MERGE + 301** → 3                                                     |
| 6     | `pdf-bank-statement-to-excel`                                              | pdf bank statement to excel                   | **MERGE + 301** → 2                                                     |
| 7     | `pdf-bank-statement-to-csv`                                                | pdf bank statement to csv                     | **MERGE + 301** → 3                                                     |
| 8     | `convert-pdf-transactions-to-excel`                                        | convert pdf transactions to excel             | **MERGE + 301** → 2                                                     |
| 9     | `convert-pdf-transactions-to-csv`                                          | convert pdf transactions to csv               | **MERGE + 301** → 3                                                     |
| 10    | `credit-card-statement-to-excel`                                           | credit card statement to excel                | **KEEP** — distinct equation (§44)                                      |
| 11    | `credit-card-statement-to-csv`                                             | credit card statement to csv                  | **KEEP**                                                                |
| 12    | `business-bank-statement-to-excel`                                         | business bank statement to excel              | **KEEP** — distinct audience                                            |
| 13    | `bank-statement-transaction-extractor`                                     | bank statement transaction extractor          | **MERGE + 301** → 15                                                    |
| 14    | `pdf-bank-transaction-extractor`                                           | pdf bank transaction extractor                | **MERGE + 301** → 15                                                    |
| 15    | `extract-transactions-from-pdf`                                            | extract transactions from pdf                 | **KEEP** — extractor survivor                                           |
| 16    | `bank-statement-spreadsheet-for-accountants`                               | bank statement to spreadsheet for accountants | **REWRITE + 301** → new bookkeeper URL                                  |
| 17    | `bank-statement-to-quickbooks-csv`                                         | bank statement to quickbooks csv              | **KEEP** — destination intent                                           |
| 18    | `bank-statement-to-xero-csv`                                               | bank statement to xero csv                    | **KEEP** — destination intent                                           |
| 19    | `bank-statement-to-google-sheets`                                          | bank statement to google sheets               | **KEEP** — destination intent                                           |
| 20–26 | issuer pages (Chase, BofA, Wells Fargo, Capital One, Citi, Amex, Discover) | `{issuer} statement to excel`                 | **KEEP** — genuine layout differences, all carry an independence notice |

### The three cannibalising clusters

**"bank statement → Excel" — five URLs, one query family.** Pages 1, 2, 4, 6 and 8 all competed for the same SERP. Their only encoded differentiator was the `searchIntent` field — "finished workbook" versus "choosing a method" versus "starting from the PDF" — which is a distinction a writer can feel and a search engine cannot. Google resolves "convert bank statement to excel", "pdf bank statement to excel" and "bank statement to excel" to the same intent, so these four pages split their own signals. Page 1 survives separately because a category hub is a genuinely different page type, not a rephrasing.

**"bank statement → CSV" — four URLs.** An exact mirror of the above: pages 3, 5, 7, 9.

**"transaction extractor" — three URLs.** Pages 13, 14 and 15 are the same phrase with the qualifiers reordered. The first two had near-identical H1 strings.

### Deliberately not merged

The Excel/CSV split (2 versus 3, 10 versus 11) is kept even though **every pack ships both formats**, so it is a keyword split rather than a product split. It survives because the searches express different downstream jobs — someone typing "to CSV" is usually importing into software, someone typing "to Excel" is usually going to read it — and the pages answer those differently.

The seven issuer pages are structurally similar but carry real layout-specific content. Note that `flags.bankSpecificClaims` is off, so none of them claims a validated bank-specific parser.

## Redirect map

Implemented in `next.config.ts` as `RETIRED_SLUG_REDIRECTS`. Enforced by `tests/unit/redirects.test.ts`.

`permanent: true` in Next.js emits **HTTP 308**, not 301 — verified against production on 2026-08-25. Google treats 308 as equivalent to 301 for canonicalisation and signal consolidation; the practical difference is that 308 preserves the request method, which is irrelevant for these GET-only landing pages. No action needed, but the distinction is recorded so nobody later reports a "wrong" status code as a defect.

Verified live after deploy: all nine return 308 and resolve to a 200 in exactly one hop.

| From                                          | To                                          | Hops |
| --------------------------------------------- | ------------------------------------------- | ---- |
| `/convert-bank-statement-to-excel`            | `/bank-statement-to-excel`                  | 1    |
| `/pdf-bank-statement-to-excel`                | `/bank-statement-to-excel`                  | 1    |
| `/convert-pdf-transactions-to-excel`          | `/bank-statement-to-excel`                  | 1    |
| `/convert-bank-statement-to-csv`              | `/bank-statement-to-csv`                    | 1    |
| `/pdf-bank-statement-to-csv`                  | `/bank-statement-to-csv`                    | 1    |
| `/convert-pdf-transactions-to-csv`            | `/bank-statement-to-csv`                    | 1    |
| `/bank-statement-transaction-extractor`       | `/extract-transactions-from-pdf`            | 1    |
| `/pdf-bank-transaction-extractor`             | `/extract-transactions-from-pdf`            | 1    |
| `/bank-statement-spreadsheet-for-accountants` | `/bank-statement-converter-for-bookkeepers` | 1    |

No destination is itself a source, so there are no chains. The test asserts this rather than trusting the table.

## Pages added (§47)

| Slug                                    | Intent                                            | Why it is not a doorway page                                                                                                       |
| --------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `catch-up-bookkeeping-bank-statements`  | Reconstructing books from a run of old statements | Covers period continuity, sequencing, and what conversion does _not_ do — questions the format pages never address                 |
| `closed-bank-account-statements-to-csv` | Account closed or migrated, no export possible    | Covers where to find statements that seem lost and how to request reissues; a genuinely different situation from a live account    |
| `bank-feed-history-missing`             | The feed only pulled 90 days                      | A troubleshooting resource, not a sales page: explains why reconnecting fails and recommends the software's own import route first |

`old-bank-statements-to-quickbooks` from §47 was **not** created. §47 gates it on a documented, tested QuickBooks workflow, which is Phase 3 work. `bank-statement-to-quickbooks-csv` already covers the manual CSV import route honestly and claims no `.QBO` support.

## Bookkeeper page rename

`/bank-statement-spreadsheet-for-accountants` → `/bank-statement-converter-for-bookkeepers`, the URL §42 prefers.

§42 permits retaining the old URL instead. Redirecting was chosen because equity is zero today, "bookkeepers" is how the §3 bullseye avatar describes itself, and the alternative — leaving the URL forever mismatched with the audience — is a permanent cost to avoid a one-time hop that currently carries no value.

The rewrite also fixed a **factual error** in the old page: its `unsupported` list said "Batch or bulk conversion; statements are handled one at a time", and a step said "Convert one statement, one account at a time". Packs have supported multiple statements since schema v2. §101 forbids copy that misstates a limitation, and this one understated a capability the customer is paying for.

## Result: 21 landing pages

26 − 8 merged − 1 renamed + 1 renamed-in + 3 new = **21**.

| Group                | Count |
| -------------------- | ----- |
| Convert a statement  | 7     |
| Catch-up and cleanup | 4     |
| Import into software | 3     |
| By bank or issuer    | 7     |

Every page appears in exactly one footer group, so none is orphaned. The `By bank or issuer` heading is load-bearing — `scripts/audit-seo.ts` reads it to decide which pages must carry an independence notice.

## §100 acceptance criteria

| Criterion                                 | Status                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| No accidental indexation loss             | Met — every retired URL 301s to a live page                               |
| Sitemap contains only intended canonicals | Met — `sitemap.ts` derives from `seoPages`; retired slugs absent          |
| No redirect loops                         | Met — asserted by `redirects.test.ts`                                     |
| No multi-hop chains                       | Met — asserted by `redirects.test.ts`                                     |
| Canonical tags correct                    | Met — `pageMetadata()` emits a self-referencing canonical per page        |
| Robots directives correct                 | Unchanged — `/app`, `/checkout`, `/api` disallowed                        |
| Titles unique                             | Met — `pnpm audit:seo` fails the build otherwise                          |
| H1s unique and intent-aligned             | Met — same audit                                                          |
| Major duplicate pages resolved            | Met — three clusters collapsed                                            |
| Internal broken links zero                | Met — audit validates every `related` href; 18 stale links were rewritten |
| Structured data validates                 | Pending manual Rich Results check (release checklist)                     |
| 404 behaviour correct                     | Unchanged — `dynamicParams = false` 404s unknown slugs                    |
| Redirects covered by automated tests      | Met — `tests/unit/redirects.test.ts` plus an e2e hop check                |

## Post-deploy actions

Deployed 2026-08-25 (`88432c0`). Verified live: all nine retired URLs return 308 and resolve to a 200 in one hop; the sitemap carries 30 URLs with every retired slug absent and all three new pages present.

Search Console and Bing Webmaster Tools were already verified at launch on 2026-08-24, so the remaining step is a person's, not the build's:

- **Resubmit the sitemap in Search Console.** Google will find the 301s eventually by recrawl, but resubmitting prompts it to reprocess the retired URLs sooner. The same applies to Bing.
- **Expect "Page with redirect" entries** in the Coverage report for the eight merged slugs plus the renamed accountants page. That is the migration working, not an error.
- Do not request removal of the retired URLs. A 301 needs to stay crawlable for the signal to pass; a removal request would sever it.

## Follow-up once data exists

Revisit after roughly eight weeks of Search Console history:

- Whether `bank-statement-converter` and `bank-statement-to-excel` are still distinct in practice, or whether the hub is absorbing the format page's queries.
- Whether the credit-card Excel/CSV split earns two URLs or should collapse the way the bank-statement pair did.
- Whether the three new use-case pages attract the problem-aware traffic they were written for, or need reframing.

None of these should be decided on taste. Wait for impressions.
