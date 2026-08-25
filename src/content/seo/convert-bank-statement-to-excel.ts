import type { SeoPage } from "./types";

export const convertBankStatementToExcel: SeoPage = {
  slug: "convert-bank-statement-to-excel",
  targetQuery: "convert bank statement to excel",
  searchIntent:
    "Someone with a job to do and several ways to do it, weighing up retyping, copy-and-paste, and paid tools before committing an afternoon or a card payment.",
  title: "Convert Bank Statement to Excel | Statement Reconcile",
  metaDescription:
    "Retype it, paste it, or convert it? A candid comparison of the ways to get a PDF statement into Excel, and what a verified export changes about the decision.",
  eyebrow: "Choosing a method",
  h1: "Convert a bank statement to Excel",
  intro: [
    "There are only three realistic ways to move a statement from a PDF into a spreadsheet: type it out, paste it out, or run it through something that does the job for you. All three end with a sheet of numbers, and from the outside those sheets look equally trustworthy.",
    "The difference is in what you know about them afterwards. This page sets out where each approach tends to break, and what changes when the export arrives with its arithmetic already tested against the balances printed on the statement.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "An Excel workbook with the transactions on their own sheet, filterable from the moment it opens and with the header row held in place.",
    "A summary sheet stating the period covered, the opening and closing balances, the totals, fees and interest, and how many transactions were found.",
    "The reconciliation method used and the result it produced, recorded in the file so the workbook remains self-explanatory later.",
    "A CSV of the same rows for anything that needs to import the data rather than read it.",
  ],
  reconciliation: {
    heading: "The part that changes the calculation",
    body: [
      "Whichever method you choose, the real cost is not the time spent producing the spreadsheet. It is the time spent afterwards satisfying yourself that the spreadsheet is right, and the much larger cost of discovering months later that it was not.",
      "That check is mechanical, so it can be done for you. The rows that were extracted are added together with plain decimal arithmetic and compared against the balances your bank printed. If the statement supplies more to work with — a running balance beside each line, or stated totals for the period — those give a second angle on the same rows.",
      "You see the result before you see the charge. If the totals do not reconcile, the payment step never appears, so the decision you are making is whether the verified export is useful—not whether this particular file will work.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Bring the statement in",
      detail:
        "Choose the PDF. It opens inside your browser, and the document never leaves your machine — only the text pulled out of it is sent for parsing.",
    },
    {
      title: "Let the table be rebuilt",
      detail:
        "The transaction rows are separated from headings, subtotals, and page furniture, and reassembled into columns.",
    },
    {
      title: "Read the verdict, not just the data",
      detail:
        "The totals recomputed from those rows are compared with the statement's own balances, and the comparison is put in front of you with the figures.",
    },
    {
      title: "Sanity-check the preview yourself",
      detail:
        "The period, the currency, the balances, and the first transactions are all visible, which is usually enough to recognise your own statement.",
    },
    {
      title: "Decide, then pay once",
      detail:
        "If it looks right and it balanced, the billing screen unlocks the workbook and CSV. If it did not balance, there is nothing to decline because nothing is offered.",
    },
  ],
  sections: [
    {
      heading: "The three ways this usually gets done",
      body: [
        "Almost everyone arrives at this problem having already tried one of a small number of approaches. Each is reasonable, each works some of the time, and each has a characteristic way of going wrong that is worth recognising before you commit an afternoon to it.",
        "The important variable is not speed. It is whether the method leaves you with any way of knowing that the result is complete, because none of the manual options produce a signal when something has gone missing.",
      ],
      bullets: [
        "Retyping from the PDF into a blank sheet — slow, and vulnerable to transposed digits that look perfectly plausible",
        "Selecting the text in a reader and pasting it in — fast, but the structure of the table rarely survives the trip",
        "A generic PDF-to-table converter — often produces something usable, but tells you nothing about whether it captured everything",
        "Asking the bank for a CSV directly — genuinely the best option when it is available, though many portals only offer a limited window of history",
      ],
    },
    {
      heading: "Where each approach comes apart",
      body: [
        "Retyping fails on attention rather than on skill. Two hundred rows of four-figure amounts is exactly the kind of task where a 1,240.50 becomes a 1,204.50 without any sensation of having made a mistake, and the resulting sheet is internally consistent, correctly formatted, and wrong. Worse, the error is unfindable without redoing the work.",
        "Pasting fails on structure. What the reader hands to the clipboard is text in something close to the order it was drawn on the page, so descriptions, amounts and balances arrive interleaved in a single column, and the alignment you could see on screen turns out to have been produced by positioning rather than by any character you can split on. Generic converters fail differently again: they usually get the shape right and then leave you with no way to tell whether row 87 exists. Their output is confident regardless of whether it is complete.",
      ],
    },
    {
      heading: "What verification changes about the decision",
      body: [
        "Once the arithmetic has been checked against the statement's own figures, the question of whether the export is complete has been answered by something other than your own inspection. A missing row moves the total. A misread digit moves the total. A row counted twice moves the total. All of those failures collapse into one visible signal instead of being spread across two hundred lines you would have to read.",
        "That does not make the tool infallible, and it is not a claim that the statement itself is genuine—the check concerns extraction evidence and arithmetic. What it does is remove the specific worry that made the manual methods expensive: the second pass. If you were going to spot-check fifty rows against the PDF anyway, that is the work the source-linked comparison replaces.",
      ],
    },
  ],
  commonIssues: [
    "Transposed digits introduced while typing, which produce a plausible figure in the wrong place",
    "Pasted text landing in one column with amounts and descriptions run together",
    "Converters that silently drop the final page of a statement, where the closing balance lives",
    "Spreadsheets built from a paste where some amounts became text and quietly dropped out of every SUM",
    "Bank portals that only export a recent window of history, leaving older periods available as PDFs alone",
  ],
  supported: [
    "Monthly and quarterly statements for current, checking, and savings accounts",
    "Credit card statements, which are balanced on the previous-balance equation instead",
    "Business account statements with a high transaction count, within the 50-page limit",
    "Statements in a range of currencies and decimal conventions",
    "Layouts where deposits and withdrawals are listed under separate headings rather than in two columns",
  ],
  unsupported: [
    "Statements that exist only as scans or photographs with no underlying text",
    "PDFs that still require a password to open",
    "Combined documents covering several accounts in one file",
    "Statements that do not print enough figures for the extraction to be verified against",
  ],
  faqs: [
    {
      question: "Is a paid conversion sensible when I could retype the statement myself?",
      answer:
        "That depends on how long your statement is and what your time is worth. For a page or two, typing is perfectly rational. For a busy month, the comparison is between a one-time pack payment and transcription followed by a second pass checking it.",
    },
    {
      question: "Why does copying from a PDF reader produce a single messy column?",
      answer:
        "Because the reader gives you the text in roughly the order it was drawn on the page, not in the order a table would need. The visual alignment of the columns comes from where each fragment was positioned, and that positioning is not something the clipboard carries.",
    },
    {
      question: "Excel can import PDFs already. Why use anything else?",
      answer:
        "Its table detection does work on some documents, and if it handles yours, use it. Results vary considerably with layout, particularly where descriptions wrap or the table is interrupted by subtotals, and either way nothing in that route compares the imported rows against the balances on the statement.",
    },
    {
      question: "I only need a handful of transactions from one page. Should I still use this?",
      answer:
        "Probably not for only three or four rows; typing may be quicker. The paid pack is for whole statements where completeness and verification matter.",
    },
    {
      question: "Can I compare the result against my own records before paying?",
      answer:
        "Yes. The preview shows the statement period, the balances, the totals, and the beginning of the transaction table, so you can recognise your own account and see the figures before deciding whether to unlock the download.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "If you have already decided and simply want to know what the workbook contains.",
    },
    {
      href: "/convert-bank-statement-to-csv",
      label: "Convert a bank statement to CSV",
      context:
        "The same decision framed around bookkeeping software rather than a spreadsheet you read yourself.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context:
        "Why the PDF format makes this harder than it looks, and which files can be read at all.",
    },
    {
      href: "/faq",
      label: "Frequently asked questions",
      context: "Pricing, privacy, and the practicalities in one place.",
    },
  ],
  futureExpansion: [
    "A time-and-error comparison of transcription against verified extraction on a sample statement",
    "A guide to exporting transactions directly from common banking portals where that option exists",
    "An explanation of why spot-checking a sample of rows does not detect a dropped transaction",
  ],
};
