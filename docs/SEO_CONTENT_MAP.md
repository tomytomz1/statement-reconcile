# SEO content map

Canonical origin: `https://statementreconcile.com`. Titles and H1s below are from `src/content/seo/*.ts` and `src/app/(site)/page.tsx`. Primary CTA on every conversion page: **Check My Statements Free** → `/app` (`siteConfig.primaryCta`). Sitewide inbound: header, footer (all 26 landers grouped in `footerGroups`), sitemap.

Shared differentiating angle (never the homepage H1): reconciliation before payment; PDF stays in the browser; $19 once; no account. Issuer pages add a non-affiliation notice and do not claim a bank-specific parser (`bankSpecificClaims` is off).

QBO/OFX export is not promised. QuickBooks/Xero pages are **CSV import** only. Google Sheets is CSV import, not a live integration.

---

## `/` — Homepage

|                  |                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Convert Bank Statements to Excel & CSV — $19 \| Statement Reconcile                                                                                                 |
| **H1**           | Convert Bank Statements to Excel & CSV                                                                                                                              |
| **Target query** | convert bank statements to excel & csv; bank statement converter                                                                                                    |
| **Intent**       | Category / outcome: turn a PDF statement into a spreadsheet.                                                                                                        |
| **Promise**      | Upload in the browser, see extracted rows and the arithmetic check, pay $19 only if it balances.                                                                    |
| **Angle**        | Differentiator sits under the H1, not in it (ADR-008).                                                                                                              |
| **CTA**          | Check My Statements Free → `/app`; secondary See how it works → `/how-it-works`                                                                                     |
| **Out**          | `/app`, `/how-it-works`, `/security`, `/pricing`, `/refund-policy`, `/faq`, `/bank-statement-to-excel`, `/bank-statement-to-csv`, `/credit-card-statement-to-excel` |
| **In**           | Wordmark, every footer/header                                                                                                                                       |
| **Expansion**    | Do not add bank-branded claims on the home H1. Worked examples belong on landers.                                                                                   |

---

## `/bank-statement-converter`

|                  |                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement Converter — PDF to Excel & CSV \| Statement Reconcile                                     |
| **H1**           | Bank Statement Converter                                                                                 |
| **Target query** | bank statement converter                                                                                 |
| **Intent**       | Broad category: PDF in, spreadsheet out.                                                                 |
| **Promise**      | Excel + CSV; rows added up against printed balances before $19.                                          |
| **Angle**        | Column reconstruction + independent decimal check, not “AI converter.”                                   |
| **Out**          | `/bank-statement-to-excel`, `/bank-statement-to-csv`, `/credit-card-statement-to-excel`, `/how-it-works` |
| **In**           | `/bank-statement-to-csv`, `/bank-statement-transaction-extractor`, footer Excel group                    |
| **Expansion**    | Anonymised layout gallery; debit/credit vs signed-amount comparison; CSV import notes for ledgers        |

---

## `/bank-statement-to-excel`

|                  |                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Title**        | Bank Statement to Excel (.xlsx) \| Statement Reconcile                                                       |
| **H1**           | Bank statement to Excel                                                                                      |
| **Target query** | bank statement to excel                                                                                      |
| **Intent**       | Finished workbook: filter, sort, pivot immediately.                                                          |
| **Promise**      | `.xlsx` with autofilter Transactions sheet + Statement Summary; CSV included in the same $19.                |
| **Angle**        | Workbook quality + visible equation, not a CSV renamed to xlsx.                                              |
| **Out**          | `/bank-statement-to-csv`, `/pdf-bank-statement-to-excel`, `/convert-bank-statement-to-excel`, `/pricing`     |
| **In**           | Home featured, converter, pdf-excel, convert-excel, capital-one, google-sheets, csv page, accountants, chase |
| **Expansion**    | PivotTable spend guide; annotated Summary sheet; combining periods                                           |

---

## `/bank-statement-to-csv`

