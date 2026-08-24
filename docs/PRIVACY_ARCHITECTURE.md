# Privacy architecture

This document describes the **actual** V1 data path. Marketing copy and the privacy policy must match it.

## What never happens

- The original PDF file is never uploaded.
- Statement text is never written to a database, object store, disk, analytics, traces, support tools, Stripe metadata, URLs, or application logs.
- Filenames and financial values are never sent to Stripe.
- Page images are not persisted in order to fingerprint pages.

## Browser

1. The customer selects one or more PDFs. Bytes are read into RAM.
2. pdf.js extracts positioned text items (`t, x, y, w, h`, stable ids).
3. Bytes remain in RAM only so the preview can highlight source regions. They are never written to IndexedDB.
4. Bytes are zeroed when the job is discarded or the page unloads.
5. IndexedDB holds only the sealed pack envelope, the pack digest, the ten-row preview, and the summary the customer has already seen.

## Server

1. `POST /api/parse` accepts extracted text items, never PDF bytes.
2. The deterministic parser runs first. If it cannot prove a passing result, the current production path rejects without sending statement text to a provider.
3. The configured provider contract is region-only. When typed activation is completed, selective secondary extraction may send only the minimum ambiguous region — never a full-document copy — and only with the production retention/training safeguards set (`PARSER_ZERO_DATA_RETENTION`, `PARSER_DISABLE_TRAINING`).
4. Completeness, source mapping, typed ambiguity, running-balance transitions, and aggregate reconciliation all run locally. A provider cannot declare `verification_passed`.
5. Passing files are sealed as a pack. Stripe records the **pack-manifest digest**, file count, total pages, and product/schema versions.

## Privacy receipt

Each file carries a `ProcessingDisclosure`. UI and report sentences are generated from that object:

- `rawPdfLeftBrowser` is structurally `false` in V1.
- `remoteTextRegionsProcessed` / `remoteImageRegionsProcessed` increment only when those regions are actually sent.
- `providersUsed` lists configured extractors that received text.

If a sentence cannot be proven from this object, it is not shown.

## Retention

There is no application database of statements. Sealed results live in the customer’s browser for about 60 minutes. A paid Stripe session can re-download the same pack for 30 days only if that browser still holds the matching envelope.
