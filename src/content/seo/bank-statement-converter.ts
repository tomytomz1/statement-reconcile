import type { SeoPage } from "./types";

export const bankStatementConverter: SeoPage = {
  slug: "bank-statement-converter",
  targetQuery: "bank statement converter",
  searchIntent:
    "Broad category search from someone who has a PDF statement and wants a tool that turns it into a spreadsheet.",
  title: "Bank Statement Converter to Excel & CSV | Statement Reconcile",
  metaDescription:
    "Convert a PDF bank statement into Excel and CSV. Preview the extracted transactions and check that the statement balances before paying $19. No account needed.",
  eyebrow: "Bank Statement Converter",
  h1: "Bank Statement Converter",
  intro: [
    "Upload a PDF bank statement and get back a clean transaction table as both an Excel workbook and a CSV file.",
    "Before you are asked to pay, the converter adds up every row it extracted and checks the total against the balances printed on your statement. If the numbers do not agree, there is no charge.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A CSV file with one row per transaction and a fixed column order: Date, Posted Date, Description, Debit, Credit, Amount, Balance.",
    "An Excel workbook with the same transactions on a filterable sheet with a frozen header row.",
    "A second sheet in the workbook recording the statement period, the balances, the totals, and which reconciliation check was used.",
  ],
  reconciliation: {
    heading: "What makes this different from a plain converter",
    body: [
      "Most converters hand you a spreadsheet and leave you to find out whether anything went missing. A dropped row or a misread decimal point looks exactly like a correct export until you try to use it.",
      "This converter recomputes the arithmetic from the rows it extracted and compares the result with the opening and closing balances your bank printed. That check is done by ordinary decimal arithmetic in our own code, not by the model that read the page, so it cannot be talked into agreeing.",
      "You see the result of that check on screen, with the numbers, before the payment step appears.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Choose your PDF statement",
      detail:
        "Drag the file onto the page or pick it with the file browser. The file is read in your browser; the PDF itself is never uploaded.",
    },
    {
      title: "The transactions are extracted",
      detail:
        "The converter reads the text layer of the PDF, works out which column holds dates, descriptions, debits, credits, and balances, and builds a transaction table.",
    },
    {
      title: "The arithmetic is checked",
      detail:
        "Every extracted row is added up and compared with the balances and any subtotals printed on the statement.",
    },
    {
      title: "You review the preview",
      detail:
        "The statement period, currency, totals, the equation that was used, and the first rows of the table are shown to you.",
    },
    {
      title: "Pay once and download",
      detail:
        "If the check passed, unlock the files for $19. Both the Excel workbook and the CSV are included in that price.",
    },
  ],
  sections: [
    {
      heading: "What a bank statement converter has to get right",
      body: [
        "A statement is a table that has been flattened into a page description. There are no cells and no column headers in the file itself — only text placed at coordinates. Converting it back into a table means reconstructing the columns from those positions.",
        "That is where converters go wrong. A description that runs long and wraps onto a second line can be read as an extra transaction. A debit column and a credit column can be swapped. A date printed as 03/04 can be read as either the third of April or the fourth of March. None of these mistakes look like mistakes in the resulting spreadsheet.",
      ],
      bullets: [
        "Column positions must be recovered, not guessed from word order",
        "Wrapped descriptions must rejoin the row they belong to",
        "Day and month order has to be established from the document, not assumed",
        "Amounts must stay exact — no floating-point arithmetic anywhere",
      ],
    },
    {
      heading: "Why the balance check is the part that matters",
      body: [
        "The reason to check the arithmetic is that it catches the whole class of extraction errors at once. If a row was dropped, the total no longer matches. If an amount was misread, the total no longer matches. If a row was read twice, the total no longer matches.",
        "This is why we do not ask for payment first. A converter that charges before it knows whether the output is correct is selling you the risk, not the result.",
      ],
    },
    {
      heading: "Statements the converter can read",
      body: [
        "The converter works from the text layer of a PDF. Statements downloaded from online banking almost always have one. Statements that were scanned from paper do not: they are images of text, and there is nothing to extract.",
        "If we cannot find a text layer, or we can read the page but cannot make the numbers balance, we say so and do not take a payment.",
      ],
    },
  ],
  commonIssues: [
    "Statements saved as scans or photographs, which contain no extractable text",
    "Password-protected PDFs, which have to be unlocked in a PDF reader first",
    "Documents that bundle several accounts into one file, which cannot be balanced as a single statement",
    "Summary-only statements that list balances but no individual transactions",
  ],
  supported: [
    "Checking, current, and savings statements with a transaction table",
    "Credit card statements with a previous balance and a new balance",
    "One or more statements up to 50 total pages in a single conversion pack",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
    "Running balance columns, parenthesised negatives, CR and DR markers, and comma or dot decimal separators",
  ],
  unsupported: [
    "Scanned or photographed statements with no text layer",
    "Files that are not PDFs",
    "Documents containing more than one account",
    "Statements where the printed balances and subtotals are not enough to verify the extraction",
  ],
  faqs: [
    {
      question: "Do I need an account to use the converter?",
      answer:
        "No. There is no sign-up, no password, and no email required. You upload a file, review the preview, and pay once if you want the download.",
    },
    {
      question: "Does my statement get uploaded to your server?",
      answer:
        "The PDF itself does not. It is opened and read inside your browser. Only the extracted text is sent for parsing, and it is not stored after the response is returned.",
    },
    {
      question: "What happens if the converter cannot balance my statement?",
      answer:
        "You are told that the statement could not be verified, and the payment step never appears. There is nothing to refund because nothing is charged.",
    },
    {
      question: "Is $19 per statement or per month?",
      answer:
        "Neither. It is one $19 payment per conversion pack, with one or more statements and up to 50 total pages combined. There is no subscription, and Excel, CSV, and verification reports are included.",
    },
    {
      question: "Can I convert several statements?",
      answer:
        "Yes. Add multiple statements to one conversion pack, up to 50 total pages. Each file is verified independently, and only files you explicitly keep are included in the paid pack.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "If you specifically want the .xlsx workbook with a filterable transaction sheet.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "If you are importing into accounting software that expects a plain CSV.",
    },
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context: "Credit card statements balance differently; this page explains the equation used.",
    },
    {
      href: "/how-it-works",
      label: "How the reconciliation check works",
      context: "A walk-through of the extraction and verification steps in order.",
    },
  ],
  futureExpansion: [
    "A worked example gallery showing anonymised layouts and which reconciliation method applied to each",
    "A page comparing single-signed-amount layouts with separate debit and credit columns",
    "Guidance on importing the CSV into common accounting packages",
  ],
};
