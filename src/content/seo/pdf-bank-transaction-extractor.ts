import type { SeoPage } from "./types";

export const pdfBankTransactionExtractor: SeoPage = {
  slug: "pdf-bank-transaction-extractor",
  targetQuery: "pdf bank transaction extractor",
  searchIntent:
    "Someone checking whether their particular PDF can be processed at all, and what the limits are, before they spend time on it.",
  title: "PDF Bank Transaction Extractor | Statement Reconcile",
  metaDescription:
    "What can and cannot be extracted from a bank statement PDF: text layers versus scans, why pages are not rows, and the 50-page limit per conversion.",
  eyebrow: "PDF Extraction",
  h1: "PDF Bank Transaction Extractor",
  intro: [
    "Two files can look identical in a PDF reader and be completely different underneath. One holds selectable text with coordinates; the other holds a picture of a page. Only the first can have transactions pulled out of it.",
    "This page explains which is which, what determines how much work a statement is, and where the boundaries of a single conversion pack sit—so you can tell whether your file is a candidate before processing it.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "An .xlsx workbook with the extracted transactions on one sheet and the statement's own figures on a second.",
    "A .csv of the same rows using the seven fixed columns, suitable for scripting or for an import.",
    "A transaction count on the Statement Summary sheet, which is the number worth comparing against the statement rather than the page count.",
    "The reconciliation method, its result, and a generated timestamp stored alongside the data, so a file you reopen in six months still says how it was verified.",
  ],
  reconciliation: {
    heading: "Verifying an extraction you are never going to read",
    body: [
      "Nobody proofreads four hundred rows. Past a page or two, reading the extracted table against the PDF costs more than the extraction saved, so in practice people check the first few lines and trust the rest.",
      "That is why the arithmetic check exists. Instead of sampling, it consumes every extracted row: the debits and credits are totalled and stepped from the opening balance to the closing balance the bank printed. One transaction missing from page nine is enough to break it, which is precisely the property you want from a check on data you will not be reading.",
      "The engine is plain decimal arithmetic in our own code and it runs after the reading is finished. If the figures do not meet, that is what you see instead of a payment step.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Confirm the file has a text layer",
      detail:
        "Open it and try to select a line of the transaction table. If the characters highlight, there is text to extract. If you get one rectangle over the whole page, it is an image.",
    },
    {
      title: "Remove any password",
      detail:
        "An encrypted PDF cannot be opened for reading. Save an unlocked copy from your PDF reader first, then use that copy.",
    },
    {
      title: "Load it and let the text be read",
      detail:
        "The file is parsed in your browser and only the extracted text is sent onward, which is also why a 40-page statement does not mean a 40-page upload.",
    },
    {
      title: "Check the transaction count and the result",
      detail:
        "The preview reports how many rows came out and whether they reconcile with the printed balances, both before payment.",
    },
    {
      title: "Pay once for that statement",
      detail:
        "One payment covers one conversion pack, with one or more statements up to 50 total pages and all output formats.",
    },
  ],
  sections: [
    {
      heading: "A text layer is not the same as a readable page",
      body: [
        "PDFs downloaded from online banking are generated from data, so every figure in them exists as text with a position. That is the ideal case and it is also the common one. Statements that arrived on paper and were scanned, or photographed on a phone and saved as a PDF, contain a bitmap instead: the digits are pixels, and there is no number to read out.",
        "We do not run optical character recognition, and the reason goes beyond effort. OCR guesses characters, and a 3 misread as an 8 in an amount column is a silent error of five units of currency. Since the whole approach here rests on the extracted rows being exactly what the page says, a guessing step at the front would undermine the check at the back. An image-only PDF is therefore refused rather than approximated.",
      ],
      bullets: [
        "Selectable text in the transaction table means the file is a candidate",
        "A single selection rectangle covering the page means it is an image",
        "Some files are mixed, such as a text statement with a scanned insert, and only the text portion can be read",
        "Re-downloading the statement from online banking is usually faster than trying to rescue a scan",
      ],
    },
    {
      heading: "Page count is not row count",
      body: [
        "People ask how long a 30-page statement takes, but pages are a poor proxy for content. A business current account can print forty transactions to a page; a personal savings account might spend four pages showing a monthly interest credit and a lot of white space. The work is in the rows and in how consistent the layout is, not in the number of sheets.",
        "This matters when you are judging whether a result is complete. The honest number to look at is the transaction count on the Statement Summary sheet, compared against the count or the totals your bank printed. If the statement says 212 transactions and the summary says 212, and the balance closes, the extraction accounted for the document. If your bank prints no count, the closing balance is doing that job on its own.",
      ],
    },
    {
      heading: "Which page a row came from",
      body: [
        "The export does not add a page-number column. The CSV has seven fields in a fixed order and stays that way, so that an import mapping keeps working from one statement to the next. What the extractor does instead is preserve document order: rows come out in the sequence they were printed, page after page, with the headings repeated between pages removed.",
        "In practice that is what you need in order to find a row's origin. Scroll to row 148 in the workbook, then read down the PDF, and you arrive at the same transaction, because nothing was reordered and nothing was inserted. If you want a landmark, the page breaks provide them: the figure in the Balance column at that point in the table matches the carried-forward balance the bank printed at the foot of the page.",
      ],
    },
  ],
  commonIssues: [
    "Statements scanned to PDF by an office printer, which look normal on screen and contain no text",
    "Files exported to PDF from a photograph, where even the account number cannot be selected",
    "Encrypted statements that open in a reader once a password is typed but cannot be parsed",
    "Very long documents that go past the 50-page limit for a single conversion",
    "Combined annual documents that staple twelve monthly statements together, leaving no single period to reconcile",
  ],
  supported: [
    "PDFs generated by online banking, which carry a full text layer",
    "Statements of up to 50 pages processed as one document",
    "Files where the transaction table spans many continuation pages",
    "Statements that include pages with no transactions at all, such as notices or an interest rate table",
    "Text-layer PDFs that have been re-saved or printed to PDF again, as long as the text survived",
  ],
  unsupported: [
    "Scanned and photographed statements, which we do not attempt to read with character recognition",
    "Password-protected files that have not been unlocked and re-saved",
    "Documents longer than 50 pages in a single conversion",
    "PDFs containing more than one account, where the rows belong to separate balance chains",
  ],
  faqs: [
    {
      question: "How do I tell whether my PDF has a text layer?",
      answer:
        "Open it and drag the cursor across a line of the transaction table. If individual characters highlight and you can copy them, the text is there. If the whole page turns into one box, the page is an image and there is nothing to read.",
    },
    {
      question: "Why not add character recognition for scanned statements?",
      answer:
        "Because it would introduce guesses at exactly the point where accuracy matters. The output here is only worth having because the rows can be checked against the printed balances, and characters recognised from pixels would turn that check into a comparison between two guesses.",
    },
    {
      question: "What counts towards the 50-page limit?",
      answer:
        "Every page in the file, including cover pages, notices, and blank pages, not only the ones with transactions on them. A longer document cannot be done in one conversion, and splitting it only helps if each part still carries the printed balances the check needs, which is often not true in the middle of a statement.",
    },
    {
      question: "Does a 50-page statement cost more than a two-page one?",
      answer:
        "No. It is one payment for one conversion pack of up to 50 total pages, whether it contains one statement or several and whether it holds ten transactions or a thousand.",
    },
    {
      question: "Is the whole PDF sent to you for processing?",
      answer:
        "No. The document is opened and read in your browser, and only the text extracted from it goes to the parser. That text is not retained once the response has been returned.",
    },
  ],
  related: [
    {
      href: "/bank-statement-transaction-extractor",
      label: "Bank statement transaction extractor",
      context: "How the rows are reconstructed once the text is available to work with.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context: "The same input, aimed at producing the workbook.",
    },
    {
      href: "/pdf-bank-statement-to-csv",
      label: "PDF bank statement to CSV",
      context: "The same input, aimed at producing a plain text file.",
    },
    {
      href: "/faq",
      label: "FAQ",
      context: "Shorter answers on price, limits, and what happens when a check fails.",
    },
  ],
  futureExpansion: [
    "A short diagnostic page for identifying image-only PDFs on Windows, macOS, and mobile",
    "Guidance on splitting oversized documents without breaking the balance chain",
    "Notes on statements that mix a text-layer table with scanned attachments",
  ],
};
