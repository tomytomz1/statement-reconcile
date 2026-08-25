# Statement Reconcile — Market-Dominance Product & Growth PRD

**Status:** Authoritative product / website / SEO build spec
**Version:** 2.0
**Date:** 2026-08-25
**Domain:** statementreconcile.com

> **On this copy.** The governing text was supplied by the product owner. This file records it for future work in the repository. Where a section below is condensed rather than quoted in full, it is marked _(condensed)_ — the owner's original remains the authority in any dispute, and `docs/prd-v2-implementation-plan.md` records what was actually built.

---

## 1. Executive product decision

Statement Reconcile must stop presenting itself primarily as another bank statement PDF converter with unusually strong reconciliation. That category is commoditising: extraction is getting cheap, generic AI can extract tables, and competitors can claim high accuracy and reconcile opening and closing balances.

The category to own instead is **Verified Bank Statement Conversion**.

- **Master proposition:** Convert first. Verify second. Pay last.
- **Direct-response line:** The bank statement converter that won't sell you a bad spreadsheet.
- **Named mechanism:** Source-to-Sheet Verification. This is the mechanism, not the headline.
- **Customer-facing promise:** If the conversion cannot pass the required verification checks, checkout does not open.

This must organise the homepage, converter UX, pricing, advertising, SEO, roadmap, comparison content, trust architecture, onboarding, and future integrations.

## 2. Mission

Eliminate two kinds of work: retyping financial transactions from PDF statements, and manually checking whether a converter reproduced the statement correctly.

The desired result is not a spreadsheet. It is a clean, usable transaction file accompanied by enough source evidence and arithmetic verification that the customer does not need to manually QA hundreds of rows before using it.

## 3. Ideal customer profile

The bullseye avatar is **the catch-up bookkeeper**: solo bookkeepers, independent accountants, bookkeeping firms, tax preparers, cleanup specialists, fractional finance professionals, accounting contractors. Typically 1–20 employees, servicing multiple SMB clients, using QuickBooks Online, QuickBooks Desktop, Xero and/or Excel, with episodic rather than constant conversion demand, and no appetite for another SaaS subscription.

## 4. Primary job to be done

> A client has supplied months or years of bank or credit-card statements as PDFs, and I need clean historical transaction data for bookkeeping, catch-up work, taxes, reconciliation or migration without manually retyping and verifying every transaction.

Trigger events: bank feed history too short, account closed, client supplied only PDFs, prior bookkeeper left incomplete records, cleanup engagement started late, tax deadline approaching, books being reconstructed or migrated, accountant needs source-supported working papers.

## 5. Emotional state

The buyer is not excited about PDF conversion. They are behind, irritated, under a deadline, doing low-value preparatory work, worried about introducing bad data, reluctant to upload client financial information, unwilling to inspect hundreds of rows by hand, and looking for the fastest defensible path to finished books. Sell the removal of the workload; do not romanticise conversion.

## 6–7. Secondary and excluded audiences _(condensed)_

Also supported, but must not dilute positioning: small-business owners, tax professionals, forensic/accounting support, finance teams, individuals.

Not optimising for yet: enterprise AP automation, bank-feed replacement, expense management, general-purpose OCR, enterprise document management, fraud detection, lending underwriting, full bookkeeping automation, categorisation as the main product, accounting advisory.

## 8. Core customer problems, ranked

1. **P1 — Manual re-entry.** Hundreds or thousands of rows should not be typed.
2. **P2 — Manual verification.** A converter can move data-entry work into QA rather than removing it.
3. **P3 — False confidence.** A clean spreadsheet may hide missing or duplicated transactions, incorrect signs, shifted columns, missing pages, wrong amounts or balances.
4. **P4 — Privacy anxiety.** The document contains sensitive financial information.
5. **P5 — Import friction.** The job usually ends in QuickBooks, Xero, Excel, or CSV.
6. **P6 — Subscription mismatch.** Catch-up work is episodic.

