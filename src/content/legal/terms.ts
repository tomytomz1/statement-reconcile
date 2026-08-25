import type { LegalDocument } from "./types";
import { publicOffer } from "@/config/commerce";

export const termsOfService: LegalDocument = {
  slug: "terms",
  title: "Terms of Service | Statement Reconcile",
  metaDescription:
    "The rules for using Statement Reconcile: one payment converts a multi-file pack of up to 50 combined pages, you own the output, and plain limits on our liability.",
  h1: "Terms of Service",
  lastUpdated: "2026-08-24",
  summary: [
    "These terms are the agreement between you and us when you use Statement Reconcile to convert a statement.",
    "They are written to be read. Where a clause has to use formal wording to do its job, a plain-English sentence follows it.",
  ],
  plainEnglish: [
    `You pay ${publicOffer.display} once, and only if your pack passes verification, and we convert one or more statements in a verified conversion pack into Excel, CSV, and verification reports. That is the whole deal.`,
    "The statement is yours and so is the output. We claim no rights over either and we keep no copy.",
    "Only convert statements you are allowed to handle, and do not try to get the files without paying.",
    "The output is a mechanical conversion of what your statement says. Check it before you rely on it. If something goes wrong, the most we owe you is what you paid.",
  ],
  sections: [
    {
      id: "agreement",
      heading: "The agreement",
      blocks: [
        {
          kind: "paragraph",
          text: "These terms are a contract between you and the operator of Statement Reconcile, the entity named as the legal business name in our site configuration. By using the site or converting a statement, you accept them. If you do not accept them, do not use the service.",
        },
        {
          kind: "paragraph",
          text: "You must be at least 18 years old and legally able to enter a contract. If you are using the service for an organisation, you confirm you are authorised to accept these terms on its behalf.",
        },
      ],
    },
    {
      id: "what-the-service-is",
      heading: "What the service is",
      blocks: [
        {
          kind: "paragraph",
          text: "Statement Reconcile converts one or more PDF bank or credit-card statements into Excel (.xlsx), CSV, a verification report PDF, and a pack manifest. Before payment, it checks document completeness, traces each accepted row to source text, and recomputes the arithmetic of the rows it extracted against the balances printed on your statement. “Verified” names those checks. It does not mean the original PDF is authentic or that the report is an audit.",
        },
        {
          kind: "bullets",
          items: [
            "One or more statements per conversion pack, up to 50 total pages combined and up to 20 MB per file.",
            "No account, no sign-up, no email, no subscription.",
            "The PDF is read in your browser and is never uploaded to us. Only the extracted text is sent for parsing.",
            "If the statement does not reconcile, the payment step never appears.",
          ],
        },
        {
          kind: "paragraph",
          text: "The service does not do optical character recognition. Scanned statements, which are images rather than text, are refused. Password-protected PDFs must be unlocked in a PDF reader before conversion. Documents containing more than one account are refused, because a single set of balances cannot verify them.",
        },
      ],
    },
    {
      id: "your-data-and-the-output",
      heading: "Your data and the output belong to you",
      blocks: [
        {
          kind: "paragraph",
          text: "Your statement is yours. The converted Excel workbook and CSV file are yours. We claim no ownership of either and no licence over your financial data beyond what is needed to run the conversion you asked for during that request.",
        },
        {
          kind: "bullets",
          items: [
            "You may use, copy, edit, publish, or resell the output as you see fit. There is no restriction on what you do with your own transaction data.",
            "We do not use your statement, your transactions, or your output to train models, to build datasets, or for any purpose other than producing your files.",
            "We keep no copy. There is no database, no object storage, and no file written on our side.",
          ],
        },
        {
          kind: "paragraph",
          text: "The site itself — the software, the layout, and the wording of these pages — remains ours. Nothing here gives you a licence to copy the service.",
        },
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      blocks: [
        {
          kind: "paragraph",
          text: "The rules are short and they exist because this service handles other people's money records.",
        },
        {
          kind: "bullets",
          items: [
            "Only convert statements you own or are otherwise entitled to process. Do not upload someone else's statement without their authority.",
            "Do not attempt to circumvent, disable, or work around the payment step, or to obtain a file you have not paid for.",
            "Do not use the service through scripts, scrapers, or any automated bulk process. It is built for one human-initiated conversion pack at a time.",
            "Do not probe, scan, or stress-test the service, attempt to access parts of it that are not public, or interfere with its availability for anyone else. Good-faith security research is covered separately by our security page.",
            "Do not use the service to break the law, to launder money, or to fabricate or alter a financial record.",
            "Do not resell access to the service or present it as your own product.",
          ],
        },
        {
          kind: "paragraph",
          text: "We may apply rate limits and other technical controls to enforce these rules. Because we hold no account for you, enforcement is limited to blocking requests rather than closing an account.",
        },
      ],
    },
    {
      id: "payment",
      heading: "One payment covers one conversion pack",
      blocks: [
        {
          kind: "paragraph",
          text: `The price is ${publicOffer.display} and is stated before you choose a file. It is charged once, and only if the pack passes verification, for one conversion pack containing one or more statements and up to 50 total pages combined. There is no subscription or recurring charge. Excel, CSV, the verification report, and the pack manifest are included.`,
        },
        {
          kind: "paragraph",
          text: "Payment is taken through Stripe Checkout. You enter your card details on Stripe's hosted page; they never touch our servers or our code. Prices are in US dollars and exclude any taxes your jurisdiction may add, which Stripe will show you before you confirm.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "Each file is extracted and verified independently. Files that pass may be kept together in the same paid pack, provided the combined pack stays within 50 pages.",
        },
      ],
    },
    {
      id: "re-download-window",
      heading: "The 30-day re-download window",
      blocks: [
        {
          kind: "paragraph",
          text: "A paid session can be used to download the same statement again for up to 30 days, either from the browser you paid from while the encrypted result is still there, or by opening your recovery link and supplying the same original PDFs so they can be re-verified.",
        },
        {
          kind: "callout",
          tone: "caution",
          text: "The converted result exists only in your browser, encrypted, and expires there after 60 minutes. If it is gone, you can re-upload the exact same files; the service re-verifies them and restores the download only when the resulting pack digest matches the paid Stripe session.",
        },
        {
          kind: "paragraph",
          text: "A matching re-upload does not require a second payment. If digest recovery cannot succeed, ask {{supportEmail}} for a refund or re-issue.",
        },
      ],
    },
    {
      id: "refunds",
      heading: "Refunds",
      blocks: [
        {
          kind: "paragraph",
          text: "Because the payment step does not appear unless the statement reconciles, the common failure case costs you nothing rather than needing a refund. Where you have paid and the delivered file is wrong, incomplete, or you could not download it, you get a full refund on request, no questions asked, within 30 days.",
        },
        {
          kind: "paragraph",
          text: "The full details, including what to include in a request because we cannot look up a purchase by name or email, are on the refund policy page.",
        },
      ],
    },
    {
      id: "no-warranty",
      heading: "No warranty",
      blocks: [
        {
          kind: "paragraph",
          text: "The service is provided on an as-is and as-available basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including implied warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the service will be uninterrupted, error-free, or able to read every statement layout.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "In plain English: we have built this carefully and the reconciliation check exists precisely so you can see whether it worked, but we cannot promise the service is always available or that it will handle every document you give it.",
        },
        {
          kind: "paragraph",
          text: "Some jurisdictions do not allow certain warranties to be excluded. Where that is the case, this section applies only as far as the law permits, and your statutory rights as a consumer are unaffected.",
        },
      ],
    },
    {
      id: "limitation-of-liability",
      heading: "Limitation of liability",
      blocks: [
        {
          kind: "paragraph",
          text: "To the fullest extent permitted by law, our total aggregate liability arising out of or relating to the service or these terms is limited to the amount you actually paid us for the conversion giving rise to the claim. We are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, goodwill, or business opportunity, whether the claim is in contract, tort, or otherwise, even if we were advised such loss was possible.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "In plain English: if something goes wrong, the most we will pay you is the amount you paid us. We are not responsible for what happens downstream of a spreadsheet — a filing based on it, a decision made from it, or time spent fixing it.",
        },
        {
          kind: "paragraph",
          text: "Nothing in these terms limits liability that cannot lawfully be limited, including liability for fraud, for fraudulent misrepresentation, or for death or personal injury caused by negligence. Some jurisdictions do not allow the exclusion of certain damages; in those places, this section applies only as far as the law permits.",
        },
      ],
    },
    {
      id: "not-advice",
      heading: "Not accounting, tax, legal, or financial advice",
      blocks: [
        {
          kind: "paragraph",
          text: "The output is a mechanical conversion of what your statement says. It is not accounting advice, tax advice, legal advice, or financial advice, and we are not acting as your accountant, bookkeeper, auditor, or adviser.",
        },
        {
          kind: "paragraph",
          text: "The reconciliation check confirms one narrow thing: that the rows extracted add up to the balances printed on the statement. It says nothing about whether the statement itself is correct, whether a transaction is classified properly, or whether the figures are right for your tax return or your accounts.",
        },
      ],
    },
    {
      id: "review-the-output",
      heading: "You must review the output before relying on it",
      blocks: [
        {
          kind: "paragraph",
          text: "You remain responsible for checking the converted file before you use it for anything that matters. Open it, compare it against the original PDF, and confirm the period, the transaction count, and the balances match.",
        },
        {
          kind: "bullets",
          items: [
            "Check that the number of rows matches the number of transactions on your statement.",
            "Check the opening and closing balances against the printed statement.",
            "Check the date interpretation, especially where a statement prints dates as day/month or month/day without a year.",
            "Check any row where the description wrapped across lines on the original page.",
          ],
        },
        {
          kind: "callout",
          tone: "caution",
          text: "If you spot something wrong, tell us and take the refund. Do not file, submit, or reconcile from a file you have not looked at.",
        },
      ],
    },
    {
      id: "third-party-names",
      heading: "Third-party names",
      blocks: [
        {
          kind: "paragraph",
          text: "Bank, card issuer, software, and service names used on this site are used descriptively, to say which documents the converter can read and which tools the output fits. They are the trademarks of their respective owners.",
        },
        {
          kind: "paragraph",
          text: "We are not affiliated with, endorsed by, sponsored by, or connected to any bank, card issuer, or accounting software vendor named anywhere on this site.",
        },
      ],
    },
    {
      id: "availability",
      heading: "Availability and changes to the service",
      blocks: [
        {
          kind: "paragraph",
          text: "We may change, suspend, or discontinue any part of the service, including support for a particular statement layout or an output format. We do not offer a service-level agreement and we do not guarantee uptime.",
        },
        {
          kind: "paragraph",
          text: "If the service is unavailable when you try to use it, you have not paid anything, because payment comes after a successful conversion. If it becomes unavailable after you have paid but before you could download, that is a refund case.",
        },
      ],
    },
    {
      id: "termination",
      heading: "Termination",
      blocks: [
        {
          kind: "paragraph",
          text: "You can stop using the service at any time; there is no account to close and nothing to cancel. Clearing your browser data removes the only copy of any result we produced for you.",
        },
        {
          kind: "paragraph",
          text: "We may block access to the service for anyone who breaks the acceptable use rules, or where we are required to by law. Sections that by their nature should survive — ownership of the output, no warranty, limitation of liability, and governing law — continue to apply after you stop using the service.",
        },
      ],
    },
    {
      id: "changes-to-these-terms",
      heading: "Changes to these terms",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update these terms. The version published on this page at the time of your conversion is the version that applies to that conversion. The date at the top of the page shows when it last changed.",
        },
        {
          kind: "paragraph",
          text: "Since we hold no email addresses, we cannot notify you of changes directly. If a change is material, we will note it plainly on this page rather than folding it silently into a rewrite.",
        },
      ],
    },
    {
      id: "governing-law",
      heading: "Governing law and venue",
      blocks: [
        {
          kind: "paragraph",
          text: "These terms are governed by the laws of [[JURISDICTION]], without regard to conflict-of-law rules. Any dispute arising out of or relating to these terms or the service will be brought in the courts of [[JURISDICTION]], and both parties submit to the jurisdiction of those courts.",
        },
        {
          kind: "paragraph",
          text: "If you are a consumer, this does not deprive you of the protection of mandatory rules of the law of your own country of residence, including the right to bring a claim there where local law gives you that right.",
        },
        {
          kind: "paragraph",
          text: "If any part of these terms is found unenforceable, the rest continues to apply.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [
        {
          kind: "paragraph",
          text: "Questions about these terms: {{supportEmail}}. Privacy questions: {{privacyEmail}}. Security reports: {{securityEmail}}. We aim to respond first within 2 business days.",
        },
      ],
    },
  ],
};
