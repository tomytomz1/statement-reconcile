import type { LegalDocument } from "./types";

export const refundPolicy: LegalDocument = {
  slug: "refund-policy",
  title: "Refund Policy | Statement Reconcile",
  metaDescription:
    "The paywall never appears unless your statement reconciles, so most failures cost nothing. If you did pay and the file is wrong, ask within 30 days for a refund.",
  h1: "Refund Policy",
  lastUpdated: "2026-08-24",
  summary: [
    "The best refund is the charge that never happens, so the payment step is only shown after the statement has been checked and balanced.",
    "Where you have paid and the result is not what you needed, a full refund is available for 30 days, no questions asked.",
  ],
  plainEnglish: [
    "If the converter cannot make your statement balance, you are never asked to pay. There is nothing to refund because there was no charge.",
    "If you did pay and the file is wrong, incomplete, or you could not download it, email us within 30 days and we refund it in full.",
    "We cannot look up a purchase by your name or email, because we do not have either. Send the Stripe receipt number or the payment reference from your card statement.",
    "Refunds go back to the card you paid with and usually show up in 5 to 10 business days.",
  ],
  sections: [
    {
      id: "most-failures-cost-nothing",
      heading: "Most failures cost nothing, because the paywall never appears",
      blocks: [
        {
          kind: "callout",
          tone: "verified",
          text: "If the extracted transactions do not add up to the balances printed on your statement, the payment step is not shown at all. You cannot be charged for a conversion that did not verify.",
        },
        {
          kind: "paragraph",
          text: "This is the single most important thing on this page. The usual complaint about statement converters is paying first and finding out afterwards that rows were dropped or amounts misread. Here the arithmetic is checked before money is mentioned. The common it-did-not-work case ends in no charge rather than in a refund request.",
        },
        {
          kind: "paragraph",
          text: "The same applies to statements we refuse outright: scanned documents with no text layer, password-protected files that have not been unlocked, files over 50 pages or 20 MB, and documents that bundle several accounts together. Those are all rejected before payment.",
        },
      ],
    },
    {
      id: "the-30-day-refund",
      heading: "The 30-day, no-questions refund",
      blocks: [
        {
          kind: "paragraph",
          text: "If you paid and the outcome was not right, you get the full one-time payment back. Ask within 30 days of the payment and we do not interrogate you about it.",
        },
        {
          kind: "paragraph",
          text: "Reasons that qualify include, and are not limited to:",
        },
        {
          kind: "bullets",
          items: [
            "The delivered file is wrong — rows missing, amounts misread, dates interpreted the wrong way round, or columns swapped.",
            "The delivered file is incomplete — part of the statement period is not there.",
            "You could not download the file, or the download failed and the result was no longer available in your browser.",
            "The file will not open, or the Excel workbook or CSV is unusable in the software you needed it for.",
            "You paid twice for the same statement by accident.",
            "You simply are not happy with what you got.",
          ],
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "You do not have to prove any of this. We would rather refund a doubtful case than argue about the charge.",
        },
      ],
    },
    {
      id: "what-to-include",
      heading: "What to include when you ask",
      blocks: [
        {
          kind: "paragraph",
          text: "There is one practical complication, and it comes directly from how the product is built. We store nothing and there is no account, so we have no record with your name or email attached. We cannot find your purchase from either.",
        },
        {
          kind: "paragraph",
          text: "Send one of these to {{supportEmail}} and we can locate the payment:",
        },
        {
          kind: "bullets",
          items: [
            "The Stripe receipt number, from the receipt Stripe emailed you at the address you gave during checkout. This is the fastest route.",
            "Or the payment reference from your card or bank statement — the descriptor line for the charge, together with the date and the exact amount.",
          ],
        },
        {
          kind: "callout",
          tone: "caution",
          text: "Never attach your statement PDF, an account number, or any transaction data to the email. We do not need it to issue a refund and we do not want to receive it.",
        },
        {
          kind: "paragraph",
          text: "If it helps us fix the underlying problem, you are welcome to describe what went wrong in general terms — for example that the descriptions wrapped onto extra rows, or that dates came out in the wrong order. A description is useful. The document itself is not.",
        },
      ],
    },
    {
      id: "timelines",
      heading: "How long it takes",
      blocks: [
        {
          kind: "bullets",
          items: [
            "We aim to reply to a refund request within 2 business days.",
            "Once we approve it, the refund is issued through Stripe to the original payment method. We cannot send it anywhere else.",
            "Stripe and your bank then take their own time. Refunds typically appear on the original card within 5 to 10 business days.",
            "If it has been longer than that, the delay is on the banking side. Contact us anyway and we will send you the Stripe refund confirmation so you can take it to your bank.",
          ],
        },
      ],
    },
    {
      id: "lost-download",
      heading: "If you paid and lost the download",
      blocks: [
        {
          kind: "paragraph",
          text: "A paid session can re-download the same statement for up to 30 days. For the first 60 minutes the encrypted result is still in the browser you paid from and the download is immediate. After that, recovery needs your recovery link — which carries the payment reference — together with the same original PDFs, which are re-verified to confirm they are what you paid for. We hold no copy of either, so if both are gone, ask us for a refund or re-issue instead.",
        },
        {
          kind: "paragraph",
          text: "If you cleared your browser data, closed a private window, moved to another device, or let the hour pass, the result is genuinely gone. We cannot send you a copy, because we never had one — nothing is stored on our side at any point.",
        },
        {
          kind: "callout",
          tone: "verified",
          text: "In that situation you are not stuck with a wasted payment. Convert the statement again and we will refund the first charge or issue a credit for the second. You will not pay twice for the same statement.",
        },
      ],
    },
    {
      id: "no-dispute-process",
      heading: "There is no dispute process, on purpose",
      blocks: [
        {
          kind: "paragraph",
          text: "Some services make you file a ticket, justify the request, and wait for a decision. There is nothing like that here. The refund is not a concession we grant after reviewing evidence; it is the default answer.",
        },
        {
          kind: "paragraph",
          text: "This is affordable to us because the reconciliation check filters out most bad conversions before payment. A converter that charges first has to defend its refunds. One that checks first does not.",
        },
        {
          kind: "paragraph",
          text: "If you would rather raise a chargeback with your bank than email us, that is your right. We would ask you to try {{supportEmail}} first, because we will almost certainly refund you faster than a chargeback resolves.",
        },
      ],
    },
    {
      id: "contact",
      heading: "How to ask for a refund",
      blocks: [
        {
          kind: "paragraph",
          text: "Email {{supportEmail}} with your Stripe receipt number or the payment reference from your card statement, and say you would like a refund. That is all that is required. We aim to respond first within 2 business days.",
        },
      ],
    },
  ],
};
