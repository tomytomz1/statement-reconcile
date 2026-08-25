# Refunds

Public policy: [https://statementreconcile.com/refund-policy](https://statementreconcile.com/refund-policy). Operator procedure below.

## Default answer

Full $19 refund within 30 days of payment, no investigation theatre. Prefer refunding a doubtful case over arguing.

Most failures never charge: scanned, encrypted, multi-account, over-limit, or `reconciliation_failed` never show the paywall.

## How to find the payment

There is no account and no email store. Ask the customer for **one** of:

- Stripe receipt number (from Stripe’s checkout email)
- Card descriptor + date + exact amount

Never accept a statement PDF, account number, or transaction list as “evidence.”

In Stripe Dashboard: search the receipt or payment. Metadata will show `result_digest`, `job_id`, page/txn counts, product version — not the statement.

## Issue the refund

Stripe Dashboard → payment → Refund (full). Money returns to the original method. Tell the customer 5–10 business days for the bank, 2 business days for our first reply.

Cannot send the refund to a different card or as store credit. There is no store credit instrument; a second conversion is a second Checkout unless you refund the first.

## Lost download

Local job TTL is 60 minutes; the entitlement window is 30 days. After the local copy expires, recovery is still possible on any device, but it needs **both** the recovery link (which carries the Checkout Session reference, offered on the download page) and the **same original PDFs**, which are re-verified to reproduce the paid pack digest. File order does not matter.

We cannot regenerate anything ourselves — no original PDF and no converted result exists on our side. If the customer has lost the link or the PDFs, refund rather than argue; there is no route back to the file.

Instruct: convert again. Refund the first charge (or refund the second if they already paid twice). They must not pay twice for the same statement.

## Double charge

Idempotency should prevent two sessions for the same digest+job. If Stripe still shows two paid sessions, refund one. Same digest in metadata is the hint.

## Chargebacks

Ask them to email support first (faster). If a dispute arrives (`charge.dispute.created` webhook → log `payment_disputed`), respond in Stripe with the Checkout Session, timestamp, and that the paywall requires a passing reconciliation. Do not upload their statement. A $19 dispute is usually cheaper to accept than to fight if evidence is thin.

## Recurring bad layouts

If several refunds share a layout class, add a **synthetic** fixture family and fix the parser or reject earlier. Do not collect real PDFs in the refund mailbox.
