import type { SeoPage } from "./types";

export const businessBankStatementToExcel: SeoPage = {
  slug: "business-bank-statement-to-excel",
  targetQuery: "business bank statement to excel",
  searchIntent:
    "A business owner, office manager, or in-house bookkeeper who has to get a company account statement into a spreadsheet so that someone else — a bookkeeper, an accountant, a director — can work from it.",
  title: "Business Bank Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert a business account PDF statement into Excel and CSV for month-end close. Every row is checked against the printed evidence before billing appears.",
  eyebrow: "Company accounts",
  h1: "Business bank statement to Excel",
  intro: [
    "A business account statement is rarely read for its own sake. It goes to a bookkeeper, into a close file, or in front of a lender, and whoever receives it treats the numbers as given. That changes what a conversion has to deliver: not a table that looks plausible, but a table someone else can safely build on.",
    "This converter turns PDF statements into an Excel workbook and CSV, then adds the extracted rows back up and tests them against the balances and totals the bank printed. You see that test, and the first rows of the table, before the payment step exists.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet holding one row per movement, with a frozen header row and an autofilter already switched on, so a hundred-line month is workable the moment the file opens.",
    "Amounts written as real numbers with a number format appropriate to the statement currency, which means a SUM over a filtered range returns a figure you can quote rather than a text concatenation.",
    "A Statement Summary sheet recording the period, the opening and closing balances, total debits and credits, the reconciliation method applied, the equation used, and each individual check that was performed.",
    "The same transactions as a CSV with the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, for anyone downstream who wants to load rather than read.",
    "No formulas, no macros, and no external links anywhere in the workbook, so it opens without a security prompt on a managed company machine.",
  ],
  reconciliation: {
    heading: "Why a verified export matters more when someone else uses it",
    body: [
      "When you convert a statement for your own reference, a missing row costs you the ten minutes it takes to notice. When the same file is handed to a bookkeeper, the cost compounds. The row is posted or not posted, the month is closed, a VAT or sales tax figure is computed from it, and the discrepancy surfaces weeks later as an unexplained difference that somebody has to trace back through the whole period.",
      "That is the case for putting the arithmetic check before the download rather than after. Once the transaction rows have been extracted, a separate deterministic routine in our own code re-adds them using exact decimal arithmetic and compares the result against the balances printed on the document. Where the statement also prints stated total debits and total credits, those are compared too, which localises a failure to one side of the ledger instead of just reporting that something is wrong.",
      "The result is displayed with the numbers behind it. If the equation does not close, the payment step never appears, because a company account export that might be short one payment is not worth paying for.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Download the statement, one account at a time",
      detail:
        "Business online banking often offers a combined document covering several accounts or sub-accounts. Export each account as its own PDF, because a combined file cannot be balanced as a single ledger.",
    },
    {
      title: "Open the file in the browser",
      detail:
        "The PDF is read on your own machine with pdf.js. The file itself is never uploaded; only the positioned text extracted from it is sent for parsing, and it is not kept once the parsed response comes back.",
    },
    {
      title: "Let the transaction table be rebuilt",
      detail:
        "Columns are reconstructed from the coordinates of the text, continuation lines are reattached to the transaction they belong to, and section headings and repeated page furniture are excluded from the rows.",
    },
    {
      title: "Check the reconciliation and scan the preview",
      detail:
        "Read the period, the balances, the totals, and the verdict. Ten sample rows are shown; look for supplier names that appear truncated and for two payments to the same supplier collapsing into one line.",
    },
    {
      title: "Review the verification and take the workbook",
      detail:
        "One payment covers a conversion pack with one or more statements up to 50 total pages, including the workbook, CSV, and verification reports. There is no account to create.",
    },
  ],
  sections: [
    {
      heading: "Volume changes which mistakes you can catch by eye",
      body: [
        "A personal current account statement might run to thirty lines a month, and a person reading it carefully will notice if a row is missing. A trading company account can carry several hundred: card terminal settlements, supplier payments, standing orders, direct debits, transfers between the company's own accounts, and bank charges applied in a block at the period end.",
        "At that volume, visual checking stops working. Nobody reliably spots that a spreadsheet has 412 rows when the statement had 413, and nothing about the file announces the difference. Arithmetic scales where attention does not: the sum either reaches the printed closing balance or it does not, and it is exactly as sensitive to one missing £40 supplier payment in a 400-row month as it is in a 40-row one.",
      ],
      bullets: [
        "Repeated page headers and running totals must be excluded from the row count",
        "Fees applied in a block at the period end must not be folded into the preceding transaction",
        "Transfers between two of the company's own accounts appear once in each statement and must not be deduplicated across them",
        "A supplier name long enough to wrap must rejoin its own row rather than becoming an amountless extra line",
      ],
    },
    {
      heading: "Month-end close, and the order the work happens in",
      body: [
        "In a close that runs to a deadline, the bank data is usually an early dependency. Postings, accruals, and the reconciliation itself all wait on it, so an error found in the statement export is not a local problem — it invalidates the work done after it.",
        "Putting verification in front of the download moves that discovery to the cheapest possible moment. You learn that the extraction is inconsistent with the printed balances before you have posted anything, rather than at the point where the ledger will not tie and the difference has to be hunted line by line.",
        "It is worth being precise about what the check does and does not cover. It establishes that the rows extracted from the PDF are arithmetically consistent with the figures the bank printed on the same document. It does not audit the transactions, confirm the statement is genuine, or substitute for the bank reconciliation you perform in your ledger against your own books.",
      ],
    },
    {
      heading: "Handing the file to whoever needs it next",
      body: [
        "The Statement Summary sheet exists because the workbook usually leaves your hands. It records what was converted, over what period, which reconciliation method was applied, the equation, and every check that ran, so the recipient does not have to take the transaction sheet on trust or come back to you with questions about provenance.",
        "The two output formats serve two different recipients. An accountant reviewing the period generally wants the workbook, where they can filter by description and sum a selection. A bookkeeping system wants the CSV, where the seven columns sit in a fixed order that an import mapping written in January still matches in December.",
      ],
      bullets: [
        "Statement period and currency, as read from the document",
        "Opening and closing balances as printed, alongside the totals computed from the extracted rows",
        "The reconciliation method, the equation, and the outcome of each check",
        "The transaction count and the timestamp the file was generated",
      ],
    },
  ],
  commonIssues: [
    "Combined business statements bundling a current account, a deposit account, and a company card into one PDF, which cannot be reconciled as one ledger",
    "Bank charges and interest summarised in a separate block at the end rather than appearing in date order",
    "Long supplier and payment-reference narratives that wrap across two or three printed lines",
    "Statements re-saved by a document management system, which sometimes lose the coordinate precision that column reconstruction depends on",
    "Merchant acquirer settlement lines that repeat an almost identical description many times in a month, making a duplicated row invisible by eye",
  ],
  supported: [
    "Business current, checking, and deposit account statements with a listed transaction table",
    "Company credit card statements, verified with the previous-balance equation rather than the opening-balance one",
    "High-volume periods, up to 50 pages in a single conversion",
    "Separate debit and credit columns, a single signed amount column, or activity grouped under section headings with subtotals",
    "Running balance columns, parenthesised negatives, CR and DR markers, and comma or dot decimal separators",
  ],
  unsupported: [
    "Scanned or photographed statements with no text layer, since there is no character recognition in this version",
    "Password-protected PDFs, which must be unlocked in a reader and re-saved first",
    "Documents covering more than one account, including combined business banking packs",
    "Statements whose printed balances and subtotals are not sufficient to verify the extraction",
    "Anything that is not a PDF, and files larger than 20 MB",
  ],
  faqs: [
    {
      question:
        "My business account runs to several hundred transactions a month. Is that a problem?",
      answer:
        "No, provided the document is 50 pages or fewer and under 20 MB. Volume is what the arithmetic check is most useful for, because a single missing row in a long period is the error a person is least likely to notice unaided.",
    },
    {
      question: "Our bank sends one PDF covering three company accounts. What should I do with it?",
      answer:
        "Re-export each account as its own statement from online banking. A combined document has no single opening and closing balance to reconcile against, so it is treated as unsupported rather than converted on a best-effort basis.",
    },
    {
      question: "Does the export include a column for a nominal or GL code?",
      answer:
        "No. The seven columns are fixed and contain only what the statement printed. Coding is a judgement about your chart of accounts, so it belongs in your ledger or in a column you add to the workbook yourself after download.",
    },
    {
      question: "Can I give the file to our bookkeeper without giving them banking access?",
      answer:
        "Yes, and that is a common reason to convert rather than grant a read-only banking login. You download the workbook and the CSV and send them on. There is no account here for either of you to be added to.",
    },
    {
      question: "We have already closed the month. Is a verified export still worth anything?",
      answer:
        "It is most useful as evidence rather than as input. The Statement Summary sheet records which check was run against that period and what it returned, which is the sort of thing a reviewer or a later query asks for after the fact.",
    },
  ],
  related: [
    {
      href: "/bank-statement-spreadsheet-for-accountants",
      label: "Bank statement spreadsheets for accountants",
      context: "Written for the person receiving the file rather than the person producing it.",
    },
    {
      href: "/convert-bank-statement-to-csv",
      label: "Convert a bank statement to CSV",
      context: "How the export fits into a bookkeeping run over a whole period.",
    },
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context: "For the company card, which is verified with a different equation.",
    },
    {
      href: "/pricing",
      label: "What the pack includes",
      context:
        "One multi-file conversion pack, all outputs, no subscription and nothing to cancel.",
    },
  ],
  futureExpansion: [
    "A worked month-end close checklist showing where a verified statement export sits among the other dependencies",
    "Notes on handling merchant acquirer settlement lines and matching them to daily takings",
    "Guidance on reconciling inter-account transfers when both sides of the transfer are converted separately",
  ],
};