|                  |                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement to CSV Export \| Statement Reconcile                                                                       |
| **H1**           | Bank statement to CSV                                                                                                     |
| **Target query** | bank statement to csv                                                                                                     |
| **Intent**       | Predictable text file for another system (columns, encoding, import).                                                     |
| **Promise**      | Fixed columns Date / Posted Date / Description / Debit / Credit / Amount / Balance; UTF-8 BOM; formula-safe descriptions. |
| **Angle**        | Import hygiene + reconcile-before-pay.                                                                                    |
| **Out**          | `/bank-statement-to-excel`, `/pdf-bank-statement-to-csv`, `/convert-bank-statement-to-csv`, `/bank-statement-converter`   |
| **In**           | Home featured, converter, pdf-csv, card-csv, convert-pdf-csv, convert-csv, QB, Sheets, excel, citi, BofA                  |
| **Expansion**    | Column spec with edge cases; signed-amount mapping; quoting explainer                                                     |

---

## `/convert-bank-statement-to-excel`

|                  |                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Title**        | Convert Bank Statement to Excel \| Statement Reconcile                                               |
| **H1**           | Convert a bank statement to Excel                                                                    |
| **Target query** | convert bank statement to excel                                                                      |
| **Intent**       | Job-to-do: retype vs paste vs paid tool.                                                             |
| **Promise**      | Verdict on screen before payment; both formats after $19.                                            |
| **Angle**        | Cost of a dropped row vs $19; check is not a spot-check.                                             |
| **Out**          | `/bank-statement-to-excel`, `/convert-bank-statement-to-csv`, `/pdf-bank-statement-to-excel`, `/faq` |
| **In**           | Excel page, convert-pdf-excel, BofA                                                                  |
| **Expansion**    | Time/error vs transcription; portal export vs PDF; why sampling rows misses a drop                   |

---

## `/convert-bank-statement-to-csv`

|                  |                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Title**        | Convert Bank Statement to CSV \| Statement Reconcile                                                           |
| **H1**           | Convert a bank statement to CSV                                                                                |
| **Target query** | convert bank statement to csv                                                                                  |
| **Intent**       | Bookkeeper/owner: period into a ledger, first-time import correct.                                             |
| **Promise**      | Period + totals visible; $19 CSV (Excel included).                                                             |
| **Angle**        | Verify printed totals before import mapping.                                                                   |
| **Out**          | `/bank-statement-to-csv`, `/credit-card-statement-to-csv`, `/convert-bank-statement-to-excel`, `/how-it-works` |
| **In**           | Convert-excel, QB CSV, csv page, business                                                                      |
| **Expansion**    | Catch-up bookkeeping from a folder of PDFs; ledger column maps; posting-date vs period boundary                |

---

## `/pdf-bank-statement-to-excel`

|                  |                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Title**        | PDF Bank Statement to Excel \| Statement Reconcile                                                              |
| **H1**           | PDF bank statement to Excel                                                                                     |
| **Target query** | pdf bank statement to excel                                                                                     |
| **Intent**       | Starting point is the PDF; opening in Excel already failed.                                                     |
| **Promise**      | Text-layer PDF → workbook; scanned files refused with no charge.                                                |
| **Angle**        | Why Excel cannot “open” a statement PDF; column geometry.                                                       |
| **Out**          | `/bank-statement-to-excel`, `/pdf-bank-statement-to-csv`, `/convert-pdf-transactions-to-excel`, `/how-it-works` |
| **In**           | Extract-from-PDF, pdf extractor, convert-excel, convert-pdf-excel, excel page, Wells, Chase                     |
| **Expansion**    | Scanned vs text-layer diagnostic; column-band diagram; splitting over-50-page periods                           |

---

## `/pdf-bank-statement-to-csv`

|                  |                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| **Title**        | PDF Bank Statement to CSV \| Statement Reconcile                                                          |
| **H1**           | PDF bank statement to CSV                                                                                 |
| **Target query** | pdf bank statement to csv                                                                                 |
| **Intent**       | PDF → machine-readable file without hand tidying.                                                         |
| **Promise**      | Normalized dates/signs; reconciled totals; $19.                                                           |
| **Angle**        | Encoding, signs, dates as import failures, caught by balance check.                                       |
| **Out**          | `/pdf-bank-statement-to-excel`, `/bank-statement-to-csv`, `/convert-pdf-transactions-to-csv`, `/security` |
| **In**           | Pdf extractor, convert-pdf-csv, Xero, csv page, pdf-excel                                                 |
| **Expansion**    | Column type spec; negative-amount conventions; validating import vs statement totals                      |