## 9–12. Positioning, message hierarchy, and language

**Category:** Verified Bank Statement Converter. **Differentiating mechanism:** Source-to-Sheet Verification. **Risk reversal:** failed verification means no checkout. **Privacy position:** the original PDF remains on the user's device. **Commercial model:** one-time, no signup, no subscription.

Communicate in this order: (1) outcome, (2) pain removed, (3) verification happens before checkout, (4) proof mechanism, (5) risk reversal, (6) privacy, (7) convenience, (8) technical explanation. **Do not start at level 8.**

De-emphasise unsupported marketing language: revolutionary, game-changing, flawless, perfect, guaranteed accurate, bank-grade, enterprise-grade, industry-leading, best, #1, 100% accurate, AI-powered. Compete through observable mechanisms, not adjectives.

## 13–17. The offer

**Verified Conversion Pack — $19 one-time**, for one or more supported statements up to 50 pages total, with complete preview and verification before payment.

Includes: Excel workbook, CSV, statement summary / verification data, a verification PDF for each accepted statement, source references, pack manifest, 30-day paid entitlement, 30-day refund protection.

> **Implementation note.** "30-day download entitlement" as originally worded overstates what survives. The entitlement lasts 30 days; the converted result is held only in the customer's browser and expires within the hour. See `docs/v2-phase1-closure-audit.md` for the full retention semantics.

Excludes: signup, user account, subscription, recurring payment, stored card, hidden commitment.

Present it as the complete verified deliverable, not a stack of bonuses.

**Guarantee — Proof-Before-Payment:** if the required verification checks do not pass, checkout does not open. Secondary: if a paid file is incorrect, incomplete or unusable, request a full refund within 30 days. Do not call the conversion infallible, and do not imply it verifies the authenticity of a statement.

**Price transparency (§17):** the strategy of revealing the price only after successful verification is retired. Price appears on the homepage hero, upload component, pricing page, final CTA, and relevant money landing pages. Preferred microcopy: _Free verification · $19 only if your pack passes · No subscription_. Do not require the customer to expose sensitive data before knowing the price.

If current processing economics make $19 unsustainable, stop before publishing the price and calculate actual cost per successful pack. Do not silently substitute another price.

## 18. Product invariants — do not break

**Privacy.** Original PDF stays client-side and is never uploaded. Extracted text is transmitted only as required for processing and is not persisted. Statement content never enters analytics, logs, or Stripe metadata.

**Authentication.** No account, no password, no retained credential.

**Payment.** Stripe-hosted checkout. The application never processes raw card details. No forced subscription, no stored customer payment profile.

**Verification.** Deterministic arithmetic stays separate from probabilistic extraction. Unresolved material ambiguity must fail closed. Export must never be generated merely because payment occurred. Reconciliation must be revalidated before export.

**Security.** No third-party analytics scripts on the sensitive processing route. The strict CSP must not regress. Spreadsheet formula-injection defences remain. Input bounds stay server-enforced. Logs stay content-free.

## 19. Core product principle

The application is allowed to say **"I don't know."** It is not allowed to transform uncertainty into plausible-looking financial data. This must survive extraction, OCR, correction workflows, exports, integrations, and AI improvements.

## 20–24. Homepage objective, IA, and hero

Primary goal: get a qualified visitor to start verification. Primary CTA: **Verify My Statements Free** — not "Check My Statements", which does not describe the value exchange.

Required section order: hero → upload entry → verification proof → problem/catch-up → value proposition → how verification works → general-AI comparison → avatars/use cases → offer and pricing → privacy/security → supported/unsupported → FAQ → final CTA.

