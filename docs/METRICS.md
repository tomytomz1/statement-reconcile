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

| Event                   | When                       | Properties                                                                                       |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `page_view`             | Marketing page load        | `path`                                                                                           |
| `campaign_landed`       | First touch with UTM       | `source`, `medium`, `campaign`, `landingPath`                                                    |
| `file_selected`         | PDF chosen                 | `pages` (bucket), `sizeMb`                                                                       |
| `file_rejected`         | Client reject              | `code`                                                                                           |
| `extraction_started`    | Parse kicked off           | `pages`                                                                                          |
| `extraction_succeeded`  | Reconciled parse           | `pages`, `rows`, `statementType`, `method`, `duration`, `source` (`deterministic` \| `provider`) |
| `extraction_failed`     | Rejected or error          | `code`, `pages`, `duration`                                                                      |
| `reconciliation_passed` | Engine passed              | `method`, `rows`                                                                                 |
| `reconciliation_failed` | Engine failed              | `method`, `rows`                                                                                 |
| `preview_viewed`        | Verdict UI                 | `rows`, `statementType`                                                                          |
| `checkout_clicked`      | Pay CTA                    | `rows`, `statementType`                                                                          |
| `checkout_redirected`   | Stripe URL received        | (none)                                                                                           |
| `checkout_failed`       | Checkout API error         | `code`                                                                                           |
| `payment_confirmed`     | Success page + paid digest | (none)                                                                                           |
| `export_requested`      | Download click             | `format` (`csv` \| `xlsx`)                                                                       |
| `export_downloaded`     | File returned              | `format`, `rows`                                                                                 |
| `export_failed`         | Export error               | `format`, `code`                                                                                 |
| `recovery_used`         | Lost-tab / session match   | `outcome` (`found` \| `not_found`)                                                               |
| `data_deleted`          | Delete-my-data             | (none)                                                                                           |
| `cta_clicked`           | Marketing CTA              | `location`, `label`                                                                              |
| `faq_opened`            | FAQ accordion              | `question`                                                                                       |

Page buckets: `1`, `2-5`, `6-10`, `11-20`, `21-50`. Row buckets: `0`, `1-25`, `26-100`, `101-300`, `301-1000`, `1000+`. Duration: `<1s`, `1-3s`, `3-10s`, `10-30s`, `>30s`. Statement type: `checking` \| `savings` \| `credit_card` \| `unknown`.

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

Server logs (`checkout_started`, `export_delivered`, `payment_completed`) are the backstop when analytics is off. Stripe Dashboard cash is authoritative for money; analytics is directional.

## Attribution

`src/lib/analytics/attribution.ts` stores first-touch UTM + landing path in `sessionStorage` (not a cookie). Use `landingPath` to see whether an SEO slug earns previews and purchases. First touch wins.

## Hygiene

Analytics is off unless `NEXT_PUBLIC_ENABLE_ANALYTICS` and a provider are set. DNT/GPC → no events. No vendor script on `/app`.
