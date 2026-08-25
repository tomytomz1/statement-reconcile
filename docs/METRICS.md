# Metrics

Internal funnel health. Not marketing claims. Do not publish conversion rates.

North star: **successful reconciled previews → paid purchases**.

A “successful reconciled preview” is `extraction_succeeded` (or `reconciliation_passed` / `preview_viewed` with a passing method) after parse returned `status: "reconciled"`. A paid purchase is `payment_confirmed` (client) aligned with Stripe `checkout.session.completed` / log `payment_completed`.

## Conversion rate (previews → paid)

| Rate | Reading                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------- |
| 1–2% | Investigate: paywall copy, Stripe errors, envelope/IndexedDB failures, price shock, preview distrust |
| 3–5% | Promising; keep measuring by landing path                                                            |
| 5%+  | Strong for this offer; still not a public boast                                                      |

Ignore vanity unique-visitors. A scanner hitting `/` is not a preview.

## Event names

Source: `src/lib/analytics/events.ts`. Payloads are buckets/enums only — no amounts, descriptions, bank names, filenames, account ids.

| Event                   | When                                     | Properties                                                                                       |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `page_view`             | Marketing page load                      | `path`                                                                                           |
| `campaign_landed`       | First touch with UTM                     | `source`, `medium`, `campaign`, `landingPath`                                                    |
| `file_selected`         | PDF chosen                               | `pages` (bucket), `size` (bucket)                                                                |
| `file_rejected`         | Client reject                            | `code`                                                                                           |
| `extraction_started`    | Parse kicked off                         | `pages`                                                                                          |
| `extraction_succeeded`  | Reconciled parse                         | `pages`, `rows`, `statementType`, `method`, `duration`, `source` (`deterministic` \| `provider`) |
| `extraction_failed`     | Rejected or error                        | `code`, `pages`, `duration`                                                                      |
| `reconciliation_passed` | Engine passed                            | `method`, `rows`                                                                                 |
| `reconciliation_failed` | Engine failed                            | `method`, `rows`                                                                                 |
| `preview_viewed`        | Verdict UI                               | `rows`, `statementType`                                                                          |
| `checkout_clicked`      | Pay CTA                                  | `rows`, `statementType`                                                                          |
| `checkout_redirected`   | Stripe URL received                      | (none)                                                                                           |
| `checkout_failed`       | Checkout API error                       | `code`                                                                                           |
| `payment_confirmed`     | Success page + paid digest               | (none)                                                                                           |
| `export_requested`      | Download click                           | `format` (`csv` \| `xlsx`)                                                                       |
| `export_downloaded`     | File returned                            | `format`, `rows`                                                                                 |
| `export_failed`         | Export error                             | `format`, `code`                                                                                 |
| `recovery_used`         | Lost-tab / session match                 | `outcome` (`found` \| `not_found`)                                                               |
| `data_deleted`          | Delete-my-data                           | (none)                                                                                           |
| `cta_clicked`           | Marketing CTA or homepage file selection | `location`, `label`                                                                              |
| `faq_opened`            | FAQ accordion                            | `question`                                                                                       |
| `copy_variant_viewed`   | Homepage H1 variant rendered             | `copyVariant` (`a` \| `b` \| `c`)                                                                |

Every event above except `copy_variant_viewed` also carries an optional `copyVariant` (`a` \| `b` \| `c`), attached from `sessionStorage` when it is available, so the funnel can be split by headline. Only the identifier is ever sent — never the headline text.

Page buckets: `1`, `2-5`, `6-10`, `11-20`, `21-50`. File-size buckets: `<1mb`, `1-5mb`, `5-10mb`, `10-20mb`, `20mb+`. Row buckets: `0`, `1-25`, `26-100`, `101-300`, `301-1000`, `1000+`. Duration: `<1s`, `1-3s`, `3-10s`, `10-30s`, `>30s`. Statement type: `checking` \| `savings` \| `credit_card` \| `unknown`.

## Funnel math

```
file_selected
  → extraction_started
  → extraction_succeeded     }  reconciled preview
  → preview_viewed
  → checkout_clicked
  → checkout_redirected
  → payment_confirmed        }  paid purchase
  → export_downloaded
```

Drop-offs to watch:

- `file_rejected` / `extraction_failed` with `no_text_layer` — scanned PDFs (expected; do not charge)
- `checkout_failed` / Stripe 503 — config
- `payment_confirmed` without `export_downloaded` — IndexedDB TTL, private window, blocked download
- `recovery_used` `not_found` — expected after 60 minutes

