/**
 * The site-wide FAQ.
 *
 * Kept as data so the same questions can be rendered on `/faq` and marked up as JSON-LD from
 * exactly the same source — structured data that does not match the visible page is a
 * manual-action risk, and the only reliable way to prevent the two drifting apart is to have
 * one of them generated from the other.
 *
 * The questions are the ones a sceptical buyer actually asks before handing over a bank
 * statement, in roughly the order they ask them. Answers state limitations plainly; a FAQ that
 * only contains flattering answers is not read as reassuring, it is read as marketing.
 */

export type FaqEntry = {
  question: string;
  answer: string[];
  category: FaqCategory;
};

export type FaqCategory =
  "Before you convert" | "Privacy and security" | "Payment" | "Output and limits";

export const faqCategories: readonly FaqCategory[] = [
  "Before you convert",
  "Privacy and security",
  "Payment",
  "Output and limits",
];

export const faqs: readonly FaqEntry[] = [
  {
    category: "Before you convert",
    question: "What does “verified” mean here?",
    answer: [
      "It means the extraction was checked: every accepted row is traced to source text in your PDF, document completeness passed, unresolved material ambiguities are zero, and the printed balances and running-balance transitions that apply all agreed using decimal arithmetic.",
      "It does not mean the original statement is authentic, complete outside the PDF you supplied, approved by a bank, or suitable as an audit. If those checks cannot be completed, the payment step never appears.",
    ],
  },
  {
    category: "Before you convert",
    question: "Do I need an account?",
    answer: [
      "No. There is no sign-up, no password, and no email address required. You choose a file, review what was extracted, and pay once if you want the download.",
    ],
  },
  {
    category: "Before you convert",
    question: "How do I know the conversion is correct before I pay?",
    answer: [
      "Because we show you. Every transaction we extract is added up and compared with the balances and subtotals printed on your statement. You see the equation that was used, the number we calculated, the number your bank printed, and the difference between them.",
      "You also see the first ten rows of the table in the same columns the export uses. If any of that looks wrong, do not pay.",
    ],
  },
  {
    category: "Before you convert",
    question: "Why not upload my statement to a general AI assistant?",
    answer: [
      "You can. A general AI assistant may extract transactions from a statement.",
      "Statement Reconcile is a fixed workflow: it uses a consistent schema, traces accepted rows to source text, checks page completeness and applicable balance transitions with deterministic arithmetic, and refuses to sell an ambiguous result. It removes the prompting, formatting decisions, and manual verification from the job.",
    ],
  },
  {
    category: "Before you convert",
    question: "What happens if my statement cannot be verified?",
    answer: [
      "The payment step never appears. You are told what we read and where the numbers stopped agreeing, and that is the end of it — there is nothing to refund because nothing was charged.",
      "This is the case we designed the product around. A converter that charges before it knows whether the output is right is selling you the risk rather than the result.",
    ],
  },
  {
    category: "Before you convert",
    question: "Can you read a scanned or photographed statement?",
    answer: [
      "No. A scan is an image of text, and there is nothing in the file to extract. We do not run optical character recognition, because a misread digit from OCR is exactly the kind of error this product exists to prevent.",
      "Download the statement from your online banking instead. That version almost always contains real text.",
    ],
  },
  {
    category: "Privacy and security",
    question: "Is my bank statement uploaded to your servers?",
    answer: [
      "The PDF file itself is never uploaded. Your browser opens it and extracts the text layer locally. Only that text is sent to be parsed.",
      "The text is used to answer that one request and is never written to a database, an object store, or a disk. When the response is sent, it goes out of scope.",
    ],
  },
  {
    category: "Privacy and security",
    question: "Where is my converted statement kept while I pay?",
    answer: [
      "In your own browser. The converted result is sealed by our server and stored in this browser's local database, encrypted again at rest with a key that cannot leave the device. It expires by itself within the hour, and there is a button to delete it immediately.",
      "That is also why a download can fail if you clear your browsing data between paying and downloading: there is no server-side copy for us to fall back on.",
    ],
  },
  {
    category: "Privacy and security",
    question: "What does Stripe see?",
    answer: [
      "Your payment details, which are entered on Stripe's own page and never touch our code, and a small amount of technical metadata: a one-way hash of the converted result, an opaque job reference, the page count, the transaction count, and the product version.",
      "No balance, bank name, account number, transaction description, date from your statement, or filename is ever sent to Stripe or anywhere else.",
    ],
  },
  {
    category: "Privacy and security",
    question: "Do you log my transactions?",
    answer: [
      "No. Application logs contain event names, counts, and error codes only. Statement text, descriptions, amounts, balances, and filenames are never logged, and exception messages are discarded because an exception can quote the value that caused it.",
    ],
  },
  {
    category: "Payment",
    question: "Is this a subscription?",
    answer: [
      "No. It is one payment for one conversion pack: one or more statements, up to 50 total pages combined. There is nothing to cancel, and no card is stored.",
    ],
  },
  {
    category: "Payment",
    question: "When do I see the charge?",
    answer: [
      "Only after every statement kept in the pack passes verification. You review actual rows, source links, document coverage, and applicable balance checks first. The exact one-time charge appears on the final billing screen before secure checkout.",
    ],
  },
  {
    category: "Payment",
    question: "Both file formats for one payment?",
    answer: [
      "Yes. The Excel workbook, the CSV, the verification report PDF, and the pack manifest are the same conversion in the formats you take home, so one payment includes them and you can download each as often as you need.",
    ],
  },
  {
    category: "Payment",
    question: "Can I get a refund?",
    answer: [
      "Yes, for thirty days, without having to argue for it. If the file is wrong, incomplete, or you could not download it, ask and it is refunded in full.",
      "Because we store nothing, we cannot find a purchase from a name or an email address. Include the Stripe receipt number, or the payment reference from your card statement, and it is straightforward.",
    ],
  },
  {
    category: "Payment",
    question: "I paid and lost the download. What now?",
    answer: [
      "Open the success link again on the same browser you paid from. A paid session can re-download the same statement for thirty days, as long as that browser still holds the sealed result.",
      "If the browser data is gone, so is the result. Convert the statement again and send us the receipt — we refund the first payment rather than charge you twice.",
    ],
  },
  {
    category: "Output and limits",
    question: "What exactly is in the download?",
    answer: [
      "A CSV with one row per transaction in a fixed column order — Date, Posted Date, Description, Debit, Credit, Amount, Balance — and an Excel workbook containing the same table, a summary sheet, a verification sheet, and source-reference columns.",
      "You also receive a per-statement verification PDF and pack-manifest.json. The report records completeness, source mapping, running-balance checks, and the arithmetic equation. It does not verify that the original PDF is authentic or suitable as an audit.",
    ],
  },
  {
    category: "Output and limits",
    question: "Are the amounts real numbers or text?",
    answer: [
      "Real numbers, with a number format matching the statement's currency, so you can sum and filter them immediately. There are no formulas anywhere in the workbook, and any description beginning with a character a spreadsheet would treat as a formula is neutralised so it cannot execute on open.",
    ],
  },
  {
    category: "Output and limits",
    question: "What kinds of layout can you read?",
    answer: [
      "Separate debit and credit columns, a single signed amount column, and amounts grouped under section headings. Running balance columns, parenthesised negatives, CR and DR markers, and both comma and dot decimal separators are all handled, as are several date formats with the day and month order established from the document rather than assumed.",
    ],
  },
  {
    category: "Output and limits",
    question: "Can you convert a document with several accounts in it?",
    answer: [
      "No, and this is a deliberate refusal rather than a gap. A combined document has no single opening and closing balance, so there is nothing to verify the extraction against — and an unverified conversion is not what this product sells. Download each account's statement separately.",
    ],
  },
  {
    category: "Output and limits",
    question: "Do you support QuickBooks .qbo or OFX files?",
    answer: [
      "Not currently. The output is CSV and Excel. Most accounting software, including QuickBooks and Xero, can import a CSV bank statement, and the fixed column order is designed to make that mapping quick.",
    ],
  },
];

/** The subset shown on the homepage, chosen for the objections that block a first purchase. */
export const homepageFaqQuestions = [
  "What does “verified” mean here?",
  "How do I know the conversion is correct before I pay?",
  "Why not upload my statement to a general AI assistant?",
  "Is my bank statement uploaded to your servers?",
  "What happens if my statement cannot be verified?",
  "Is this a subscription?",
  "Can you read a scanned or photographed statement?",
  "Can I get a refund?",
] as const;

export function faqByQuestion(question: string): FaqEntry | undefined {
  return faqs.find((entry) => entry.question === question);
}

/** Flattened form used for JSON-LD, where an answer has to be a single string. */
export function faqForSchema(
  entries: readonly FaqEntry[],
): Array<{ question: string; answer: string }> {
  return entries.map((entry) => ({ question: entry.question, answer: entry.answer.join(" ") }));
}
