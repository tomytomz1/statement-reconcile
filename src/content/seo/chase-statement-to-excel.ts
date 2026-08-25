import type { SeoPage } from "./types";

export const chaseStatementToExcel: SeoPage = {
  slug: "chase-statement-to-excel",
  targetQuery: "chase statement to excel",
  searchIntent:
    "Someone holding a PDF statement from a Chase account who wants it as a spreadsheet and is trying to establish whether a converter will cope with their particular file.",
  title: "Chase Statement to Excel — PDF Converter | Statement Reconcile",
  metaDescription:
    "Convert an eligible Chase PDF statement to Excel and CSV. We are not affiliated with Chase. The rows must balance the printed totals before billing appears.",
  eyebrow: "Chase statements",
  h1: "Chase Statement to Excel",
  intro: [
    "If you are holding a PDF statement from a Chase account, this converter will attempt to turn it into an Excel workbook and a CSV file. It is a general-purpose statement converter rather than something written against one issuer's template, so the honest answer to “will it work on mine” is that you find out by running it.",
    "That answer arrives before money changes hands. The converter extracts the transaction rows, recomputes the totals from those rows in plain decimal arithmetic, and compares the result with the opening and closing balances printed on your document. You see that comparison, and the extracted rows, before any payment step exists.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "An .xlsx workbook whose Transactions sheet carries an autofilter and a frozen header row, so you can sort by date or filter on a description without the table falling apart.",
    "A Statement Summary sheet in the same workbook listing the statement period, the opening and closing balances, total credits and debits, fees, interest, the transaction count, the reconciliation method that was applied, its result, and the timestamp the file was generated.",
    "A .csv file using a fixed column order — Date, Posted Date, Description, Debit, Credit, Amount, Balance — so an import mapping written once keeps working next month.",
    "All outputs come with the single pack payment. There is no format upsell or separate charge for verification reports.",
  ],
  reconciliation: {
    heading: "The balance check is what stands in for a compatibility list",
    body: [
      "We do not keep a per-bank list of supported layouts, and we are not going to pretend otherwise. Nobody here has audited how JPMorgan Chase Bank, N.A. lays out its statements, and a list of that kind would go stale the first time any issuer adjusted a template. What we have instead is arithmetic.",
      "Once the rows have been extracted, a separate deterministic engine in our own code adds them back up using plain decimal arithmetic and tests the result against the balances the statement printed. The engine sees only numbers. It has no access to the reasoning that produced them, so it cannot be talked into agreeing with a bad extraction.",
      "If the equation closes, the rows are consistent with what was printed and the payment step appears. If it does not close, you are told so, and the payment step is never shown at all.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Download the statement rather than scanning it",
      detail:
        "Save the original PDF from online banking or the mobile app instead of printing a copy and scanning it back in. A downloaded PDF carries a text layer; a scan is a picture of one.",
    },
    {
      title: "Open the file locally",
      detail:
        "Drop the PDF onto the page. It is parsed in your browser using your own machine's memory, and the file itself never leaves it.",
    },
    {
      title: "Let the columns be reconstructed",
      detail:
        "The extractor reads the text layer along with its coordinates and rebuilds the transaction table: dates, descriptions, amounts, direction, and a running balance where one is printed.",
    },
    {
      title: "Read the reconciliation result",
      detail:
        "The summary shows the period it found, the balances, the totals it computed, and whether the equation closed. Scan the sample rows for descriptions that look truncated or run together.",
    },
    {
      title: "Pay once if it checks out",
      detail:
        "The billing screen unlocks the workbook and CSV for a verified pack up to 50 pages. No account, no email, no subscription, nothing to cancel afterwards.",
    },
  ],
  sections: [
    {
      heading: "Where the PDF came from matters more than which bank issued it",
      body: [
        "The largest single determinant of whether a statement converts cleanly is not the institution on the letterhead. It is whether the file contains a text layer.",
        "A PDF saved directly from online banking is generated from data, so every character sits in the file as a character with a position. A PDF produced by printing that statement and running it through a scanner, or photographing it with a phone, contains a photograph of those characters instead. To a converter, the second file is a picture of a wall — visibly a statement to you, and completely opaque to the parser.",
      ],
      bullets: [
        "Try selecting a transaction description in your PDF reader; if the text highlights, there is a text layer",
        "If a text search for an amount you can plainly see on screen finds nothing, you are probably holding a scan",
        "A file with few pages but a size of many megabytes is usually image data",
        "Re-downloading the original from online banking is almost always faster than trying to repair a scan",
      ],
    },
    {
      heading: "What generic extraction actually has to solve",
      body: [
        "A statement page is not a table. PDF stores text positioned at coordinates, and the columns you perceive are an illusion produced by consistent alignment. Rebuilding the table means inferring from those coordinates which runs of text belong to the same row, and which column each one occupies.",
        "The failure modes are quiet ones. A merchant name long enough to wrap can become an extra row with no amount attached. Two transactions posted on the same day can collapse into one if the date is printed only once. A negative rendered as a trailing minus, a leading minus, or a pair of parentheses has to mean the same thing in all three cases. None of these produce an error message. They produce a spreadsheet that looks entirely fine.",
      ],
    },
    {
      heading: "What we can and cannot tell you in advance",
      body: [
        "Some issuers print a running balance beside every line, some print only a period opening and closing balance, and some group activity under headings with subtotals underneath. Those are generic patterns and the converter is built to handle all of them, but we cannot tell you which one your specific document uses without reading it.",
        "So the order of operations is deliberate: it puts the uncertainty on our side of the transaction. Extraction and reconciliation happen first and cost nothing. Convert eligible PDF statements when the format can be extracted and independently reconciled, and let the on-screen result answer the compatibility question. The moment you are asked for money is the moment after you already know.",
      ],
    },
  ],
  commonIssues: [
    "Statements printed to paper and re-scanned, which arrive as images with nothing to extract",
    "PDFs still protected by the password used for delivery, which have to be unlocked in a reader and re-saved first",
    "Combined documents carrying a deposit account and a card account together, which cannot be balanced as one ledger",
    "Year-end and summary documents that report balances and activity totals without listing individual transactions",
    "Files rebuilt by a third-party PDF editor, which sometimes lose the coordinate precision that column reconstruction depends on",
  ],
  supported: [
    "Eligible PDF statements from any institution, when a text layer is present and the printed balances are sufficient to verify the extraction",
    "Deposit-account layouts with a running balance column, and layouts printing only a period opening and closing balance",
    "Separate debit and credit columns, a single signed amount column, or activity grouped under section headings",
    "Statements up to 50 pages in one conversion",
    "Parenthesised negatives, trailing CR and DR markers, and either comma or dot decimal separators",
  ],
  unsupported: [
    "Scanned or image-only PDFs with no text layer",
    "Password-protected PDFs that have not been unlocked",
    "Documents covering more than one account",
    "Statements that do not print enough balancing data for the arithmetic check to mean anything",
  ],
  faqs: [
    {
      question: "Which file should I upload, exactly?",
      answer:
        "The original PDF from the statements or documents area of online banking or the mobile app. Avoid printing to PDF from a screenshot, and avoid scanning a paper copy, because both strip or replace the text layer the converter reads.",
    },
    {
      question: "Is this an official Chase tool?",
      answer:
        "No. Statement Reconcile is built and run independently. We have no relationship with JPMorgan Chase Bank, N.A., and using this converter is not connected to your banking relationship in any way.",
    },
    {
      question: "You say you have not tested statements from this bank. Why would I use it?",
      answer:
        "Because the claim being made is not “it works on your bank” but “you will know before you pay”. The arithmetic check runs against your actual file, its result is displayed on screen, and the paywall is gated on it passing.",
    },
    {
      question: "Does one payment cover every statement for the year?",
      answer:
        "It covers one conversion pack containing one or more statements, up to 50 total pages combined. Each statement is extracted and verified independently, and Excel, CSV, and verification reports are included.",
    },
    {
      question: "What is actually sent to your server?",
      answer:
        "Only the text extracted from the PDF inside your browser. The PDF itself stays on your machine, and the extracted text is discarded once the parsed response has been returned.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "The general version of this page, without a named institution.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context: "More detail on what the parser reads out of a PDF's text layer.",
    },
    {
      href: "/bank-of-america-statement-to-excel",
      label: "Bank of America statement to Excel",
      context: "Covers layouts that split deposits and withdrawals into two columns.",
    },
    {
      href: "/security",
      label: "How your file is handled",
      context: "What stays in the browser, what is sent, and what is kept afterwards.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by JPMorgan Chase Bank, N.A., and we do not act on its behalf.",
  futureExpansion: [
    "A short guide to checking for a text layer in the common PDF readers on Windows and macOS",
    "A written comparison of a statement exported from online banking against the same statement scanned from paper",
    "Notes on what changes in the export when a statement covers a partial period after an account is opened",
  ],
};
