# Threat model

**Statement text is untrusted data.** Descriptions, amounts, and even “instructions” printed on a PDF are attacker-controlled. Treat them like user input at every sink: logs, LLM prompts, CSV/XLSX, HTML preview, Stripe metadata, analytics.

Assets that matter: in-flight parse bodies, the sealed envelope in the customer’s browser, parser-provider traffic (if enabled), Stripe session metadata (digest only), this codebase and its CI/deploy pipeline.

There is no statement database. Compromise of Vercel still does not yield an archive of customer statements.

## Leaked statement content

**Threat.** Parse bodies, previews, or envelopes appear in logs, support email, error traces, analytics, or a cached HTML page.

**Mitigations.** Logging vocabulary forbids description/amount/statement/payload keys and strips long digit runs. Production `logFailure` records the exception constructor name only (Zod quotes values). API and `/app` are `no-store` + `noindex`. Support copy forbids attaching statements. Preview is 10 rows, rendered as text in React (not `dangerouslySetInnerHTML`).

**Residual.** Vercel request logs have IPs. Hosting staff with runtime access could theoretically dump in-flight memory. Optional LLM vendor sees reconstructed text for fallback parses.

## Malicious PDF

**Threat.** Encrypted, malformed, or exploit-laden PDFs targeting pdf.js or the server.

**Mitigations.** PDF never uploaded. Server accepts JSON text runs, not PDF bytes. Client rejects non-`%PDF-`, empty, oversized, encrypted, and low-text (scanned) files. Worker is same-origin. CSP: `object-src 'none'`, `frame-src 'none'`.

**Residual.** A pdf.js RCE in the customer’s browser is their device. Keep `pdfjs-dist` updated.

## Oversized payload

**Threat.** Memory/CPU exhaustion via huge JSON or envelopes.

**Mitigations.** `readJsonBody` aborts past 4 MB (parse) / 6 MB (checkout/export). Zod caps pages, items, chars. Envelope max 3 000 000 chars. `maxDuration` 60 s on parse/export. File size 20 MB and 50 pages in the client and server.

## Parser prompt injection

**Threat.** Statement text contains “ignore previous instructions”, JSON, or fake totals meant to steer the LLM.

**Mitigations.** Deterministic parser runs first. Prompt wraps content in `<<<STATEMENT_TEXT_BEGIN/END>>>` and states it is DATA. Structured output is schema-validated; unknown keys (e.g. `reconciled: true`) are stripped. **Reconciliation is local code and must pass.** Invented rows that do not balance are rejected and never sold.

**Residual.** A model could still leak prompt text into `notes` (bounded, not shown as HTML). A model could omit rows in a way that still balances (offsetting errors). Layered methods (running balances + stated totals) reduce that. Do not treat prompt rules as a security boundary.

## LLM-hallucinated transactions

**Threat.** Provider invents, drops, or mis-signs rows.

**Mitigations.** Same as above: canonicalize, digest, **reconcile**. Checkout/export re-reconcile. Structural checks catch ambiguous signs, impossible duplicate+balance pairs, dates far outside the period. Fail closed: insufficient balancing data is a rejection.

**Residual.** Offsetting hallucinations that preserve all printed totals. Internal accuracy targets are in [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md); they are not public guarantees. Customer is told to review before relying.

## Stolen paid URL / session

**Threat.** Attacker has `cs_live_…` from a referrer, email, or shoulder-surf.

**Mitigations.** Verify returns only the digest. Export still needs the matching sealed envelope. Digest is one-way. Session ids are not placed on indexable URLs (`/checkout` is noindex). Analytics strips query strings. 30-day entitlement window.

**Residual.** Attacker with both the session id **and** a copy of the victim’s IndexedDB envelope (same browser profile, stolen disk, XSS) can re-download that statement. CSP on `/app` is the XSS control.

## Payment bypass

**Threat.** Call `/api/export` without paying, or reuse another digest.

**Mitigations.** Live Stripe retrieve; `payment_status === "paid"`; constant-time digest compare; mock path impossible when `NODE_ENV=production` or `APP_ENV≠test`. Checkout refuses unreconciled envelopes. No signed cookies, no local purchase table.

## Replay

**Threat.** Replay a paid export or a webhook.

**Mitigations.** Replays of export for the **same** digest are allowed by design (lost-file recovery), bounded to 30 days. Replay against a different envelope fails digest/unseal. Webhook signature required; webhook does not grant downloads, so replay is log noise.

## XSS via descriptions

**Threat.** `<script>` or event handlers in a payee name execute in `/app`.

**Mitigations.** React text nodes. Strict CSP on processing routes: nonce + `strict-dynamic`, no third-party script, `connect-src 'self'` only. Preview descriptions are truncated for display. Do not introduce `dangerouslySetInnerHTML` for statement fields.

## CSV / Excel formula injection

**Threat.** Description `=cmd|'…'` executes when the customer opens the file.

**Mitigations.** `neutralizeFormula` prefixes `' ` for leading `= + - @` and control chars, in both CSV and XLSX. CSV fields always quoted. Control characters stripped. Covered by unit tests and the `adversarial-formula-injection` fixture.

## Server logs

**Threat.** A well-meaning `console.log(body)` ships a statement to the log drain.

**Mitigations.** Typed `logEvent` / `logFailure`. Forbidden field names. Production: no exception messages. Do not add request-body logging. Provider adapters must not log fetch bodies.

## Analytics leakage

**Threat.** Event properties or page URLs carry job ids, session ids, or amounts.

**Mitigations.** `AnalyticsEventMap` has no amount/description/bank/filename fields. Page counts and row counts are buckets. URLs are origin+path only. Referrer origin only. Flag off by default. DNT/GPC honored. Analytics host not in `/app` CSP `connect-src`.

## Malicious webhook

**Threat.** Forged Stripe events to log fake payments or DoS retries.

**Mitigations.** `constructEventAsync` with `STRIPE_WEBHOOK_SECRET`. Unsigned → 400. Unconfigured → 503 (Stripe retries). Handler errors are swallowed after logging so Stripe does not retry forever. Entitlement ignores webhook content.

## Dependency compromise

**Threat.** Malicious pdfjs, exceljs, next, stripe, or a transitive package.

**Mitigations.** Lockfile. Small dependency set. Parser vendors via `fetch`, not SDKs. Production source maps off. `poweredByHeader: false`. CSP limits where a compromised frontend package can connect. ExcelJS assets explicitly traced for `/api/export`. Apply advisories promptly; there is no claimed pentest.

## DoS / API-cost abuse

**Threat.** Script hammers `/api/parse` to burn LLM spend or function time.

**Mitigations.** Production requires durable rate limit or parse is 503. Limits: 12 parses / 10 min / hashed identity. Origin check on mutating routes. Fail closed if Upstash errors. Deterministic-first reduces provider calls. `PARSER_DETERMINISTIC_ONLY` for CI. Payload caps. Acceptable-use: one statement at a time, no bulk scripts (`terms`).

## Residual that we accept

- Customer device malware
- Stripe, Vercel, or LLM-vendor incidents
- Offsetting extraction errors that still balance
- Owner mailbox compromise (`support@` / `security@`)
- Preview routes if CSP is later weakened to load third-party tags on `/app`