**Hero copy.** Eyebrow: _Verified Bank Statement Converter_. H1: _Convert PDF Bank Statements to Excel & CSV — and See the Proof Before You Pay_. Subheadline: turning months of statements into clean transaction files without retyping them or checking hundreds of rows by hand, with accepted transactions traced back to the statement and the applicable numbers checked before checkout. CTA microcopy: _Free verification · $19 only if your pack passes · No signup · No subscription_. Privacy microcopy: _Your original PDF stays on this device._ Secondary proof: _If the required verification checks don't pass, checkout doesn't open._

**Upload component.** Label _Choose your PDF statements_; button _Choose PDF Statements_; limits line stating PDF, page cap, text-based statements, file-size cap; price line _Verify free. Pay $19 only after the pack passes._

**Trust strip.** Four proof points: No signup / PDF stays local / Verified before payment / Excel + CSV.

## 25–32. Homepage sections _(condensed — full copy in the owner's original)_

**Proof section.** Eyebrow _Proof, not an accuracy claim_; heading _Don't trust "99.9% accurate." See whether your own statement checks out._ Show a worked example: document coverage, source-linked transactions, running-balance checks, closing-balance difference, plus one converted transaction beside its source line.

**Problem section.** _The converter isn't the expensive part. Checking its work is._ Three cards: don't retype it, don't blindly trust it, don't buy uncertainty.

**Catch-up section.** _Your client sent twelve months of PDFs. You still need the books finished._ Use cases: catch-up bookkeeping, closed or migrated accounts, historical QuickBooks reconstruction, tax prep, cleanup engagements, missing bank-feed history, credit-card history, spreadsheet analysis.

**Source-to-Sheet Verification.** Four checks — Document Coverage, Row-to-Source Tracing, Balance Reconstruction, Fail-Closed Verification — plus the qualification that "verified" refers only to the checks Statement Reconcile performs, and does not authenticate the statement, verify the bank's records, replace accounting reconciliation, or provide advice.

**How it works.** Three steps: choose your statements, review the conversion, decide after it passes.

**General-AI comparison.** _AI can extract rows. Who checks the rows?_ A nine-row capability table, fairly stated: use a general AI assistant for flexibility, use Statement Reconcile for a repeatable workflow with verification attached.

**Avatars.** Bookkeepers, accountants, tax preparers, business owners.

**Pricing.** _Free to verify. $19 only when your pack passes._ Price card with inclusions and the commercial rules: no signup, no subscription, no stored card, no charge for failed verification.

## 33–36. Subscription rationale, privacy, security, supported files

**No subscription:** statement conversion is often occasional; the bill should be too.

**Privacy:** _Your PDF is never uploaded to Statement Reconcile._ Never simplify this to "nothing leaves your device" — that would be inaccurate. Use "the original PDF never leaves your device" and explain the transient text processing accurately.

**Security proof points** must be facts, not badges: no original PDF upload, no stored statement archive, no password, Stripe-hosted card entry, processing-route CSP, no third-party analytics script on the processing route, statement content excluded from logs, server-side export gate, reconciliation re-run before export, formula-injection protection. Do not display SOC 2, ISO, PCI, or penetration-test claims unless they become true.

**Supported / not yet supported** must reduce failed uploads without frightening good prospects. _Downloaded from online banking? Good._

## 37–40. Product states

**Failure** must answer what happened, why the conversion cannot be sold, and what to do next — and must state plainly that no charge occurred. Never say "something went wrong" when the application knows what happened.

**Success** shows the evidence counts, then the offer.

**Payment abandonment** leads with the verified result still being available on the device, and that no charge occurred unless Stripe confirms payment.

**Download** shows independent buttons per file, the entitlement expiration, and a refund-policy link. Do not upsell aggressively after payment.

## 41–42. Pricing and bookkeeper pages _(condensed)_

`/pricing` — H1 _Free to verify. $19 only when your conversion passes._ Sections: why pay after verification, what if my statement fails, is this a subscription.

