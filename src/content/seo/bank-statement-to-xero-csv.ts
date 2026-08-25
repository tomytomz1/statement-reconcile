import type { SeoPage } from "./types";

export const bankStatementToXeroCsv: SeoPage = {
  slug: "bank-statement-to-xero-csv",
  targetQuery: "bank statement to xero csv",
  searchIntent:
    "Someone about to import a statement into a Xero bank account manually, who wants to know what shape the CSV has to be in and what happens if the file turns out to be wrong.",
  title: "Bank Statement to Xero CSV | Statement Reconcile",
  metaDescription:
    "Prepare a bank statement CSV for your own Xero mapping: column expectations, date-format pitfalls, and a balance check that runs before billing. Independent tool.",
  eyebrow: "Statement import",
  h1: "Bank statement to Xero CSV",
  intro: [
    "Importing a statement into Xero by hand is straightforward when the file is right. The difficulty is that Xero, quite reasonably, trusts the file: whatever rows you hand it become statement lines, and statement lines are what the reconciliation screen works from.",
    "This converter produces a CSV from your PDF statement and, before offering it to you, re-adds every extracted row and tests the result against the balances printed on the document. The point is to catch a missing or duplicated transaction while it is still a file on your machine, rather than after it has become a reconciled line in a bank account.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A header row followed by one line per transaction, with the columns always in the order Date, Posted Date, Description, Debit, Credit, Amount, Balance.",
    "Dates as YYYY-MM-DD with a four-digit year, established from the statement rather than assumed from a regional setting.",
    "A signed Amount column for a single-column import, and separate positive Debit and Credit columns for a two-column import, both present in the same file.",
    "Amounts stripped of thousands separators and currency symbols, with parenthesised negatives and CR or DR markers already resolved into a sign.",
    "RFC 4180 quoting, so a description containing a comma or a quotation mark cannot shift the fields that follow it.",
    "The matching Excel workbook, whose Statement Summary sheet records the reconciliation method, the equation, and every check performed.",
  ],
  reconciliation: {
    heading: "The check happens before the file exists, because afterwards is the hard part",
    body: [
      "A bank reconciliation is a commitment. Once a statement line has been matched to a transaction in Xero, the two are linked, and undoing that link is a deliberate act rather than an edit — you unreconcile first, and only then can you deal with the line itself. Removing lines from an imported statement is similarly restricted by design, which is a sensible thing for an accounting system to do and an inconvenient thing to discover halfway through a fix.",
      "That asymmetry is the whole argument for verifying the file first. Our extraction is followed by an independent pass in our own code that re-adds the transaction rows using exact decimal arithmetic, then compares the result against the opening and closing balances printed on the statement, and against any stated totals it carries. Where the statement prints a running balance beside each line, the continuity of that chain is checked as well, which is a stricter test than the period equation on its own.",
      "You see the verdict and the figures before the payment step appears. If the extraction cannot be reconciled, there is no charge and no file to import, which is a better outcome than a clean-looking CSV and a week of unpicking.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Note the last statement line already in the bank account",
      detail:
        "Open the account in Xero and find where the existing data stops. The statement you convert should begin after that point, because overlapping imports are the main cause of duplicate statement lines.",
    },
    {
      title: "Convert the statement PDF",
      detail:
        "The document is opened in your browser with pdf.js. The transaction table is rebuilt from the positions of the text, and only that extracted text is sent for parsing.",
    },
    {
      title: "Read the reconciliation result and the preview",
      detail:
        "Check the statement period against the period you intend to import, confirm the balances match the document in front of you, and look over the ten preview rows.",
    },
    {
      title: "Review the result and download the CSV",
      detail:
        "One paid conversion pack includes one or more statements up to 50 total pages and all outputs. Open each CSV before mapping it and confirm its first and last dates.",
    },
    {
      title: "Import and map the columns",
      detail:
        "In the bank account's import screen, point the date field at Date and the amount field at Amount, or at the Debit and Credit pair if you are importing two columns. Map Description to the payee or description field and leave Balance out.",
    },
    {
      title: "Check the imported total before reconciling",
      detail:
        "Compare the net movement of the imported lines against the total credits and debits shown in our summary. Do that while the lines are still unreconciled, when correcting them is cheap.",
    },
  ],
  sections: [
    {
      heading: "What the import needs, and what it will happily ignore",
      body: [
        "A statement import needs very little to succeed: a date and an amount for every line, plus whatever text you want to appear as the payee or description on the reconciliation screen. Everything else is optional. Our seven columns therefore over-supply the import deliberately, and the mapping step is where you decide what is actually used.",
        "The two columns to leave alone are Posted Date and Balance. Posted Date exists because some statements print both a transaction date and a settlement date, and choosing between them is your decision, not ours — but importing both dates is not something the statement import is asking for. Balance is a running total rather than a movement; mapped into an amount field it manufactures a transaction for every balance figure on the statement.",
        "Field names and available options in the import screen do change over time and between regions. Treat the labels Xero shows you as authoritative and use them to decide which of our columns to point at what.",
      ],
      bullets: [
        "Date — map to the statement date field",
        "Description — map to the payee or description field, whichever your workflow reconciles against",
        "Amount — map this alone if you are importing a single signed column, money out negative",
        "Debit and Credit — map these instead if you are importing two positive columns",
        "Posted Date and Balance — leave unmapped",
      ],
    },
    {
      heading: "Date formats, and why the ambiguity is worse than it looks",
      body: [
        "The import asks what date format the file uses because it cannot infer it safely. A file full of dates like 05/06/2026 is genuinely undecidable: both readings are valid calendar dates, and the file gives no clue which was intended.",
        "The damage from choosing wrongly is not an error message. Any date whose day number is twelve or below reads as a valid date under either convention, so those rows import quietly into the wrong month, while anything dated the thirteenth onwards either fails or lands somewhere stranger still. The result is a bank account whose lines are spread across two periods, neither of which will reconcile.",
        "Writing every date as YYYY-MM-DD removes the guess. The day and month order is worked out from the statement while the document is still being read, using the statement period line and the sequence of the rows, and the ISO value that comes out is the same in every locale. Choose the year-first option in the import and the ambiguity never arises.",
      ],
    },
    {
      heading: "Duplicates and gaps, the two ways a period goes wrong",
      body: [
        "Two failure modes account for most of the trouble with manual statement imports, and they have opposite causes. A duplicate comes from importing a range that overlaps what is already in the account — the same transaction arrives twice, appears twice on the reconciliation screen, and if both copies are matched the account is overstated. A gap comes from an extraction that dropped a row, and it is the quieter of the two: nothing looks wrong until the statement balance in Xero refuses to agree with the balance printed on the paper.",
        "Overlaps are within your control, and the fix is procedural: look at where the existing data ends before you import. Dropped rows are not within your control at all, because they happen inside the conversion, which is exactly why the arithmetic check sits between the extraction and the download rather than being left to you to perform later.",
      ],
      bullets: [
        "Check the last existing statement line before choosing which statement to convert",
        "Compare the first and last dates in the CSV against the statement period on the PDF",
        "Reconcile the imported net movement against the total credits and debits in our summary",
        "Do all of the above before matching anything, while the lines are still unreconciled",
      ],
    },
  ],
  commonIssues: [
    "A day-first file imported as month-first, scattering one period's transactions across two months without an error",
    "Overlapping import ranges producing duplicate statement lines that must be dealt with individually",
    "A running balance column mapped to an amount field, inventing one transaction per balance figure",
    "Descriptions containing commas in an unquoted file, which shifts the amount into the wrong field",
    "Amounts carrying a currency symbol or a thousands separator, which the import will not read as numbers",
    "A missing transaction discovered only after the period has been reconciled, when unwinding it is a multi-step job",
  ],
  supported: [
    "Current, checking, savings, and business account statements with a dated transaction list",
    "Credit card statements, verified with the previous-balance equation and imported into a card account",
    "Statements printed in currencies that use a comma as the decimal separator",
    "Statements up to 50 pages and 20 MB per conversion",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
  ],
  unsupported: [
    "OFX, QIF, and .qbo files — the outputs here are CSV and XLSX only",
    "Any direct connection to your accounting ledger; the CSV is downloaded and imported by you",
    "Scanned statements with no text layer, as there is no character recognition in this version",
    "Password-protected PDFs, non-PDF files, and documents covering more than one account",
    "Statements without enough printed balance information to verify the extraction",
  ],
  faqs: [
    {
      question: "What is the minimum the import needs from the file?",
      answer:
        "A date and an amount for every line, plus text for the payee or description field. Our CSV supplies more than that on purpose, so the mapping step is about choosing which columns to use rather than editing the file to fit.",
    },
    {
      question: "Should I import the single Amount column or the Debit and Credit pair?",
      answer:
        "Either works, because both are in the file. Use the single signed column if your import is configured for one; use the two positive columns if it expects money in and money out separately. Do not map both at once.",
    },
    {
      question: "I reconciled an imported period and then found a transaction missing. What now?",
      answer:
        "You have to unreconcile the affected lines before the statement data can be corrected, then re-import the period. It is recoverable but slow, and avoiding that situation is the reason the arithmetic check runs before the download.",
    },
    {
      question: "My statement uses a comma as its decimal separator. What arrives in the CSV?",
      answer:
        "A dot-decimal number with no thousands separator. The statement's convention is detected while the document is read and normalised on the way out, so the amount field is unambiguous whatever the source formatting was.",
    },
    {
      question: "Is the Balance column any use to me during the import?",
      answer:
        "Not as an imported field, but it is useful to read. Comparing the last Balance value in the CSV against the closing balance on the PDF is a five-second sanity check that the file covers the whole period you meant to convert.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-quickbooks-csv",
      label: "Bank statement to QuickBooks CSV",
      context:
        "The same file prepared for a different importer, with three- and four-column shapes.",
    },
    {
      href: "/bank-statement-to-google-sheets",
      label: "Bank statement to Google Sheets",
      context: "If you want to inspect or adjust the CSV before it goes anywhere near a ledger.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "How dates are normalised and amounts are signed on the way out of the PDF.",
    },
    {
      href: "/how-it-works",
      label: "How the reconciliation check works",
      context:
        "The extraction and verification steps in order, including the running-balance chain.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Xero Limited, we are not part of any partner or app programme, and nothing described here is provided in cooperation with Xero.",
  futureExpansion: [
    "A checklist for choosing import period boundaries across a full financial year without overlaps",
    "A worked example of reconciling imported net movement against the printed statement totals",
    "Notes on which of our columns suit a payee-led reconciliation versus a reference-led one",
  ],
};
