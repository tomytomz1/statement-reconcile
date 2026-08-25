# Data flow

What moves, what never does, and where it dies.

## What never leaves the device

The original PDF bytes. pdf.js reads them in the tab. Images, attachments, and PDF metadata are not sent.

## Convert (unpaid)

```
File (browser)
  → positioned text JSON  (POST /api/parse)
  → in-memory parse + reconcile
  → response: preview (10 rows), summary, verdict, digest, sealed envelope
  → request memory discarded
  → envelope stored in IndexedDB (encrypted at rest, 60 min TTL)
```

Parse payload caps (`src/lib/extraction/types.ts`): 50 **total** pages across the pack, 4 000 items/page, 40 000 items per file, 400 chars/item, 600 000 chars, 8 MB body.

If a parser provider is configured and deterministic parsing failed non-terminally, reconstructed line text (capped at 220 000 chars, control/bidi stripped) is sent to that vendor for that one request. The provider is instructed that the block is untrusted data. We do not log the payload. We cannot audit the vendor’s retention.

## Pay

```
Browser
  → jobId + pack digest + sealed pack envelope + pageCount  (POST /api/checkout)
  → server unseals, re-digests, re-runs the verification gate; refuses if any kept file is not verification_passed
  → Stripe Checkout Session (mode=payment, no Customer object)
       metadata: pack digest, job id, page count, file count, txn count, versions
  → browser redirects to Stripe hosted page
  → card details: Stripe only
  → success: /checkout/success?session_id=cs_…
  → GET /api/checkout/verify?session_id=…  → { paid, digest } only
  → browser matches digest to the local job
```

Stripe never receives statement text. Idempotency key: `checkout:<digest>:<jobId>`.

## Export (paid)

```
Browser
  → sessionId + digest + sealed + format csv|xlsx  (POST /api/export)
  → Stripe retrieve session (live)
  → constant-time digest compare
  → unseal → canonicalize → digest match → reconcile again
  → CSV or XLSX streamed back (no-store)
  → server retains nothing
```

Re-download, up to 30 days after `paidAt`, by either route:

- the browser still holds the sealed job (about 60 minutes), so the envelope is presented directly; or
- the customer re-uploads the **same original PDFs** with the paid session reference. The pack is re-verified and re-digested, and the digest is matched to the paid session. Since the manifest is ordered by file-level digest rather than upload order, the same statements reproduce the same pack digest regardless of the order they are chosen in.

Nothing is recoverable from the server — there is no stored statement — so a customer who has neither the local job nor the original PDFs cannot be helped by us. Refund path: [`REFUNDS.md`](REFUNDS.md).

## Webhook

```
Stripe → POST /api/stripe/webhook
  → verify stripe-signature over raw body
  → log coarse payment event (digest prefix 8 hex chars max)
  → 200 { received: true }
```

No write to a database. No entitlement change.

## Rate-limit store (production)

Upstash (or compatible) holds `srl:<route>:<hashed-identity>` → integer + TTL. No statement content.

## Analytics (optional, off by default)

First-party `fetch` to Plausible, or Vercel Analytics queue. Allowed properties are typed in `src/lib/analytics/events.ts`: buckets and enums only. Query strings and Stripe session ids are stripped from reported URLs. `/app` CSP `connect-src` does not include the analytics host.

## Hosting logs

Vercel records ordinary request metadata (IP, path, status). Application logs never include statement text, filenames, or provider bodies.

## End of life for a conversion

| Artifact            | Lifetime                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF                 | Never received                                                                                                                                   |
| Parse request body  | Function memory, one request                                                                                                                     |
| IndexedDB job       | 60 minutes, or the explicit delete control. **Not** deleted on download — the pack ships four formats and a customer may take them one at a time |
| Paid Stripe session | Stripe retention; usable for export ≤ 30 days, from the local envelope or by re-uploading the same PDFs                                          |
| Rate-limit key      | Window (600 s)                                                                                                                                   |