---

## `/convert-pdf-transactions-to-excel`

|                  |                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Title**        | Convert PDF Transactions to Excel \| Statement Reconcile                                                           |
| **H1**           | Convert PDF Transactions to Excel                                                                                  |
| **Target query** | convert pdf transactions to excel                                                                                  |
| **Intent**       | Long statement (quarter/year, many pages) as one workbook.                                                         |
| **Promise**      | Pages stitched; full-period reconcile; 50-page cap disclosed.                                                      |
| **Angle**        | Continuation headers are not transactions.                                                                         |
| **Out**          | `/convert-pdf-transactions-to-csv`, `/convert-bank-statement-to-excel`, `/pdf-bank-statement-to-excel`, `/pricing` |
| **In**           | Pdf-excel, Discover, Citi, convert-pdf-csv                                                                         |
| **Expansion**    | Twelve-month walkthrough; pivot layouts; subtotal-as-row signature                                                 |

---

## `/convert-pdf-transactions-to-csv`

|                  |                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Title**        | Convert PDF Transactions to CSV \| Statement Reconcile                                               |
| **H1**           | Convert PDF Transactions to CSV                                                                      |
| **Target query** | convert pdf transactions to csv                                                                      |
| **Intent**       | Developer/analyst/bookkeeper feeding another program.                                                |
| **Promise**      | Parseable values, no cleanup pass; formula neutralization.                                           |
| **Angle**        | Precision and quoting, then the same $19 gate.                                                       |
| **Out**          | `/convert-pdf-transactions-to-excel`, `/bank-statement-to-csv`, `/pdf-bank-statement-to-csv`, `/faq` |
| **In**           | Pdf-csv, card-csv, convert-pdf-excel                                                                 |
| **Expansion**    | Sample edge-case CSV; mixed locale sections; Python/SQL import without float                         |

---

## `/credit-card-statement-to-excel`

|                  |                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Title**        | Credit Card Statement to Excel \| Statement Reconcile                                                                    |
| **H1**           | Credit Card Statement to Excel                                                                                           |
| **Target query** | credit card statement to excel                                                                                           |
| **Intent**       | Charges, payments, fees, interest in a sortable workbook.                                                                |
| **Promise**      | Card roll-forward equation shown; category totals when printed.                                                          |
| **Angle**        | Sign convention (charges positive) explained; not a checking template.                                                   |
| **Out**          | `/credit-card-statement-to-csv`, `/american-express-statement-to-excel`, `/discover-statement-to-excel`, `/how-it-works` |
| **In**           | Home featured, converter, Discover, card-csv, Capital One, business, Amex                                                |
| **Expansion**    | Fee-total mismatch example; FX conversion lines; charge vs revolving layouts                                             |

---

## `/credit-card-statement-to-csv`

|                  |                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **Title**        | Credit Card Statement to CSV \| Statement Reconcile                                                         |
| **H1**           | Credit Card Statement to CSV                                                                                |
| **Target query** | credit card statement to csv                                                                                |
| **Intent**       | Import card activity into expense software or a template.                                                   |
| **Promise**      | Same seven columns; payments vs credits distinguishable.                                                    |
| **Angle**        | Direction errors on credits are the usual silent disaster.                                                  |
| **Out**          | `/credit-card-statement-to-excel`, `/bank-statement-to-csv`, `/convert-pdf-transactions-to-csv`, `/pricing` |
| **In**           | Card-excel, convert-csv, Amex                                                                               |
| **Expansion**    | Expense-tool field maps; FX fee lines; credits vs payments for reporting                                    |

---

## `/business-bank-statement-to-excel`

|                  |                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Title**        | Business Bank Statement to Excel \| Statement Reconcile                                                                        |
| **H1**           | Business bank statement to Excel                                                                                               |
| **Target query** | business bank statement to excel                                                                                               |
| **Intent**       | Owner/OM/bookkeeper handing a company statement to someone else.                                                               |
| **Promise**      | One account per conversion; Summary sheet for working papers.                                                                  |
| **Angle**        | Multi-account PDFs refused; $19 per statement is explicit.                                                                     |
| **Out**          | `/bank-statement-spreadsheet-for-accountants`, `/convert-bank-statement-to-csv`, `/credit-card-statement-to-excel`, `/pricing` |
| **In**           | Accountants page                                                                                                               |
| **Expansion**    | Month-end checklist; merchant settlement lines; inter-account transfers                                                        |