Bookkeeper page — preferred URL `/bank-statement-converter-for-bookkeepers`. H1 _Catch Up Months of Bookkeeping Without Retyping Bank Statements_. If the existing accountant URL has SEO equity, either retain and substantially improve it, canonicalize, or redirect only after evaluating indexation and backlinks.

## 43–53. SEO strategy _(condensed)_

Do not build SEO around every syntactic variation of the same keyword; search engines understand closely related phrasing. Aim for one strong page per distinct intent, useful supporting pages, genuinely institution-specific bank pages, use-case pages, comparison pages, and original research — topical authority without doorway-page behaviour.

Primary money pages: `/bank-statement-converter`, `/bank-statement-to-excel`, `/bank-statement-to-csv`, `/credit-card-statement-to-excel`.

**§45 requires a complete URL inventory before any redirect decision**, recording title, H1, canonical, indexability, sitemap inclusion, content overlap, internal links, backlinks and Search Console data where available, then classifying each as KEEP / MERGE + 301 / CANONICALIZE / REWRITE TO DISTINCT INTENT / NOINDEX. Do not mass-delete.

New use-case pages: catch-up bookkeeping, closed-account statements, old statements to QuickBooks (only once the downstream workflow is accurate and documented), and a genuinely useful bank-feed-history troubleshooting page.

Comparison content only after the core pages are strong, and always fair. Structured data must match visible content, with no fabricated ratings or reviews. Build internal-linking hubs; the footer should help navigation, not act as a link farm.

The long-term organic asset is **The Bank Statement Conversion Accuracy Benchmark**, whose most important metric is the **False Verified Rate** — the percentage of materially incorrect conversions the system nevertheless labels verified. Target as close to zero as realistically achievable; never claim zero without sufficient evidence. Never publish private customer documents.

## 54–57. Roadmap and Phase 1

Phase 0 protect baseline · Phase 1 offer and conversion architecture · Phase 2 SEO consolidation · Phase 3 QuickBooks-ready output · Phase 4 correctable exceptions · Phase 5 verified OCR · Phase 6 larger catch-up packs · Phase 7 research moat. Do not attempt phases 3–6 simultaneously.

**Phase 1 ships now** and does not wait for QBO or OCR: homepage restructuring and copy, $19 price transparency after validating economics, stronger CTA language, revised pricing page, improved converter state copy, improved failure messages, improved success and checkout presentation, bookkeeper positioning, precise privacy wording, privacy-safe analytics instrumentation, SEO metadata, accessibility and performance regression checks.

Done means: the visitor understands the product in five seconds, sees the Excel/CSV outcome, understands verification precedes payment, sees the actual price, knows there is no subscription, and understands the original PDF stays local — with one dominant CTA, an above-fold upload, clear pass and fail states, technically accurate trust claims, and every existing verification, payment, export, CSP and analytics-privacy test still passing.

## 58–60. Measurement

Analytics must measure funnel behaviour without capturing financial content. Properties stay coarse — page-count bucket, statement-count bucket, result enum, failure-category enum, device class, referral page, output type.

**Forbidden:** filename, bank balance, account number, potentially identifying statement date, transaction description, transaction amount, full extracted text, raw provider payload, raw error message containing statement data.

**North-star metric: Paid Verified Packs** — not traffic, uploads, generated rows, or accounts. Supporting metric: Verified Pack Completion Rate. A growing top of funnel with low verification success is not success.

## 61–72. Later phases _(condensed)_

**Phase 2** consolidates SEO, producing `docs/seo-url-migration-v2.md` with every old URL and its target behaviour, no redirect chains, and preserved high-value URLs.

**Phase 3** is the highest-priority functional expansion. Do not start by generating `.QBO`; run a technical spike and write `docs/adr-quickbooks-export.md` first. Do not call a generic CSV "QuickBooks-ready" unless it is structured and tested against supported import flows.

**Phase 4** turns ambiguity from rejection into isolated review, user correction, and deterministic re-verification. Correction must never become a way to bypass reconciliation: provenance is preserved, the field is recorded as user-confirmed, full recalculation is triggered, and all normal gates still apply.

