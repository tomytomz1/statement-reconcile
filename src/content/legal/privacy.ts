import type { LegalDocument } from "./types";

export const privacyPolicy: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy | Statement Reconcile",
  metaDescription:
    "Your PDF is read in your browser and never uploaded. We keep no account, no database, and no copy of your statement. Here is exactly what happens to your data.",
  h1: "Privacy Policy",
  lastUpdated: "2026-08-24",
  summary: [
    "This policy explains what happens to a bank or credit-card statement when you convert it, what we hold, and what we never hold.",
    "It describes the product as it is built today, not an intention. Where we say we store nothing, we mean there is no database, no file storage, and no account to store anything against.",
  ],
  plainEnglish: [
    "Your PDF file never leaves your computer. Your browser reads it and sends us only the text it found inside.",
    "We use that text to build your transaction table, then the response is sent and the text is gone. We do not write it anywhere.",
    "The finished result is held in your own browser, encrypted, and deletes itself after 60 minutes. You can delete it sooner with one click.",
    "There is no sign-up, so we have no name, no email, and no password for you. Stripe handles the payment and we never see your card.",
  ],
  sections: [
    {
      id: "who-we-are",
      heading: "Who we are",
      blocks: [
        {
          kind: "paragraph",
          text: "Statement Reconcile is a single-purpose tool that converts one or more PDF bank or credit-card statements into Excel, CSV, and verification reports for a one-time payment of $19, up to 50 total pages. The operator of the service is the entity named as the legal business name in our site configuration. There is no account system, no subscription, and no mailing list.",
        },
        {
          kind: "paragraph",
          text: "If you have a question about this policy, write to {{privacyEmail}}. We aim to reply within 2 business days.",
        },
      ],
    },
    {
      id: "what-this-policy-covers",
      heading: "What this policy covers",
      blocks: [
        {
          kind: "paragraph",
          text: "This policy covers the public website and the conversion tool. It does not cover the websites of other companies you may reach from here, including Stripe's hosted payment page, which is governed by Stripe's own privacy policy.",
        },
      ],
    },
    {
      id: "how-a-conversion-works",
      heading: "How a conversion works, step by step",
      blocks: [
        {
          kind: "paragraph",
          text: "The privacy properties of this service come from how it is built, so the sequence matters. This is the whole of it.",
        },
        {
          kind: "numbered",
          items: [
            "You choose a PDF statement. The file is opened and read entirely inside your browser using pdf.js. The PDF file itself is never uploaded to our servers.",
            "Your browser extracts the positioned text runs from the document — for each item, the text string and its x position, y position, width, and height — and sends only that JSON to our parsing endpoint.",
            "Our server parses that text deterministically into a transaction table, runs the reconciliation engine over it, and returns four things: a 10-row preview, a summary (statement period, currency, opening and closing balances, totals, and transaction count), the reconciliation verdict, and a sealed envelope containing the full result.",
            "The server stores nothing. There is no database, no object storage, and no file is written. The statement text exists only in the memory of that single request and goes out of scope when the response is sent.",
            "The sealed envelope is held in your own browser in IndexedDB, encrypted at rest with a non-extractable per-device AES-256-GCM key. It self-deletes after 60 minutes, and a delete-my-data control clears it immediately.",
            "If you choose to pay, your browser sends the sealed envelope back together with the Stripe Checkout Session id. Our server verifies with Stripe that the session is paid, checks with a constant-time comparison that the digest Stripe recorded matches the data presented, re-runs reconciliation, generates your files, and returns them. Again, nothing is stored.",
          ],
        },
        {
          kind: "callout",
          tone: "verified",
          text: "At no point in that sequence is your PDF uploaded, and at no point is your statement written to disk on our side.",
        },
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      blocks: [
        {
          kind: "paragraph",
          text: "We collect the minimum needed to convert your statement and take a payment. In practice that is three things.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Extracted statement text",
              definition:
                "The positioned text runs your browser pulled out of the PDF, sent to our parsing endpoint. This is processed in memory to produce your table and is not retained after the response is sent.",
            },
            {
              term: "Technical request data",
              definition:
                "Ordinary web request information handled by our hosting provider, such as an IP address and a user agent, and a hashed client identifier used only to count requests for rate limiting.",
            },
            {
              term: "Payment records held by Stripe",
              definition:
                "If you pay, Stripe records the transaction, including the card details you entered on Stripe's own page and whatever billing information Stripe requires. We can see the resulting payment record in Stripe; we never see your card number.",
            },
          ],
        },
      ],
    },
    {
      id: "what-we-do-not-collect",
      heading: "What we deliberately do not collect",
      blocks: [
        {
          kind: "paragraph",
          text: "These are not oversights. Each one is a decision that removes a category of risk rather than managing it.",
        },
        {
          kind: "bullets",
          items: [
            "No account, no username, and no password — there is nothing to sign up for.",
            "No email address. We do not ask for one, and there is no mailing list.",
            "No copy of your PDF. The file is never uploaded, so we could not keep it even if we wanted to.",
            "No stored copy of your statement text, your transactions, your balances, or your converted output.",
            "No filename. The name of your file stays in your browser.",
            "No bank name, account number, sort code, or card number is extracted for our own use or sent to any third party.",
            "No advertising identifiers, no cross-site tracking, and no data sold or shared with data brokers.",
          ],
        },
      ],
    },
    {
      id: "the-pdf-never-leaves-your-device",
      heading: "Your PDF never leaves your device",
      blocks: [
        {
          kind: "paragraph",
          text: "Most converters ask you to upload the file. We do not, because an uploaded file has to be received, held somewhere while it is processed, and then deleted — and every one of those steps is a place where something can go wrong.",
        },
        {
          kind: "paragraph",
          text: "Instead your browser opens the PDF locally with pdf.js and extracts the text layer. Only the extracted text and its coordinates are sent for parsing. Images, embedded attachments, and document metadata inside the PDF are not sent. The file stays on your device for as long as the page is open and is not copied anywhere by us.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "The extracted text does contain the words and numbers printed on your statement, because that is what has to be parsed. It is processed in memory and is not stored.",
        },
      ],
    },
    {
      id: "the-sealed-result",
      heading: "The sealed result held in your browser",
      blocks: [
        {
          kind: "paragraph",
          text: "After parsing, the full converted result is returned to you inside a sealed envelope. Your browser stores that envelope in IndexedDB, encrypted at rest using an AES-256-GCM key that is generated on your device and marked non-extractable, which means the key cannot be read out of the browser by page scripts.",
        },
        {
          kind: "bullets",
          items: [
            "The envelope lives only in the browser profile that created it. It is not synced to us and not shared between devices.",
            "It self-deletes 60 minutes after it is created.",
            "The delete-my-data control on the page clears it immediately, before that hour is up.",
            "Clearing your browser storage, using private browsing and closing the window, or switching to a different browser or device all have the same effect: the result is gone.",
          ],
        },
        {
          kind: "callout",
          tone: "caution",
          text: "Because the result lives only in your browser, we cannot recover it for you. If you clear your browser data before downloading, the statement has to be converted again — and in that case we refund or re-issue rather than charging you twice.",
        },
      ],
    },
    {
      id: "payments",
      heading: "Payments and what Stripe receives",
      blocks: [
        {
          kind: "paragraph",
          text: "Payments are handled by Stripe Checkout. You enter your card details on Stripe's own hosted page. Those details never touch our servers or our code. We do not create a Stripe Customer object for you.",
        },
        {
          kind: "paragraph",
          text: "The only metadata we attach to a Checkout Session is the following, and nothing else.",
        },
        {
          kind: "bullets",
          items: [
            "A SHA-256 digest of the converted result. This is a one-way hash used to prove that the file we later generate matches what you paid for. It is not the data and cannot be turned back into the data.",
            "An opaque job id that means nothing outside the session.",
            "The page count of the statement.",
            "The transaction count.",
            "The product version and the schema version.",
          ],
        },
        {
          kind: "callout",
          tone: "verified",
          text: "No balance, no bank name, no account number, no transaction description, no date from your statement, and no filename is ever sent to Stripe or to anyone else.",
        },
      ],
    },
    {
      id: "logging",
      heading: "What appears in our logs",
      blocks: [
        {
          kind: "paragraph",
          text: "Application logging is structured and restricted by design. A log line can contain an event name, a coarse count, an enum value, a boolean, and an error code. That is the whole vocabulary.",
        },
        {
          kind: "bullets",
          items: [
            "Statement text, transaction descriptions, amounts, and balances are never logged.",
            "Filenames are never logged.",
            "Payloads sent to or received from providers are never logged.",
            "Error messages from exceptions are not logged either — only the exception's constructor name — because an exception message can quote the value that caused it.",
          ],
        },
        {
          kind: "paragraph",
          text: "Separately, our hosting provider records ordinary request logs for the site, which include technical details such as IP address, timestamp, and the path requested. Those logs contain no statement content.",
        },
      ],
    },
    {
      id: "retention",
      heading: "How long anything is kept",
      blocks: [
        {
          kind: "definitions",
          items: [
            {
              term: "Your PDF",
              definition: "Never received by us, so never retained.",
            },
            {
              term: "Extracted statement text",
              definition:
                "Held in memory for the duration of a single request and discarded when the response is sent. Not written to any database, object store, or file.",
            },
            {
              term: "The converted result",
              definition:
                "Held only in your browser, encrypted, and deleted automatically 60 minutes after it is created, or immediately if you use the delete control.",
            },
            {
              term: "Payment records",
              definition:
                "Held by Stripe under Stripe's own retention rules, which they apply to meet financial and anti-fraud obligations. We can see the payment record but cannot shorten Stripe's retention of it.",
            },
            {
              term: "Application and request logs",
              definition:
                "Retained by our hosting provider, Vercel, under their platform retention settings. These logs contain no statement content.",
            },
            {
              term: "Rate-limit counters",
              definition:
                "If rate limiting is enabled on a deployment, a hashed client identifier and a request count are held briefly and expire on their own. No statement content is involved.",
            },
          ],
        },
      ],
    },
    {
      id: "sub-processors",
      heading: "Sub-processors",
      blocks: [
        {
          kind: "paragraph",
          text: "This is the complete list of third parties that can process data on our behalf, and exactly what each one receives.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Vercel",
              definition:
                "Hosting and application logs. Receives ordinary web request data such as IP address and user agent, and our structured event logs, which contain no statement content.",
            },
            {
              term: "Stripe",
              definition:
                "Payment processing. Receives your card details, entered directly on Stripe's hosted page, and the limited session metadata listed above: a one-way digest, an opaque job id, a page count, a transaction count, and version numbers.",
            },
            {
              term: "An LLM API provider (optional, only if configured on a deployment)",
              definition:
                "An OpenAI-compatible or Anthropic API used only as a fallback when the deterministic parser cannot read a layout. When it is used, it receives the extracted statement text, sent with instructions never to retain it. The deterministic parser is always tried first, so most conversions never reach the fallback.",
            },
            {
              term: "Upstash Redis (optional, only if configured on a deployment)",
              definition:
                "Rate-limit counters. Holds a hashed client identifier and a request count, and nothing else. No statement content is sent to it.",
            },
          ],
        },
        {
          kind: "callout",
          tone: "caution",
          text: "The fallback parser is the one case where statement text reaches a third party. It only runs when the deterministic parser cannot make sense of a layout, and the text is sent with a no-retention instruction. If you would rather not have that happen at all, do not proceed past a conversion that reports the fallback was used.",
        },
      ],
    },
    {
      id: "legal-bases",
      heading: "Legal bases for processing (UK and EU)",
      blocks: [
        {
          kind: "paragraph",
          text: "If data protection law such as the UK GDPR or the EU GDPR applies to you, these are the bases we rely on.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Performance of a contract",
              definition:
                "Processing the extracted statement text to produce the conversion you asked for, and processing the payment so the files can be released.",
            },
            {
              term: "Legitimate interests",
              definition:
                "Keeping the service available and resistant to abuse — rate limiting, error counting, and coarse operational metrics. These use hashed identifiers and counts, not statement content.",
            },
            {
              term: "Legal obligation",
              definition:
                "Stripe's retention of payment records to meet financial, tax, and anti-fraud requirements.",
            },
            {
              term: "Consent",
              definition:
                "Optional analytics, where it is enabled at all. It is off by default and it is never a condition of using the converter.",
            },
          ],
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights, and the honest answer about exercising them",
      blocks: [
        {
          kind: "paragraph",
          text: "Depending on where you live, you may have rights to access, correct, delete, restrict, or port your personal data, and to object to certain processing. Under the California Consumer Privacy Act, as amended, you also have rights to know what is collected, to delete it, to correct it, and to opt out of sale or sharing. We do not sell personal information and we do not share it for cross-context behavioural advertising, so there is nothing to opt out of. We will not discriminate against you for exercising any right.",
        },
        {
          kind: "callout",
          tone: "neutral",
          text: "Because there is no account and no stored statement data, most access and deletion requests are already satisfied by you clearing your own browser data. That single action removes the only copy of the converted result that exists.",
        },
        {
          kind: "paragraph",
          text: "That is not a way of avoiding the question, so here is what we can still do. Write to {{privacyEmail}} and we will tell you plainly what categories of data could relate to you, help you locate a payment record in Stripe if you can identify it, and pass on a deletion request to Stripe for anything Stripe is not legally required to keep. We cannot search for you by name or email, because we hold neither — you will need the Stripe receipt number or the payment reference from your card statement.",
        },
        {
          kind: "paragraph",
          text: "If you are in the UK or the EU and you are not satisfied with our response, you have the right to complain to your national data protection authority.",
        },
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and browser storage",
      blocks: [
        {
          kind: "paragraph",
          text: "We use no advertising cookies and no cross-site tracking cookies. There is no ad network, no pixel, and no social media widget on this site.",
        },
        {
          kind: "bullets",
          items: [
            "Strictly necessary storage only: the IndexedDB entry holding your encrypted result, and the small amount of state needed to carry a checkout session from the payment page back to the download.",
            "Analytics are off by default. Where a deployment enables a privacy-preserving analytics provider, it is cookieless and records page-level events only, never statement content.",
            "We honour the Do Not Track header and the Global Privacy Control signal. If either is present, analytics do not run.",
            "No cookie banner is used, because there is nothing to consent to beyond storage that is strictly necessary to deliver what you asked for.",
          ],
        },
      ],
    },
    {
      id: "international-transfers",
      heading: "International transfers",
      blocks: [
        {
          kind: "paragraph",
          text: "The service runs on infrastructure that may process requests in countries other than your own. Vercel and Stripe both operate globally and both offer standard contractual clauses and equivalent transfer mechanisms for personal data leaving the UK or the EEA; we rely on those mechanisms where they apply.",
        },
        {
          kind: "paragraph",
          text: "The practical exposure is small: your PDF is never transferred anywhere, and the extracted text is processed in memory during a single request rather than transferred to storage in another country.",
        },
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        {
          kind: "paragraph",
          text: "This service is intended for adults handling their own or their organisation's financial documents. It is not directed at anyone under 18, and we do not knowingly process the personal data of children. If you believe a child has used the service, contact {{privacyEmail}} — although, since nothing is stored, there will usually be nothing for us to delete.",
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        {
          kind: "paragraph",
          text: "If we change this policy, we update the date at the top of the page and publish the new version here. Material changes — for example, adding a sub-processor or changing what is sent to a third party — will be described in a short note on this page rather than buried in a re-write.",
        },
        {
          kind: "paragraph",
          text: "Because we hold no email addresses, we cannot notify you directly. Checking this page before a conversion is the only reliable way to see the current terms.",
        },
      ],
    },
    {
      id: "contact",
      heading: "Contacting us about privacy",
      blocks: [
        {
          kind: "paragraph",
          text: "Privacy questions and data requests: {{privacyEmail}}. General support: {{supportEmail}}. Security reports: {{securityEmail}}. We aim to respond first within 2 business days.",
        },
        {
          kind: "callout",
          tone: "caution",
          text: "Please do not attach a statement, an account number, or any transaction data to an email. We do not need it and we do not want to receive it.",
        },
      ],
    },
  ],
};
