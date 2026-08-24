import type { SeoPage } from "./types";

export const bankStatementToExcel: SeoPage = {
  slug: "bank-statement-to-excel",
  targetQuery: "bank statement to excel",
  searchIntent:
    "Someone who wants the finished spreadsheet, not just the data — a workbook they can filter, sort, and pivot the moment it opens.",
  title: "Bank Statement to Excel (.xlsx) | Statement Reconcile",
  metaDescription:
    "Turn a PDF bank statement into a formatted .xlsx workbook with a filterable transaction sheet and a summary sheet. The totals are checked before you pay $19.",
  eyebrow: "Excel workbook output",
  h1: "Bank statement to Excel",
  intro: [
    "This page is about the workbook you end up with. Converting a bank statement to Excel should not mean receiving a wall of text pasted into column A; it should mean a sheet you can filter on the first click, with the header row already pinned and a second sheet that tells you what period you are looking at.",
    "The arithmetic behind the workbook is settled before you are asked for anything. The extracted rows are added up and measured against the balances printed on your own statement, and you see that result on screen. A payment step only appears if the figures agree.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet holding one row per transaction, with the autofilter already applied so every column has a drop-down from the start.",
    "A frozen header row on that sheet, so the column names stay visible while you scroll through a long period.",
    "A Statement Summary sheet recording the statement period, the opening and closing balances, the totals, any fees and interest, and the transaction count.",
    "The reconciliation method that was applied and its result, written onto the summary sheet alongside the timestamp of when the workbook was generated.",
    "A CSV of the same transactions, in the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, included in the same purchase.",
  ],
  reconciliation: {
    heading: "The summary sheet is a record, not a reassurance",
    body: [
      "Plenty of tools will produce a spreadsheet from a statement. What they rarely tell you is whether the spreadsheet is complete. A workbook with one row quietly missing looks identical to a workbook with every row present, and you will not discover the difference until a total somewhere refuses to agree.",
      "So the totals are recomputed from the extracted rows using ordinary decimal arithmetic in our own code, and compared with the balances the bank printed on the document. The model that reads the page does not get a vote in that comparison, which is the point of doing it separately.",
      "The outcome is written onto the Statement Summary sheet, so months later the workbook still carries evidence of which check was run and what it concluded. If the check does not pass, the paywall never appears and nothing is charged.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Open your statement PDF",
      detail:
        "Select the file from your machine. It is read inside your browser, so the PDF document itself never travels to our server.",
    },
    {
      title: "The transaction table is rebuilt",
      detail:
        "The text layer is read and mapped back into columns: dates, descriptions, money in, money out, and the running balance where the statement prints one.",
    },
    {
      title: "The totals are recomputed and compared",
      detail:
        "Credits and debits are summed from the rows that were found and measured against the opening and closing balances on the document.",
    },
    {
      title: "You see the preview and the verdict",
      detail:
        "The period, the balances, the equation that was used, and the first rows of the table appear together, so you can judge the extraction before spending anything.",
    },
    {
      title: "Pay $19 once and open the workbook",
      detail:
        "The .xlsx and the CSV download together. There is no subscription and no account to create.",
    },
  ],
  sections: [
    {
      heading: "What is on each of the two sheets",
      body: [
        "The Transactions sheet is the working surface. Each row is one transaction, and the columns follow the same order as the CSV so the two files can be used interchangeably. The header row is frozen and the autofilter is switched on before the file reaches you, which removes the two small chores that normally come first when a spreadsheet arrives.",
        "The Statement Summary sheet exists so the workbook can be understood on its own. Six months later, nobody remembers which account or which month a file came from. Having the period, the balances, the totals and the reconciliation outcome sitting on a second tab means the file explains itself without the original PDF next to it.",
      ],
      bullets: [
        "Transactions sheet: one row per transaction, autofilter enabled, header row frozen",
        "Statement Summary sheet: statement period and opening and closing balances",
        "Statement Summary sheet: total debits, total credits, fees, interest, and the transaction count",
        "Statement Summary sheet: which reconciliation method ran, what it returned, and when the file was generated",
      ],
    },
    {
      heading: "Filtering, sorting, and pivoting once it opens",
      body: [
        "With the autofilter in place, narrowing a long period down to the rows you care about is a matter of a drop-down rather than a formula. Filter the description column for a supplier name, sort the debit column high to low to find the largest payments of the month, or restrict the date range to a single week to reconstruct what happened around a particular event.",
        "Because the transactions live on their own sheet with a single header row and no merged cells or repeated page titles in the middle, the range is directly usable as the source for a PivotTable. Grouping by month, summing debits by description, or counting transactions per week all work without cleaning the data first — which is usually the step that consumes the afternoon.",
      ],
    },
    {
      heading: "Why a formatted workbook beats raw extracted text",
      body: [
        "Raw text extraction is not a spreadsheet. It gives you the words that were on the page, in roughly the order they were drawn, and leaves the structural work to you: splitting descriptions from amounts, deciding which figure was a debit, discarding the page footers and the marketing panel the bank printed halfway through.",
        "That manual reconstruction is where errors creep in, and they are invisible once made. A workbook where the column boundaries were decided by the geometry of the page, and then checked against the statement's own totals, starts from a stronger position: the structure has already been tested against something the bank printed rather than against your patience.",
      ],
    },
  ],
  commonIssues: [
    "Descriptions that wrap onto a second line and appear in the workbook as a phantom extra transaction",
    "Repeated page headers and column titles landing in the middle of the transaction range and breaking sorting",
    "Money-in and money-out columns being swapped, which leaves the row count right and every total wrong",
    "Amounts arriving as text rather than figures, so nothing sums and the autofilter offers alphabetical ordering",
    "Statement totals that were carried over from a previous page being counted as transactions in their own right",
  ],
  supported: [
    "Current, checking, and savings statements that print a transaction table",
    "Credit card statements, which are balanced with the previous-balance equation and get the same two-sheet workbook",
    "One or more statements up to 50 total pages per conversion pack",
    "Layouts using two money columns, a single signed column, or amounts grouped beneath section headings",
    "Negatives shown in brackets, CR and DR markers, and comma or dot decimal separators",
  ],
  unsupported: [
    "Image-only PDFs, including photographs of paper statements and scans saved without a text layer",
    "Documents that bundle more than one account together",
    "Password-protected files, which need unlocking in a PDF reader before they can be read",
    "Statements whose printed figures are too sparse for the arithmetic to be checked at all",
  ],
  faqs: [
    {
      question: "Which applications will open the workbook?",
      answer:
        "It is a standard .xlsx file, so Microsoft Excel opens it directly, as do LibreOffice Calc, Apple Numbers, and Google Sheets via an import. Nothing proprietary is required to read it.",
    },
    {
      question: "What exactly is recorded on the Statement Summary sheet?",
      answer:
        "The statement period, the opening and closing balances, total debits and credits, fees, interest, the number of transactions, the reconciliation method that was applied with its result, and the timestamp of when the workbook was generated.",
    },
    {
      question: "Can I edit the workbook and add my own columns?",
      answer:
        "Yes. Once downloaded it is an ordinary spreadsheet file with no link back to us, so you can add category columns, write formulas against the transaction rows, or delete the summary sheet entirely.",
    },
    {
      question: "Do I get the CSV as well, or is that a separate purchase?",
      answer:
        "Both files come with the same $19. The workbook and the CSV describe the same transactions, so you can hand the CSV to another system while keeping the workbook for your own review.",
    },
    {
      question: "Why is the autofilter switched on before I receive the file?",
      answer:
        "Because it is the first thing almost everyone does anyway. Enabling it and freezing the header row up front means the sheet is usable at the moment it opens rather than after two menu clicks.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "The same transactions as a plain text file, if you are feeding another system rather than reading it yourself.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context:
        "More detail on the PDF side: text layers, scans, and how the columns are recovered from the page.",
    },
    {
      href: "/convert-bank-statement-to-excel",
      label: "Convert a bank statement to Excel",
      context:
        "A comparison with retyping, copy-and-paste, and generic converters, if you are still weighing the options.",
    },
    {
      href: "/pricing",
      label: "Pricing",
      context: "What the single $19 payment covers and why there is no subscription.",
    },
  ],
  futureExpansion: [
    "A short guide to building a monthly spend PivotTable from the Transactions sheet",
    "An annotated screenshot walk-through of the Statement Summary sheet field by field",
    "Notes on combining several single-statement workbooks into one multi-period sheet",
  ],
};
