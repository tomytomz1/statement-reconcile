import type { SeoPage } from "./types";

export const creditCardStatementToCsv: SeoPage = {
  slug: "credit-card-statement-to-csv",
  targetQuery: "credit card statement to csv",
  searchIntent:
    "A bookkeeper or cardholder who needs card activity as a plain CSV to import into expense software, a ledger, or an existing spreadsheet template.",
  title: "Credit Card Statement to CSV | Statement Reconcile",
  metaDescription:
    "Export PDF credit card activity to CSV for expense and ledger imports. Fixed columns, ISO dates, and a balance check you see before paying $19.",
  eyebrow: "Credit Card Statement to CSV",
  h1: "Credit Card Statement to CSV",
  intro: [
    "A CSV is what most accounting and expense tools actually want: no formatting, no merged cells, one row per transaction, and a header they can map to their own fields.",
    "This page produces that file from a PDF card statement, with a column order that does not shift between statements, and it reconstructs the new balance from the extracted rows before offering you the download. A file that does not add up is a file you will spend an afternoon unpicking, so the check comes first.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "One comma-separated, UTF-8 encoded CSV with a single header row and no blank spacer rows between statement sections.",
    "Seven columns in a fixed order — Date, Posted Date, Description, Debit, Credit, Amount, Balance — so an import mapping you save once keeps working next month.",
    "Dates written as YYYY-MM-DD in both date columns, which sorts correctly as text and is accepted by importers without a format hint.",
    "An Excel workbook of the same rows, with a Transactions sheet and a Statement Summary sheet, included in case you want to eyeball the data before importing it.",
  ],
  reconciliation: {
    heading: "Checking the card balance before the file leaves",
    body: [
      "An import is hard to unpick. Once a few hundred card lines are sitting in a ledger, finding the one that was misread means reconciling the account by hand, which is exactly the work you were trying to avoid.",
      "So the arithmetic is settled first. The extracted rows are totalled by direction and pushed through the card equation, starting from the previous balance the issuer printed and ending, if the extraction was complete, on the new balance. Any category totals on the statement are compared as well.",
      "That comparison is decimal arithmetic in our code, done after extraction, and its result is shown to you with the figures behind it. If the numbers do not agree, the paywall never appears and nothing is charged.",
    ],
    equation: "Previous balance + purchases + fees + interest − payments − credits = new balance",
  },
  steps: [
    {
      title: "Pick the statement PDF",
      detail:
        "Choose the file in your browser. Nothing about the PDF leaves your machine; only the text extracted from it is sent for parsing, and it is not kept afterwards.",
    },
    {
      title: "Rows are built from the page geometry",
      detail:
        "Column positions in the text layer decide which figures are charges and which are credits, and merchant names that wrapped onto a second line are stitched back onto their row.",
    },
    {
      title: "Dates are normalised",
      detail:
        "Where the issuer prints a transaction date and a posting date, both are kept and both are converted to ISO form, with the day and month order read from the document.",
    },
    {
      title: "The equation is checked and shown",
      detail:
        "You see the previous balance, the new balance, the totals the engine derived, and whether they meet, all before any payment step.",
    },
    {
      title: "Download the CSV",
      detail:
        "One $19 payment releases the CSV and the workbook for that statement. Nothing recurring, and no account to create.",
    },
  ],
  sections: [
    {
      heading: "Transaction date and posted date are not the same day",
      body: [
        "Card issuers usually print two dates. The transaction date is when the purchase happened; the posting date is when the issuer applied it to the account, often one to three days later and sometimes on the other side of a month boundary.",
        "Which one your destination wants depends on what it is for. Expense reporting and sales tax work usually follow the transaction date, because that is when the spend occurred. Matching a statement balance line by line follows the posting date, because that is the order the balance moved in. Rather than choose for you, the CSV carries both in their own columns and leaves the mapping to you.",
      ],
      bullets: [
        "Date holds the transaction date wherever the issuer printed one",
        "Posted Date holds the posting date, and is left empty rather than filled with a guess when the statement gives only one date",
        "Both are ISO formatted, so a December purchase posted in January still sorts into the right place",
        "The Balance column follows posting order, since that is the order the issuer applied the lines in",
      ],
    },
    {
      heading: "Fees, interest, and the categories your ledger cares about",
      body: [
        "In a ledger, a finance charge and a hotel bill do not belong in the same account. Interest is a cost of borrowing, an annual fee behaves more like a subscription, and a foreign transaction fee usually attaches to whichever purchase triggered it.",
        "The extractor keeps those lines separate instead of folding them into spending, using the headings and columns the issuer printed. Descriptions come through as written, so a rule in your accounting software that looks for an interest or fee label will match reliably. The accompanying workbook also totals fees and interest for the period, which is a quick way to confirm afterwards that your ledger picked them up the way you intended.",
      ],
    },
    {
      heading: "Refunds have to keep their direction",
      body: [
        "A refund is the line that most often gets mangled on the way into a ledger. It reduces the balance owed, so its direction is opposite to a purchase — but stripped of that direction it looks identical to a charge, and the result is spending counted twice for something that went back to the merchant.",
        "In the CSV a refund sits in the Credit column and appears in the Amount column with the sign that reduces the balance, exactly as a payment does. The difference between the two is in the description, not in the arithmetic, so if your import rules need to distinguish a merchant credit from a cardholder payment they should key off the description text.",
        "The same discipline applies to chargebacks and statement credits: if the issuer printed the line as a reduction of the balance, that is how it is exported, because that is how it has to behave for the period to add up.",
      ],
    },
  ],
  commonIssues: [
    "Import tools reading a single amount column and assuming every value in it is spending",
    "Files that repeat the statement header partway down, because the PDF had page breaks the converter ignored",
    "Amounts arriving as text because a thousands separator travelled with the value",
    "Two date columns collapsed into one during extraction, so the month a purchase belongs to becomes a coin toss",
    "Descriptions truncated at the point where the PDF wrapped the line, leaving half a merchant name",
  ],
  supported: [
    "Card statements that print a previous balance and a new balance for the period",
    "Layouts with both a transaction date and a posting date, and layouts with a single date per row",
    "Sectioned statements where purchases, payments, fees, and interest appear under their own headings",
    "Amounts marked CR or DR, wrapped in parentheses, or written with a comma decimal separator",
    "Statements of up to 50 pages, exported as one CSV",
  ],
  unsupported: [
    "Image-only PDFs, including statements photographed or scanned from paper",
    "Statements protected by a password that has not been removed",
    "Files that cover more than one card account in the same document",
    "Statements with no itemised activity, where there is nothing to reconcile against the balances",
  ],
  faqs: [
    {
      question: "Which date column should I map to my accounting software?",
      answer:
        "Map the transaction date if you are recording when the spend happened, which is the usual choice for expense claims and tax. Map the posted date if you are matching the statement balance line by line. Both are in the file, so you do not have to re-export to change your mind.",
    },
    {
      question: "Is the CSV encoded so accented merchant names survive?",
      answer:
        "Yes, the file is UTF-8. Merchant names with accents or non-Latin characters come through as printed. If your import tool asks you to pick an encoding, choose UTF-8 rather than a regional code page.",
    },
    {
      question: "Are the description fields quoted?",
      answer:
        "Fields are quoted where they need to be, which in practice means descriptions containing a comma or a quote character. Everything else is written plain, so the file opens cleanly in a spreadsheet and parses cleanly in a script.",
    },
    {
      question: "Can you import into my accounting package directly?",
      answer:
        "No. The output is a CSV and an Excel workbook, and loading either one is a manual step in whichever tool you use. There is no integration and no API.",
    },
    {
      question: "Can I re-download the CSV later?",
      answer:
        "Save the files when you download them. We do not keep your statement data after the conversion, so treat the download as the copy that matters and store it wherever you keep your records.",
    },
  ],
  related: [
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context:
        "The workbook version of the same conversion, with a filterable sheet and a period summary.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "For current, checking, or savings statements, which balance on cash rather than on what is owed.",
    },
    {
      href: "/convert-pdf-transactions-to-csv",
      label: "Convert PDF transactions to CSV",
      context:
        "More detail on the file itself: encoding, number formats, and the quirks of PDF-printed amounts.",
    },
    {
      href: "/pricing",
      label: "Pricing",
      context: "What the single $19 charge covers and at what point it is taken.",
    },
  ],
  futureExpansion: [
    "Field mapping notes for a handful of common expense tools",
    "A short guide to splitting foreign currency lines that carry their own conversion charge",
    "An explanation of how statement credits differ from cardholder payments for reporting purposes",
  ],
};
