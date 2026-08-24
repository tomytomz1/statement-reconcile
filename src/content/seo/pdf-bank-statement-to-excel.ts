import type { SeoPage } from "./types";

export const pdfBankStatementToExcel: SeoPage = {
  slug: "pdf-bank-statement-to-excel",
  targetQuery: "pdf bank statement to excel",
  searchIntent:
    "Someone whose starting point is the PDF and who has already discovered that opening it in Excel does not work. They want to know what the conversion actually involves and whether their file qualifies.",
  title: "PDF Bank Statement to Excel | Statement Reconcile",
  metaDescription:
    "Why a PDF statement is not a table, how its columns are rebuilt into an Excel sheet, and how the extraction is checked against your printed balances before you pay.",
  eyebrow: "From PDF to spreadsheet",
  h1: "PDF bank statement to Excel",
  intro: [
    "Excel cannot open a PDF as a spreadsheet, and the reason is not an oversight. The two formats disagree about what a document is: one stores values in addressable cells, the other stores marks to be painted on a page. Everything difficult about this conversion follows from that gap.",
    "What happens here is a reconstruction. The characters in the PDF are read with their positions, the columns of the original table are inferred from where those characters sit, and the resulting rows are checked against the balances your bank printed. You see the extraction and the check before there is anything to pay.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "An .xlsx workbook whose Transactions sheet holds the rebuilt table, with the header row frozen and filtering already enabled.",
    "A Statement Summary sheet carrying the statement period, opening and closing balances, totals, fees, interest, the transaction count, and the generation timestamp.",
    "The name of the reconciliation method that was applied and whether it succeeded, recorded in the workbook itself rather than only on screen.",
    "A CSV containing the same rows in the order Date, Posted Date, Description, Debit, Credit, Amount, Balance, for anything that needs to consume the data programmatically.",
  ],
  reconciliation: {
    heading: "Checking a reconstruction against the source",
    body: [
      "Any reconstruction can be wrong, and a reconstruction of a table from page coordinates has plenty of ways to go wrong quietly. A column boundary placed a few points too far left can push the last digit of an amount into the neighbouring field. A footer line can be mistaken for a transaction. Neither leaves a visible mark in the finished sheet.",
      "The defence is to compare the result against a number that came from the bank rather than from the extraction. The rows that were found are summed in plain decimal arithmetic, and that sum is tested against the opening and closing balances printed on the statement. Where the statement supplies more to work with — a running balance on every line, or stated totals for debits and credits — those are used as additional checks on the same rows.",
      "This runs before the paywall exists. If the reconstruction cannot be squared with the printed figures, you are told so and no payment is requested.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Load the PDF in the browser",
      detail:
        "The document is parsed locally on your machine. What leaves the browser is the extracted text, not the file, and it is discarded once the parsing response is returned.",
    },
    {
      title: "Check for an extractable text layer",
      detail:
        "If the pages are images with no characters behind them, there is nothing to recover, and you are told immediately rather than sold a conversion that cannot work.",
    },
    {
      title: "Rebuild the columns",
      detail:
        "Character positions are grouped into columns and lines, so dates, narratives, amounts, and balances land in the fields they occupied on the printed page.",
    },
    {
      title: "Reconcile and preview",
      detail:
        "The recovered rows are added up and compared with the statement's own figures, and the outcome is displayed alongside a sample of the table.",
    },
    {
      title: "Unlock the workbook for $19",
      detail:
        "One conversion pack, one or more statements, up to 50 total pages, all outputs, no account, and no recurring charge.",
    },
  ],
  sections: [
    {
      heading: "A PDF describes a page, not a table",
      body: [
        "Inside a PDF, your statement is a sequence of drawing instructions. A run of characters is placed at one position, another run at a second position, and the visual impression of a column is created by the fact that the two runs happen to be vertically aligned. Nothing in the file records that they belong to the same column, or that a particular figure is a debit rather than a credit.",
        "This is why naive approaches produce disappointing results. Copying text out of a reader gives you the runs in roughly the order they were drawn, which may bear no relation to reading order across a table. Even the spacing you see on screen is often an illusion created by positioning rather than by actual space characters, so splitting on whitespace produces fields that end in the middle of a number.",
      ],
    },
    {
      heading: "Text layer or image: how to tell before you start",
      body: [
        "The single most useful thing you can establish about your file is whether it contains real text. Statements downloaded from an online banking portal almost always do, because they were generated digitally. Statements that arrived in the post and were later put through a scanner or photographed on a phone almost always do not.",
        "You can settle the question in a few seconds without any special tools. If the answer is that there is no text, the file needs to go through optical character recognition before any converter can help, and OCR introduces its own uncertainty about digits — which is exactly the kind of uncertainty a balance check exists to expose.",
      ],
      bullets: [
        "Open the PDF in any reader and try to select a line of the transaction table with the cursor",
        "If the text highlights word by word, there is a text layer and the file can be read",
        "If the selection behaves like a rectangle drawn over a picture, the page is an image",
        "Searching the document for a merchant name you can see on screen is an equally quick test",
        "A file that was exported or printed to PDF from a browser or banking app normally keeps its text intact",
      ],
    },
    {
      heading: "Recovering the columns from the page geometry",
      body: [
        "Rebuilding the table means working out where the column boundaries were. Amounts are typically right-aligned, dates occupy a narrow band on the left, and the description is whatever sits between them, so the horizontal positions of the characters carry most of the information needed to reassemble a row.",
        "The complications are the parts of the page that are not the table. Statements interleave the transaction list with page headers, carried-forward subtotals, promotional panels, and legal small print, all of which sit in the same coordinate space as the rows you want. Distinguishing a subtotal line that repeats a running figure from a transaction that genuinely moved money is one of the places where an extraction most often goes astray, and one of the reasons the arithmetic check is worth running afterwards.",
      ],
    },
    {
      heading: "Page counts and long statements",
      body: [
        "One conversion covers one or more statements up to 50 total pages combined. Each statement is verified as a complete file: its closing balance can only be tested against its opening balance if every page in between has been read.",
        "That is also why splitting a long statement into smaller PDFs tends to be counterproductive. The printed opening and closing balances describe the full period, so a fragment usually has no pair of figures that bracket its own rows, and the check that makes the export trustworthy has nothing to work with.",
      ],
    },
  ],
  commonIssues: [
    "Pages that look like text on screen but are actually images produced by a scanner",
    "Amounts split across two fields because a column boundary was placed inside the number",
    "Carried-forward and brought-forward lines being counted as if they were transactions",
    "Marketing inserts and terms-and-conditions pages interrupting the transaction table midway through the document",
    "Statements exported at an unusual page size or rotation, where the column bands sit where they are not expected",
  ],
  supported: [
    "Digitally generated PDFs downloaded from an online banking portal or emailed by the bank",
    "Documents where the transaction table continues across many pages with repeated column headings",
    "Statements up to 50 pages, covering a single account for a single period",
    "Both landscape and portrait layouts, and tables with or without a running balance column",
    "Statements where the transaction list is broken up by section headings such as payments and deposits",
  ],
  unsupported: [
    "Image-only PDFs with no character data behind the page, including phone photographs of paper",
    "Documents locked with an open password until they have been unlocked and re-saved",
    "PDFs holding several accounts, where no single pair of balances describes all the rows",
    "Statements longer than 50 pages in one file",
  ],
  faqs: [
    {
      question: "How do I check whether my PDF has a text layer?",
      answer:
        "Open it in any reader and try to select a transaction line, or use the search box to look for a merchant name you can see on the page. If selection and search work, the text is there. If neither does, the page is a picture.",
    },
    {
      question: "My statement is longer than 50 pages. What are my options?",
      answer:
        "A single conversion covers up to 50 pages. Splitting the file is usually not a workaround, because the opening and closing balances printed on the statement describe the whole period, so a fragment cannot be verified on its own. Requesting a shorter statement period from your bank is generally the more reliable route.",
    },
    {
      question: "My statement is a scan. Can I run OCR on it first?",
      answer:
        "You can, and once the file has a text layer it can be read like any other. Be aware that OCR can misread digits, which is one of the situations the arithmetic check is most likely to catch — and if it does not balance, you will not be charged.",
    },
    {
      question: "The PDF asks for a password. Will it convert?",
      answer:
        "Not while it is protected. Open it in a PDF reader with the password, save an unlocked copy, and convert that. We do not attempt to bypass document protection.",
    },
    {
      question: "What happens to a description that wraps onto a second line?",
      answer:
        "The continuation is treated as part of the transaction above it rather than as a new row. Getting this wrong inflates the transaction count, which is one of the discrepancies the balance comparison is designed to surface.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "Focuses on the finished workbook: what is on each sheet and how to work with it.",
    },
    {
      href: "/pdf-bank-statement-to-csv",
      label: "PDF bank statement to CSV",
      context: "The same PDF, exported as plain text with normalised dates and signed amounts.",
    },
    {
      href: "/convert-pdf-transactions-to-excel",
      label: "Convert PDF transactions to Excel",
      context:
        "Written around the transaction rows themselves rather than the statement as a document.",
    },
    {
      href: "/how-it-works",
      label: "How it works",
      context: "The extraction and verification sequence set out step by step.",
    },
  ],
  futureExpansion: [
    "A diagnostic page for identifying scanned statements and choosing an OCR route",
    "An illustrated explanation of column-band detection using an anonymised layout",
    "Guidance on requesting shorter statement periods from a bank when a document exceeds the page limit",
  ],
};
