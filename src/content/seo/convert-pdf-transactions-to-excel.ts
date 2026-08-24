import type { SeoPage } from "./types";

export const convertPdfTransactionsToExcel: SeoPage = {
  slug: "convert-pdf-transactions-to-excel",
  targetQuery: "convert pdf transactions to excel",
  searchIntent:
    "Someone with a long statement — a quarter, a year, hundreds of rows spread over many pages — who wants it as one workbook they can rely on.",
  title: "Convert PDF Transactions to Excel | Statement Reconcile",
  metaDescription:
    "Convert a long multi-page PDF statement into one Excel workbook. Continuation pages are joined, order is kept, and the whole period is checked at once.",
  eyebrow: "PDF to Excel",
  h1: "Convert PDF Transactions to Excel",
  intro: [
    "Short statements are easy to check by eye. The ones that cause trouble are the long ones: a quarter of a busy current account, a year of activity, forty pages where the transaction table starts on page two and simply keeps going.",
    "This converter treats the whole document as a single table rather than a stack of pages, joins the continuation pages back together in the order they were printed, and settles the arithmetic for the entire period in one check before you are asked to pay anything.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "One Transactions sheet holding every row from every page, with the header frozen and an autofilter applied, so a thousand-row table remains navigable.",
    "A Statement Summary sheet giving the period start and end, the opening and closing balances, total debits and credits, fees, interest, the number of transactions, the reconciliation method and result, and a generated timestamp.",
    "Rows in printed order across page boundaries, with per-page headings, footers, and carried-forward markers left out of the table.",
    "A CSV of the same rows in the fixed seven-column order, included with the same purchase.",
  ],
  reconciliation: {
    heading: "One check for the whole period",
    body: [
      "The tempting way to verify a long statement is page by page: confirm that each page's carried-forward figure matches the next page's brought-forward figure and call it done. That catches a page dropped from the middle and misses a transaction dropped from inside a page, because those two figures were printed by the bank and agree with each other regardless of what anyone read between them.",
      "So the check is run over the extracted rows instead. Every debit and credit from the first page to the last is totalled, and that total has to carry the opening balance to the closing balance. Where a running balance is printed on each line, the chain is followed row to row as well, which points at the page and the transaction where a discrepancy begins rather than only declaring the total wrong.",
      "The comparison is decimal arithmetic in our own code, performed after the pages have been read, and the outcome is shown with its figures on screen. A long statement that will not close never reaches a payment step.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Select the full document",
      detail:
        "Use the complete statement rather than a page range. The opening and closing balances usually sit at opposite ends of the file and both are needed.",
    },
    {
      title: "Pages are read and stitched together",
      detail:
        "Each page's text layer is parsed, the repeated column headings and page furniture are dropped, and the rows are appended in printed order.",
    },
    {
      title: "The period is assembled",
      detail:
        "Dates are normalised to ISO form and the statement period is read from the document, so a statement spanning a year end does not fold one January in with the wrong year.",
    },
    {
      title: "The whole period is reconciled",
      detail:
        "Totals across every page are compared with the printed balances and any stated subtotals, and the running balance chain is walked if the statement has one.",
    },
    {
      title: "Review and download the workbook",
      detail:
        "The summary, the row count, and the check result come first; $19 then unlocks the .xlsx and the .csv for that statement.",
    },
  ],
  sections: [
    {
      heading: "What a continuation page does to a table",
      body: [
        "A statement of any length is paginated for print, and every new page brings its own furniture: the bank's header, the account line, the column titles again, a page number, and often a brought-forward balance at the top with a carried-forward balance at the bottom. To the page these are structure. To a table they are five rows of noise every forty rows.",
        "Removing them is only half the job. Those brought-forward and carried-forward figures are not transactions, but they are useful, because they are the bank's own statement of where the balance stood at that point. So they leave the table and stay in the check, where they confirm that the rows in between add up locally as well as across the whole document.",
      ],
    },
    {
      heading: "Order, and why it is not cosmetic",
      body: [
        "In a long statement, several transactions frequently share a date: card payments settled overnight, three direct debits on the first of the month, a transfer in followed immediately by a transfer out. The printed order of those rows is the order in which the bank applied them, and it is the reason the running balance moves the way it does.",
        "If a converter sorts by date on the way out, that order is lost and the balance column stops being a chain. The individual figures are still correct but they no longer follow one another, which makes the statement impossible to walk. The workbook therefore keeps the printed sequence exactly as it was. If you want a different arrangement, apply it yourself once you have confirmed the chain, ideally on a copy of the sheet.",
      ],
      bullets: [
        "Same-day transactions stay in the sequence the bank applied them in",
        "Rows continue across page breaks without a gap or a repeated heading",
        "The Balance column reads as a continuous chain from the first row to the last",
        "Dates are ISO formatted, so sorting later still behaves correctly when you choose to do it",
      ],
    },
    {
      heading: "Long periods, quarters, and statements that cross a year end",
      body: [
        "Quarterly and annual documents introduce a problem that monthly ones do not: two-digit years, dates printed with no year at all, and a period that spans a January. A statement showing 28/12 and then 04/01 is not travelling backwards in time, and a converter that assumes one calendar year for the whole file produces a table that sorts into nonsense.",
        "The day and month order and the period boundaries are read from the document itself — from the statement period line and from the sequence of the rows — rather than assumed from a locale. Dates are then written as full ISO values with the correct year, which is what makes a twelve-month workbook usable in a pivot table grouped by month.",
        "There is a practical ceiling of 50 total pages in one conversion pack. Within that, a longer pack costs the same as a short one; the price is not per page or row.",
      ],
    },
  ],
  commonIssues: [
    "Column headings from every continuation page appearing as data rows in the middle of the table",
    "Brought-forward and carried-forward lines counted as transactions, inflating both the row count and the totals",
    "Rows silently reordered by date, which breaks the running balance chain wherever transactions share a day",
    "Two-digit or year-less dates resolved to the wrong year across a December to January boundary",
    "The last page of a long statement missed altogether, leaving a table that looks complete and stops short",
  ],
  supported: [
    "Statements up to 50 pages, whether that is one busy month or a full quarter",
    "Transaction tables that begin partway down the first page and continue to the last",
    "Documents with non-transaction pages mixed in, such as notices or rate tables",
    "Statements printing a running balance on each line, and statements printing only period totals",
    "Sectioned statements whose sections carry their own subtotals, checked against the rows beneath them",
  ],
  unsupported: [
    "Documents over 50 pages in a single conversion",
    "Image-only or scanned pages, which contribute nothing that can be extracted",
    "Files combining several accounts, where the rows do not form one chain",
    "Password-protected PDFs, which have to be unlocked before they can be read",
  ],
  faqs: [
    {
      question: "My transaction table starts on page 3. Does that matter?",
      answer:
        "No. The table is found wherever it begins and followed to wherever it ends. Cover pages, notices, and inserts are simply pages with no transactions on them, and they are read and passed over.",
    },
    {
      question: "Will the workbook keep the rows in statement order or sort them?",
      answer:
        "Statement order, exactly as printed, including transactions that share a date. Sorting is left to you, because reordering breaks the running balance chain and that chain is what makes a long statement checkable.",
    },
    {
      question: "Is a quarterly statement one conversion or three?",
      answer:
        "One, provided it is a single document with one opening and one closing balance and no more than 50 pages. It is $19 for that statement no matter how many months it covers.",
    },
    {
      question: "What if only part of a long statement reconciles?",
      answer:
        "Then the check has failed and you are shown that with the figures. There is no partial download and no partial charge: a table that is right for eight pages out of ten is not something we can sell you without knowing which two.",
    },
    {
      question: "Can I convert one page range instead of the whole file?",
      answer:
        "It is better not to. The opening and closing balances usually sit at opposite ends of the document, and without both of them the reconciliation has nothing to compare the extracted rows against.",
    },
  ],
  related: [
    {
      href: "/convert-pdf-transactions-to-csv",
      label: "Convert PDF transactions to CSV",
      context: "For a plain text file that a script or an importer can read without cleanup.",
    },
    {
      href: "/convert-bank-statement-to-excel",
      label: "Convert bank statement to Excel",
      context: "The same conversion framed around a bank statement specifically.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context: "Another route to the workbook, starting from the PDF side of the question.",
    },
    {
      href: "/pricing",
      label: "Pricing",
      context: "How the single $19 charge relates to statement length and page count.",
    },
  ],
  futureExpansion: [
    "A worked walk-through of a twelve-month statement and the checks that applied to it",
    "Notes on pivot table layouts that work well with the Transactions sheet",
    "An explanation of subtotal checks on statements grouped by transaction type",
  ],
};
