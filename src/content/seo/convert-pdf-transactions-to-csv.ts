import type { SeoPage } from "./types";

export const convertPdfTransactionsToCsv: SeoPage = {
  slug: "convert-pdf-transactions-to-csv",
  targetQuery: "convert pdf transactions to csv",
  searchIntent:
    "A developer, analyst, or bookkeeper who will feed the file to another program and needs the values to parse without a cleanup pass first.",
  title: "Convert PDF Transactions to CSV | Statement Reconcile",
  metaDescription:
    "Convert PDF statement transactions to a clean CSV: ISO dates, exact decimal amounts, CR and DR markers resolved, and UTF-8 descriptions.",
  eyebrow: "PDF to CSV",
  h1: "Convert PDF Transactions to CSV",
  intro: [
    "The hard part of a CSV is never the commas. It is that a statement prints numbers and dates for people to read, and the conventions that make them readable — a thousands separator, a trailing CR, a figure in brackets standing in for a minus sign — are exactly what makes a parser fail or, worse, quietly agree to something wrong.",
    "This converter resolves those conventions while it reads the page and writes values that mean one thing only. It then re-derives the closing balance from the rows, so you know the file is complete before you import it anywhere.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A single UTF-8 CSV with one header row, comma-delimited, and quoting applied only where a field needs it.",
    "Fixed columns in a fixed order: Date, Posted Date, Description, Debit, Credit, Amount, Balance.",
    "Numeric fields written as bare decimals — no currency symbol, no thousands separator, no brackets, no trailing marker — so they cast to a number without pre-processing.",
    "Dates in every date field written as YYYY-MM-DD, zero-padded, with no locale ambiguity left in them.",
    "An Excel workbook of the same rows with a summary sheet, included with the purchase, for when you need to look at the data rather than load it.",
  ],
  reconciliation: {
    heading: "Clean values are not the same as complete data",
    body: [
      "A well-formed CSV can still be wrong. Every field can parse, every date can be valid, every amount can be a tidy decimal, and one transaction can be missing — and nothing in the file will tell you. Format checks cannot find that. Only arithmetic can.",
      "So once the values are normalised, the rows are totalled and run against the balances the statement printed. If the debits and credits carry the opening figure to the closing figure, every line that moved the balance is present in the file. Where the statement also gives stated totals or a per-line running balance, those provide a second and third angle on the same question.",
      "This runs as decimal arithmetic in our code, separate from whatever read the page, and its outcome is on screen before the payment step. A file that will not balance is not offered for sale.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Read the statement in the browser",
      detail:
        "The PDF is parsed locally and only its text is sent onward for structuring, so the document itself never reaches a server.",
    },
    {
      title: "Normalise the numbers",
      detail:
        "Separators, symbols, brackets, and CR or DR markers are resolved into signed decimal values as each amount is read, using the convention the document is actually using.",
    },
    {
      title: "Normalise the dates",
      detail:
        "The day and month order is established from the document, and every date is rewritten as an ISO value with a four-digit year.",
    },
    {
      title: "Balance the rows",
      detail:
        "The normalised amounts are summed and checked against the printed balances and subtotals, and the result is shown to you with the numbers.",
    },
    {
      title: "Take the CSV",
      detail:
        "One payment for the verified pack releases the CSV and workbook. No account, no subscription, nothing to cancel.",
    },
  ],
  sections: [
    {
      heading: "Numbers as printed, and numbers as data",
      body: [
        "A statement might print 1,234.56 or 1.234,56 for the same amount, and both are correct in their own convention. It might show a debit as (85.00), or as 85.00 DR, or as -85.00, or as a bare 85.00 that is only negative because of the column it sits in. Hand any of those to a parser unchanged and you get a string, a wrong sign, or an exception.",
        "Every one of them is resolved during extraction instead of being left for you. The decimal separator is determined from the document as a whole rather than value by value, so a statement using a comma decimal is not misread on the one line where the figure happens to be under a thousand. Amounts are then carried as exact decimals through the whole pipeline, and the reconciliation totals are computed the same way, never in floating point, so there is no binary rounding drift between what you see and what was checked.",
      ],
      bullets: [
        "Thousands separators removed, and decimal separators reduced to a dot",
        "Parenthesised amounts converted into a negative value in the signed Amount column",
        "CR and DR markers consumed and expressed as direction rather than left inside the field",
        "Currency symbols and non-breaking spaces stripped out of numeric fields",
        "No scientific notation, and no rounding beyond the precision the statement printed",
      ],
    },
    {
      heading: "Dates that sort, and dates that lie",
      body: [
        "03/04/2025 is the third of April in most of the world and the fourth of March in the United States, and a statement rarely says which it means. Guessing from one row is a coin flip; the tell is in the set. A column with 13, 17, and 28 in the first position cannot be holding months, and a period line reading from 1 March to 31 March settles the question outright.",
        "Once the order is known, every date is written as YYYY-MM-DD. That format sorts correctly as plain text, which means a script that never parses dates at all still receives them in order, and it is unambiguous to every database and importer without a format string. Where the statement prints both a transaction date and a posting date, both columns are filled; where it prints one, Posted Date is left empty rather than duplicated, so you can tell a known posting date from an assumed one.",
      ],
    },
    {
      heading: "Text fields that survive the trip",
      body: [
        "Descriptions are the messiest column in any statement. They contain commas, apostrophes, accented merchant names, occasionally a currency symbol or a fragment of a web address, and on some layouts they are broken across lines by the PDF's own wrapping.",
        "The file is written as UTF-8, so an accented or umlauted merchant name arrives as the bank printed it rather than as mojibake, and fields containing a comma or a quote are quoted and escaped in the ordinary CSV manner, so a standard reader handles them with no special configuration. Wrapped descriptions are rejoined before the file is written, which means a description is one field and not a row plus a fragment.",
        "One thing we do not do is tidy the text itself. Merchant strings are exported as the bank printed them, reference numbers and terminal codes included, because those are often the part your categorisation rules key on. Cleaning them up is a decision about your data, and it is yours to make.",
      ],
    },
  ],
  commonIssues: [
    "Amounts imported as text because a comma or a currency symbol travelled with the value",
    "Negative amounts arriving positive because the brackets around them were dropped rather than interpreted",
    "A CR or DR suffix left inside a numeric field, which breaks a cast and often the whole import",
    "Dates written in the statement's local format, so an importer reads the twelfth of a month as December",
    "Accented or non-Latin merchant names mangled by a file written in a regional encoding instead of UTF-8",
    "Totals that agree to the penny in a spreadsheet but not in a script, because the amounts were rounded through floating point",
  ],
  supported: [
    "Comma or dot decimal separators, and space, comma, or apostrophe thousands separators",
    "Parenthesised negatives, leading minus signs, and CR or DR direction markers",
    "Separate debit and credit columns, or a single signed amount column",
    "Both a transaction date and a posting date per row, or a single date",
    "Descriptions containing commas, quotes, and non-ASCII characters",
  ],
  unsupported: [
    "PDFs without a text layer, where there are no printed values to normalise",
    "Files still protected by a password",
    "Statements covering more than one account in one document",
    "Statements with too little printed balancing data for the extraction to be verified",
    "Formats other than CSV and Excel; there is no other export and no API",
  ],
  faqs: [
    {
      question: "What delimiter and encoding does the file use?",
      answer:
        "A comma delimiter and UTF-8 encoding, with a single header row. Fields are quoted only when their content requires it, which keeps the file readable in a text editor as well as parseable by a library.",
    },
    {
      question: "Do the amounts include a currency symbol?",
      answer:
        "No. Numeric columns hold bare decimal values so they can be cast directly. The currency is a property of the statement, and it is reported in the preview and on the workbook's summary sheet rather than repeated on every row.",
    },
    {
      question: "How is a debit represented — as a negative number, or in its own column?",
      answer:
        "Both, so you can use whichever your tool expects. The Debit and Credit columns carry the figure on the side it belongs to, and the Amount column carries one signed value for the same transaction. They are not two different numbers; they are two views of one.",
    },
    {
      question: "Are the amounts affected by floating-point rounding?",
      answer:
        "No. Values are handled as exact decimals from the moment they are read, and the reconciliation totals are computed the same way. A sum over the Amount column in your own code will match the figure the check used, provided you also avoid floats.",
    },
    {
      question: "Will the column order change between statements?",
      answer:
        "No. The seven columns always appear in the same order, whether the statement had one date column or two and whether it printed a running balance or not. Missing values are left empty rather than shifting the row along, so a mapping you set up once keeps working.",
    },
  ],
  related: [
    {
      href: "/convert-pdf-transactions-to-excel",
      label: "Convert PDF transactions to Excel",
      context:
        "If you would rather browse and filter the rows than load them into another program.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "The bank statement framing, including how the asset-account check works.",
    },
    {
      href: "/pdf-bank-statement-to-csv",
      label: "PDF bank statement to CSV",
      context: "Starting from the PDF side: what the file has to contain for a CSV to be possible.",
    },
    {
      href: "/faq",
      label: "FAQ",
      context: "Short answers to the questions people ask before their first conversion.",
    },
  ],
  futureExpansion: [
    "A published sample CSV containing edge-case values, for testing an import mapping",
    "A note on locale detection when a statement mixes number formats between sections",
    "Examples of parsing the file in Python and in SQL without losing decimal precision",
  ],
};