---

## `/bank-statement-transaction-extractor`

|                  |                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement Transaction Extractor \| Statement Reconcile                                  |
| **H1**           | Bank Statement Transaction Extractor                                                         |
| **Target query** | bank statement transaction extractor                                                         |
| **Intent**       | Want the rows themselves, and to know if they can be trusted.                                |
| **Promise**      | Geometry-based table rebuild + independent reconcile.                                        |
| **Angle**        | Extractor that can refuse, vs always-dump OCR.                                               |
| **Out**          | `/pdf-bank-transaction-extractor`, `/bank-statement-converter`, `/how-it-works`, `/security` |
| **In**           | Extract-from-PDF, pdf extractor, Wells                                                       |
| **Expansion**    | Annotated column boundaries; section subtotals; refused-layout catalogue                     |

---

## `/pdf-bank-transaction-extractor`

|                  |                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Title**        | PDF Bank Transaction Extractor \| Statement Reconcile                                                         |
| **H1**           | PDF Bank Transaction Extractor                                                                                |
| **Target query** | pdf bank transaction extractor                                                                                |
| **Intent**       | Can _this_ PDF be processed, and what are the limits?                                                         |
| **Promise**      | Text layer required; 50 pages / 20 MB; no charge if unverified.                                               |
| **Angle**        | Eligibility before tool choice.                                                                               |
| **Out**          | `/bank-statement-transaction-extractor`, `/pdf-bank-statement-to-excel`, `/pdf-bank-statement-to-csv`, `/faq` |
| **In**           | Extract-from-PDF, transaction extractor                                                                       |
| **Expansion**    | Image-only PDF diagnostic; splitting oversized docs; mixed text+scan attachments                              |

---

## `/extract-transactions-from-pdf`

|                  |                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Extract Transactions from PDF \| Statement Reconcile                                                                        |
| **H1**           | Extract transactions from a PDF                                                                                             |
| **Target query** | extract transactions from pdf                                                                                               |
| **Intent**       | Copy-paste collapsed; wants to know why PDFs behave that way.                                                               |
| **Promise**      | Positioned text → lines → columns → reconcile.                                                                              |
| **Angle**        | Visual order ≠ content-stream order.                                                                                        |
| **Out**          | `/bank-statement-transaction-extractor`, `/pdf-bank-transaction-extractor`, `/pdf-bank-statement-to-excel`, `/how-it-works` |
| **In**           | Google Sheets page                                                                                                          |
| **Expansion**    | Annotated page diagram; reading-order note; left narrative vs right amounts                                                 |

---

## `/bank-statement-spreadsheet-for-accountants`

|                  |                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement Spreadsheets for Accountants                                                                       |
| **H1**           | Bank statement to spreadsheet for accountants                                                                     |
| **Target query** | bank statement to spreadsheet for accountants                                                                     |
| **Intent**       | Practitioner: cost per job, evidence quality, client data.                                                        |
| **Promise**      | No account, PDF never uploaded, Summary sheet for papers; $19/statement.                                          |
| **Angle**        | Evidence trail without holding client files.                                                                      |
| **Out**          | `/business-bank-statement-to-excel`, `/bank-statement-to-quickbooks-csv`, `/bank-statement-to-excel`, `/security` |
| **In**           | Business page                                                                                                     |
| **Expansion**    | Sample anonymised Summary; documenting a failed reconcile; multi-month sequencing                                 |

---

## `/bank-statement-to-quickbooks-csv`

|                  |                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement to QuickBooks CSV \| Statement Reconcile                                           |
| **H1**           | Bank statement to QuickBooks CSV                                                                  |
| **Target query** | bank statement to quickbooks csv                                                                  |
| **Intent**       | Bank feed missing/incomplete; need CSV for QB **import**.                                         |
| **Promise**      | Generic CSV; map columns in QB; not `.qbo` (flag off).                                            |
| **Angle**        | Honest about format; verify before mapping.                                                       |
| **Out**          | `/bank-statement-to-xero-csv`, `/bank-statement-to-csv`, `/convert-bank-statement-to-csv`, `/faq` |
| **In**           | Xero page, accountants                                                                            |
| **Expansion**    | Four-column mapping example; inverted-sign in first ten rows; period boundaries                   |