**Phase 5** is Verified OCR. Not "OCR → plausible CSV → success" but "OCR → candidate structured data → source evidence → deterministic verification → pass or fail". The critical measure is false verification after OCR, which matters more than raw character accuracy.

**Phase 6** may raise the 50-page cap, but only after benchmarking memory, provider limits, processing time, browser storage, timeout behaviour, envelope size, export generation, and cost.

## 73–75. Proof strategy

Do not pretend to have customers that do not exist. Acquire evidence deliberately — target ten bookkeeper/accountant case studies, with permission required for attribution. Weak testimonials say "amazing product"; strong ones describe the actual job. Until strong customer proof exists, the product carries the trust burden: worked example, exact verification counts, exact arithmetic, transparent methodology, security design, free verification, no-charge failure.

## 76–80. Design, accessibility, performance _(condensed)_

Feel like a serious financial utility: calm, precise, transparent, modern, technical without being developer-centric. Avoid crypto aesthetics, neon AI gradients, excessive animation, fake dashboards, stock photos, robot illustrations, and pricing theatrics.

Above the fold must make five things obvious: what goes in, what comes out, why this converter is different, what it costs, and how to begin.

Mobile must have no horizontal overflow, an easily tapped upload control, a proof table that converts cleanly, a comparison table that becomes cards or is horizontally accessible, and no giant hero consuming multiple screens before the upload.

Target WCAG 2.2 AA where practical. Do not let marketing assets degrade converter performance.

## 81–82. Experiments _(condensed)_

Test one variable at a time. Hero A: _Convert PDF Bank Statements to Excel & CSV — and See the Proof Before You Pay_ (SEO-safe control). Hero B: _The Bank Statement Converter That Won't Sell You a Bad Spreadsheet._ Also test CTA wording, price-line wording, and a generic versus catch-up-bookkeeping avatar callout. Track upload and purchase, not merely clicks. Do not run ad claims inconsistent with the landing page or the product.

## 83–86. Competitive position and claims guardrails

Do not fight mature competitors feature-for-feature on integrations, OCR providers, page quotas, enterprise seats, or APIs. Win the narrow wedge first: **the highest-confidence, lowest-friction one-off conversion for a customer who wants proof before paying.**

"Verified" means the extraction passes defined Statement Reconcile checks. It does not mean bank-authenticated, fraud-free, audit-certified, accountant-approved, legally authentic, financially correct beyond the source document, or tax-ready by itself.

Copy must be specific over vague, outcome-led over platform-led, in buyer language, plain English before mechanism, and must never claim more than the product proves.

## 87–89. Navigation, footer, FAQ

Primary nav: Convert, How It Works, For Bookkeepers, Pricing, Security, with a primary nav CTA. Do not fill primary navigation with SEO pages. Simplify the footer into Product, Use Cases, Supported Banks, and Trust groups; avoid dozens of near-identical anchors. Keep six to eight high-value homepage FAQs.

## 90–98. Support, testing, and regression _(condensed)_

Add safe support categorisation and never prepopulate customer statement content into third-party support systems. Build a privacy-safe bank support matrix from synthetic or redacted fixtures — never from real customer statements. Do not claim "supports every bank" until defensible.

Standardise machine-readable failure reasons; analytics records the enum only.

Maintain fixtures for deposit accounts, credit cards, and adversarial cases — missing page, duplicated page, duplicate row, sign reversal, altered amount, malformed date, pages out of order, ambiguous transactions, formula-injection-like descriptions, oversized input, unsupported layouts.

**The core verification test:** the system must never produce a verified result merely because the extracted table looks plausible. Deliberately generate plausible-but-incorrect extraction output and assert it fails.