The homepage picker records `cta_clicked` with the fixed values
`location=home_hero_upload` and `label=Choose My PDF Statements` before the in-memory handoff to
`/app`. It never records a filename, institution, balance, description, account identifier, or
transaction value.

Server logs (`checkout_started`, `export_delivered`, `payment_completed`) are the backstop when analytics is off. Stripe Dashboard cash is authoritative for money; analytics is directional.

## Headline experiment (A/B/C)

Authority: master build prompt §42.2 and §42.4.

Three approved H1s are assigned from the existing anonymous `sr_sid` cookie at approximately
34/33/33 by `src/lib/analytics/copy-variant.ts`. Assignment is a pure hash of the session id, so it
is deterministic and stable for the session, and it is resolved server-side in `src/proxy.ts` so the
headline never visibly swaps. No second cookie is created.

| Variant | H1                                                                                        |
| ------- | ----------------------------------------------------------------------------------------- |
| A       | Convert Bank Statements to Excel & CSV—Then Make the Spreadsheet Prove It Matches the PDF |
| B       | The Spreadsheet Looks Clean. But Did the Converter Miss a Row?                            |
| C       | Stop Retyping Bank Statements—and Stop Checking a Converter’s Work by Hand                |

`?copy_variant=a|b|c` overrides the assignment **only** when `VERCEL_ENV === "preview"`. Production
and development ignore the parameter entirely, and an invalid value falls back to the session's
normal assignment. Do not put the variant in a production URL.

**Primary metric: verified preview → payment**, measured per variant. Supporting copy is identical
across variants, so the H1 is the only difference.

Guardrail metrics — a headline that wins on payments while damaging any of these has not won:
homepage file selection (`cta_clicked`), extraction start, extraction rejection, checkout errors,
and successful downloads.

**Stopping rule: do not declare a winner before 200 qualified verified previews overall and at
least 50 per variant.** Below that, report the observed split _and the uncertainty around it_. Do
not manufacture statistical confidence, and do not pick a winner on taste or on a small sample.
Preserve all three variants until the threshold is reached.

### Where the numbers actually come from

The conversion half of the funnel **cannot be measured client-side, by design**. `/app` and
`/checkout` are processing paths, and `contentSecurityPolicy()` in `src/lib/security/headers.ts`
gives them `connect-src 'self'` with no analytics origin, so a page holding a statement cannot
reach a vendor at all. Do not widen that policy to close the measurement gap.

So the experiment is read from two sources, and neither one alone is enough:

| Half of the funnel                                                | Source                                 |
| ----------------------------------------------------------------- | -------------------------------------- |
| Exposure and top of funnel — `copy_variant_viewed`, `cta_clicked` | Client analytics on marketing pages    |
| Verified preview → payment                                        | Server logs stamped with `copyVariant` |

`copyVariantFromHeaders()` reads the variant from the `x-sr-copy-variant` header that
`src/proxy.ts` already sets, and stamps it onto `pack_assembled`, `checkout_started`, and
`export_delivered`. One character from a closed set; nothing customer- or statement-derived. An
absent or unrecognised header logs no variant rather than guessing, so unattributed requests are
visibly unattributed instead of being miscounted.

`payment_completed` is deliberately **not** stamped: it comes from a Stripe webhook, which carries
no session cookie, so any variant there would be assigned from a session id invented for that
request. Attribute paid conversions through `export_delivered` instead.

Read the funnel as `pack_assembled` → `checkout_started` → `export_delivered`, grouped by
`copyVariant`.

## Attribution

`src/lib/analytics/attribution.ts` stores first-touch UTM + landing path in `sessionStorage` (not a cookie). Use `landingPath` to see whether an SEO slug earns previews and purchases. First touch wins.

## Hygiene

Analytics is off unless `NEXT_PUBLIC_ENABLE_ANALYTICS` and a provider are set. DNT/GPC → no events. No vendor script on `/app`.

Two provider notes worth knowing before switching one on:

- **`plausible`** posts to the vendor's `/api/event` from first-party code, so no third-party
  script is loaded. `NEXT_PUBLIC_ANALYTICS_HOST` must be set explicitly even though the client
  defaults to `https://plausible.io` — `src/proxy.ts` only adds an origin to `connect-src` when
  that variable is present, so leaving it empty means the CSP blocks the request on every page.
- **`vercel`** requires `@vercel/analytics`, which is **not currently a dependency**. `sendVercel()`
  calls `window.va`, and nothing defines that global today, so selecting this provider silently
  records nothing until the package is installed and wired into the marketing layout only.