---

## `/bank-statement-to-xero-csv`

|                  |                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement to Xero CSV \| Statement Reconcile                                                                      |
| **H1**           | Bank statement to Xero CSV                                                                                             |
| **Target query** | bank statement to xero csv                                                                                             |
| **Intent**       | Manual import into a Xero bank account; file shape and failure mode.                                                   |
| **Promise**      | CSV download after reconcile; map in Xero; not a Xero app.                                                             |
| **Angle**        | Wrong file detected by printed totals, not after a messy reconcile in Xero.                                            |
| **Out**          | `/bank-statement-to-quickbooks-csv`, `/bank-statement-to-google-sheets`, `/pdf-bank-statement-to-csv`, `/how-it-works` |
| **In**           | QB page, Sheets                                                                                                        |
| **Expansion**    | Year of imports without overlap; net movement vs printed totals; payee vs reference recon                              |

---

## `/bank-statement-to-google-sheets`

|                  |                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank Statement to Google Sheets \| Statement Reconcile                                                                |
| **H1**           | Bank statement to Google Sheets                                                                                       |
| **Target query** | bank statement to google sheets                                                                                       |
| **Intent**       | Browser spreadsheet; share/filter/total in Sheets.                                                                    |
| **Promise**      | CSV → File → Import; locale/decimal warning; same $19 files.                                                          |
| **Angle**        | Locale settings as the hidden import bug.                                                                             |
| **Out**          | `/bank-statement-to-csv`, `/bank-statement-to-xero-csv`, `/bank-statement-to-excel`, `/extract-transactions-from-pdf` |
| **In**           | Xero page                                                                                                             |
| **Expansion**    | Locale/decimal reference; template with monthly tabs; double-import via row counts                                    |

---

## `/chase-statement-to-excel`

|                  |                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Title**        | Chase Statement to Excel — PDF Converter \| Statement Reconcile                                                |
| **H1**           | Chase Statement to Excel                                                                                       |
| **Target query** | chase statement to excel                                                                                       |
| **Intent**       | Holding a Chase PDF; will a generic converter cope?                                                            |
| **Promise**      | Try it; pay only if it balances. Independent of JPMorgan Chase.                                                |
| **Angle**        | Eligibility-by-running, not a Chase-certified template.                                                        |
| **Out**          | `/bank-statement-to-excel`, `/pdf-bank-statement-to-excel`, `/bank-of-america-statement-to-excel`, `/security` |
| **In**           | Wells                                                                                                          |
| **Expansion**    | Text-layer check in readers; online-banking PDF vs paper scan; partial first period                            |

---

## `/bank-of-america-statement-to-excel`

|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Title**        | Bank of America Statement to Excel \| Statement Reconcile                                                        |
| **H1**           | Bank of America Statement to Excel                                                                               |
| **Target query** | bank of america statement to excel                                                                               |
| **Intent**       | Deposit PDF; deposits/withdrawals on the correct side.                                                           |
| **Promise**      | Direction from column position; independent of Bank of America.                                                  |
| **Angle**        | Two-column debit/credit layouts.                                                                                 |
| **Out**          | `/convert-bank-statement-to-excel`, `/bank-statement-to-csv`, `/wells-fargo-statement-to-excel`, `/how-it-works` |
| **In**           | Chase                                                                                                            |
| **Expansion**    | Right-edge amount alignment; Debit/Credit vs Amount consumers; reversed-row signature                            |

---

## `/wells-fargo-statement-to-excel`

|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Title**        | Wells Fargo Statement to Excel \| Statement Reconcile                                                            |
| **H1**           | Wells Fargo Statement to Excel                                                                                   |
| **Target query** | wells fargo statement to excel                                                                                   |
| **Intent**       | Long multi-page PDF; whole period, no header pollution.                                                          |
| **Promise**      | Page furniture filtered; 50-page limit stated; independent of Wells Fargo.                                       |
| **Angle**        | Stitching pages vs dumping every line of text.                                                                   |
| **Out**          | `/pdf-bank-statement-to-excel`, `/bank-statement-transaction-extractor`, `/chase-statement-to-excel`, `/pricing` |
| **In**           | BofA                                                                                                             |
| **Expansion**    | Period choice under the page cap; page-furniture patterns; count vs printed activity                             |

