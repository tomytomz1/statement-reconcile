import type { LegalDocument } from "./types";

export const contactPage: LegalDocument = {
  slug: "contact",
  title: "Contact | Statement Reconcile",
  metaDescription:
    "Reach support, privacy, or security by email, with a 2 business day first response target. Please never send us a statement, an account number, or transaction data.",
  h1: "Contact",
  lastUpdated: "2026-08-24",
  summary: [
    "Three email addresses, one for each kind of question. There is no phone line and no live chat.",
    "There is also no account system, so a message from you is the only context we have. What you include matters.",
  ],
  plainEnglish: [
    "Email us. Support for anything about a conversion or a refund, privacy for data questions, security for vulnerability reports.",
    "We aim to reply first within 2 business days.",
    "Never attach or paste your statement, an account number, or any transaction data. We do not need it and we do not want it.",
  ],
  sections: [
    {
      id: "how-to-reach-us",
      heading: "How to reach us",
      blocks: [
        {
          kind: "definitions",
          items: [
            {
              term: "Support — {{supportEmail}}",
              definition:
                "Anything about a conversion, a payment, a refund, a re-download, or a statement layout that was not read correctly. This is the right address if you are not sure which one to use.",
            },
            {
              term: "Privacy — {{privacyEmail}}",
              definition:
                "Data protection questions, access or deletion requests, and questions about sub-processors or what is sent to Stripe.",
            },
            {
              term: "Security — {{securityEmail}}",
              definition:
                "Vulnerability reports and responsible disclosure. The scope rules are on the security page. Please do not send security reports to the support address.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Email is the only support channel. There is no phone number, no live chat, and no ticket portal to log into.",
        },
      ],
    },
    {
      id: "response-times",
      heading: "Response times",
      blocks: [
        {
          kind: "paragraph",
          text: "We aim to send a first response within 2 business days. That is a target for a genuine reply from a person, not an automated acknowledgement.",
        },
        {
          kind: "paragraph",
          text: "Refund requests are usually the fastest to resolve, because the answer is yes. Layout problems can take longer, since reproducing the issue without seeing your document takes a little back and forth.",
        },
      ],
    },
    {
      id: "what-to-include",
      heading: "What to include in your message",
      blocks: [
        {
          kind: "paragraph",
          text: "We hold no account for you and no record of your conversion, so we start from whatever you tell us. These details help.",
        },
        {
          kind: "bullets",
          items: [
            "For a payment or refund question: your Stripe receipt number, or the payment reference from your card statement together with the date and amount. We cannot look a purchase up by name or email.",
            "For a conversion problem: what went wrong in general terms — for example, rows missing, dates the wrong way round, descriptions split across extra rows, or debits and credits swapped.",
            "The type of document: a current or savings account statement, or a credit card statement, and roughly how many pages it had.",
            "Your browser and operating system, if something on the page did not work.",
            "Any error code the page displayed.",
          ],
        },
      ],
    },
    {
      id: "never-send-your-statement",
      heading: "Never send us your statement",
      blocks: [
        {
          kind: "callout",
          tone: "caution",
          text: "Do not attach your PDF. Do not paste transaction rows into an email. Do not send an account number, a sort code, a card number, or a balance. We do not need any of it and we do not want to receive it.",
        },
        {
          kind: "paragraph",
          text: "The whole product is built so that your statement never reaches us. Emailing it would undo that in a single step: an email sits on mail servers, gets backed up, and is far harder to delete than something that was never sent. If you do send one, we will delete it and ask you not to do it again.",
        },
        {
          kind: "paragraph",
          text: "A description of the problem is genuinely enough. If we truly cannot reproduce an issue without an example, we will ask you to construct a small fake statement with invented numbers — never your real one.",
        },
      ],
    },
    {
      id: "what-we-cannot-help-with",
      heading: "What we cannot help with",
      blocks: [
        {
          kind: "callout",
          tone: "caution",
          text: "We cannot recover a converted file. We never had a copy. If your browser no longer holds the sealed result, the file is gone for everyone, including us.",
        },
        {
          kind: "bullets",
          items: [
            "Re-sending a lost download. Instead, convert the statement again and we will refund or credit so you do not pay twice.",
            "Finding your purchase from your name or email address. We hold neither. Send the Stripe receipt number or the payment reference.",
            "Telling you what was in a previous conversion. We keep no record of your statement, your transactions, or your balances.",
            "Reading a scanned statement. There is no OCR, so an image-only PDF cannot be converted here at all.",
            "Unlocking a password-protected PDF. You will need to remove the password in a PDF reader first.",
            "Splitting a multi-account document. Files containing more than one account are refused, because one set of balances cannot verify them.",
            "Accounting, tax, or financial advice. The output is a mechanical conversion of what your statement says, and reviewing it before you rely on it is your responsibility.",
          ],
        },
      ],
    },
    {
      id: "business-and-legal",
      heading: "Business and legal enquiries",
      blocks: [
        {
          kind: "paragraph",
          text: "Legal notices, invoicing questions, and other business correspondence can go to {{supportEmail}} and will be routed from there. The operating entity is the legal business name given in our site configuration; the terms of service set out the governing law.",
        },
      ],
    },
  ],
};