Preview, XLSX, CSV, verification PDF, manifest and any future QBO export must all correspond to the same sealed paid result. Security regression tests must cover export without payment, fake Stripe sessions, a paid session bound to a different result, altered payloads, altered balances or transactions, expired results, CSP regression, formula injection, malicious filenames, oversized payloads, malformed input, and rate-limit bypass.

## 99–101. Acceptance criteria _(condensed)_

A first-time visitor must be able to answer, without scrolling the whole page: what it does, why this rather than another converter, how much, what happens if it doesn't work, whether an account is needed, whether the PDF is uploaded, and what to click.

SEO migration is complete only with no indexation loss, a sitemap of intended canonicals, no redirect loops or chains, correct canonicals and robots directives, unique titles and H1s, resolved duplicates, zero broken internal links, validating structured data, correct 404 behaviour, and redirect tests.

Reject copy that promises unsupported formats, claims all banks, implies OCR before release, implies authentication of the source statement, implies accounting advice, says nothing leaves the device, hides a real limitation, fabricates usage statistics, uses fake urgency or scarcity, or claims guarantees beyond the actual refund policy.

## 102–105. Execution

Order: baseline documentation → map components to requirements → implementation checklist → shared copy primitives only where they genuinely reduce duplication → homepage → converter states → pricing → bookkeeper positioning → navigation and footer → safe analytics → regression, security, accessibility and performance tests → SEO URL audit → SEO consolidation, separately → commit Phase 1. Do not start QuickBooks or OCR work until Phase 1 is stable.

Required documents: `docs/PRD-v2.md`, `docs/product-baseline-before-prd-v2.md`, `docs/prd-v2-implementation-plan.md`, `docs/seo-url-migration-v2.md`, `docs/prd-v2-release-checklist.md`, and later `docs/adr-quickbooks-export.md` and `docs/adr-verified-ocr.md`.

**Stop conditions.** Stop and document rather than guessing if $19 produces unsafe unit economics, a requested copy claim is contradicted by the code, processing behaves differently from this PRD, multi-statement behaviour is materially inconsistent across pages, a redirect could destroy a URL with meaningful existing performance, QuickBooks requirements are unclear, an analytics script would weaken the processing-page CSP, a design library would introduce third-party runtime code into the sensitive route, or a feature would require storing statements. Do not conceal inconsistencies.

## 106. Questions to answer from the repository

Eighteen questions covering price configuration and server control, multi-statement packs, page and file-size limits, local result and entitlement lifetimes, the active analytics library and whether it loads on the processing route, which statement types have deterministic verification, what constitutes `verified = true`, whether a statement can pass without source-link coverage, whether all exports derive from the same sealed model, whether export re-runs verification, how multi-statement packs are represented, which URLs rank, which pages are functional duplicates, and which copy promises are inconsistent with current behaviour.

**Answered in full in `docs/product-baseline-before-prd-v2.md`.** Fix factual inconsistency before amplifying marketing.

## 107–115. Long-term position

Stage A own verified one-off conversion · Stage B own catch-up bookkeeping conversion · Stage C increase recoverable documents · Stage D increase job size · Stage E increase workflow value · Stage F professional workflow. Any movement toward persistence or accounts requires a separate privacy and security product decision.

The company should not try to become the biggest PDF extraction platform. It should become **the trust layer between financial PDFs and structured bookkeeping data** — extraction, source provenance, document completeness, deterministic financial verification, fail-closed decisioning, explicit exception handling, and downstream-safe export, together.

**The customer promise:** you should not have to trust a converter and then check its work yourself.

**Company strategy in one sentence:** make verification more valuable than extraction. Extraction keeps getting cheaper; trustworthy completion is the product.

The immediate goal is not to build everything listed here. It is to turn the existing technical differentiation into an offer the market instantly understands, then let real customer behaviour determine the next engineering investment. Expected priority: offer and copy, SEO consolidation, QuickBooks-ready output, correctable exceptions, verified OCR, larger packs. **Do not invert this sequence without data.**