---

## `/capital-one-statement-to-excel`

|                  |                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **Title**        | Capital One Statement to Excel \| Statement Reconcile                                             |
| **H1**           | Capital One Statement to Excel                                                                    |
| **Target query** | capital one statement to excel                                                                    |
| **Intent**       | Could be deposit **or** card from the same issuer.                                                |
| **Promise**      | Engine picks asset vs credit equation; independent of Capital One.                                |
| **Angle**        | One brand, two statement families.                                                                |
| **Out**          | `/credit-card-statement-to-excel`, `/bank-statement-to-excel`, `/citi-statement-to-excel`, `/faq` |
| **In**           | Footer issuer group only (no other lander related-link)                                           |
| **Expansion**    | Side-by-side equations; why two accounts cannot share a conversion; Summary fields by type        |

---

## `/citi-statement-to-excel`

|                  |                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Citi Statement to Excel — PDF to XLSX \| Statement Reconcile                                                        |
| **H1**           | Citi Statement to Excel                                                                                             |
| **Target query** | citi statement to excel                                                                                             |
| **Intent**       | Grouped sections with printed subtotals, one spreadsheet.                                                           |
| **Promise**      | Stated subtotals vs extracted rows; independent of Citigroup.                                                       |
| **Angle**        | Layered checks catch a subtotal ingested as a transaction.                                                          |
| **Out**          | `/bank-statement-to-csv`, `/convert-pdf-transactions-to-excel`, `/american-express-statement-to-excel`, `/security` |
| **In**           | Capital One                                                                                                         |
| **Expansion**    | Offsetting errors; common section headings; subtotal-as-row arithmetic                                              |

---

## `/american-express-statement-to-excel`

|                  |                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Title**        | American Express Statement to Excel \| Statement Reconcile                                                          |
| **H1**           | American Express Statement to Excel                                                                                 |
| **Target query** | american express statement to excel                                                                                 |
| **Intent**       | Spending, payments, fees, interest stay distinguishable.                                                            |
| **Promise**      | Category classification + new-balance recompute; independent of American Express.                                   |
| **Angle**        | Collapsing everything into one signed column is the failure mode.                                                   |
| **Out**          | `/credit-card-statement-to-excel`, `/credit-card-statement-to-csv`, `/discover-statement-to-excel`, `/how-it-works` |
| **In**           | Discover, card-excel, Citi                                                                                          |
| **Expansion**    | Expense reporting with fees/interest split; txn date vs posted date; cash-advance categorisation                    |

---

## `/discover-statement-to-excel`

|                  |                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Title**        | Discover Statement to Excel \| Statement Reconcile                                                                           |
| **H1**           | Discover Statement to Excel                                                                                                  |
| **Target query** | discover statement to excel                                                                                                  |
| **Intent**       | Cashback and statement credits must not be treated as charges.                                                               |
| **Promise**      | Credits identified before totaling; independent of Discover.                                                                 |
| **Angle**        | One reversed credit doubles the error in the total.                                                                          |
| **Out**          | `/credit-card-statement-to-excel`, `/convert-pdf-transactions-to-excel`, `/american-express-statement-to-excel`, `/security` |
| **In**           | Card-excel, Amex                                                                                                             |
| **Expansion**    | Credit-type taxonomy; doubling effect of a reversed sign; credits vs merchant refunds                                        |

---

## Supporting indexable pages (not in `seoPages[]`)

These are real routes with their own copy. They are not conversion landers.

| Path                                            | Role in the graph                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/how-it-works`                                 | Process + equation; linked from many `related` arrays and header                    |
| `/pricing`                                      | $19 once, 50 pages; linked from excel/csv/business/wells/convert-pdf                |
| `/security`                                     | Trust page; linked from issuer and extractor related                                |
| `/faq`                                          | Objections; linked from convert-excel, extractors, QB, Capital One, convert-pdf-csv |
| `/privacy` `/terms` `/refund-policy` `/contact` | Footer trust column                                                                 |

`/app` and `/checkout/*` are **noindex** and must stay out of the sitemap.
