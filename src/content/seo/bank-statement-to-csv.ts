import type { SeoPage } from "./types";

export const bankStatementToCsv: SeoPage = {
  slug: "bank-statement-to-csv",
  targetQuery: "bank statement to csv",
  searchIntent:
    "Someone who needs a plain, predictable text file to feed into another system, and who cares about column order, encoding, and whether the file will import cleanly.",
  title: "Bank Statement to CSV Export | Statement Reconcile",
  metaDescription:
    "Export a PDF bank statement as a CSV with a fixed column order and UTF-8 text that imports cleanly. The figures are reconciled before the $19 payment appears.",
  eyebrow: "CSV export",
  h1: "Bank statement to CSV",
  intro: [
    "A CSV is not really a document; it is an interface. Something else is going to read it — an accounting package, a script, a database import job — and that reader has no tolerance for surprises in the column order, the encoding, or the way a stray character in a merchant name was handled.",
    "This export is written with that reader in mind. The columns never move, the text is UTF-8, and characters that would otherwise be interpreted as instructions by a spreadsheet are neutralised before they reach the file. Ahead of all of that, the transaction rows are checked against the balances printed on the statement, and the payment step is only offered if they agree.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "One row per transaction and a fixed column order that does not vary between statements: Date, Posted Date, Description, Debit, Credit, Amount, Balance.",
    "UTF-8 text, so accented merchant names, currency symbols, and non-Latin characters survive the round trip into your target system.",
    "Description fields that begin with =, +, -, or @ neutralised so a spreadsheet treats them as text rather than evaluating them as formulas.",
    "Tab and carriage-return characters removed from within description text, so a single transaction cannot break across two lines or split into extra columns.",
    "An Excel workbook of the same transactions, with a Transactions sheet and a Statement Summary sheet, bundled into the same purchase.",
  ],
  reconciliation: {
    heading: "A tidy file is not the same as a complete one",
    body: [
      "Formatting problems announce themselves. You import a file, a column lands in the wrong place, and you notice immediately. Completeness problems do not behave that way: a CSV missing one transaction out of two hundred parses perfectly, imports without complaint, and quietly puts your ledger out by whatever that transaction was worth.",
      "The only reliable way to catch that class of problem is to test the extracted rows against a figure the bank itself published. Credits and debits are summed with plain decimal arithmetic and compared against the opening and closing balances on the document; where the statement prints stated totals or category subtotals, those are compared too.",
      "You are shown that comparison, with the numbers, while the file is still locked. If it fails, there is no paywall and no charge, because a CSV that might be missing a row is not worth paying for.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Pick the statement PDF",
      detail:
        "The document is opened in your browser. Only the text extracted from it is sent for parsing, and it is not kept once the response comes back.",
    },
    {
      title: "Rows and columns are identified",
      detail:
        "Dates, descriptions, and the money columns are separated out, and continuation lines are attached to the transaction they belong to rather than becoming rows of their own.",
    },
    {
      title: "Descriptions are made safe for import",
      detail:
        "Leading formula characters are neutralised and embedded tabs and carriage returns are stripped, so each transaction occupies exactly one line with exactly seven fields.",
    },
    {
      title: "The arithmetic is verified",
      detail:
        "The totals computed from the extracted rows are compared with what the statement printed, and the result is shown to you before any payment step exists.",
    },
    {
      title: "Download the CSV for $19",
      detail:
        "One $19 payment, one conversion pack with one or more statements up to 50 total pages. The Excel workbook and verification reports come with it.",
    },
  ],
  sections: [
    {
      heading: "The column order, and why it never changes",
      body: [
        "Every CSV produced here uses the same seven columns in the same sequence: Date, Posted Date, Description, Debit, Credit, Amount, Balance. That is deliberate. If you convert twelve statements over the course of a year, the mapping you set up in your accounting software on the first one still works on the twelfth, and any script you write against the file does not need to inspect the header row defensively.",
        "The redundancy between the money columns is also deliberate. Debit and Credit hold the figures the way most bookkeeping tools expect to receive them, as two separate positive columns. Amount holds the same movement as a single signed figure, which is what most scripts and databases would rather have. Balance carries the running balance where the statement printed one. Importers can take whichever pair suits them and ignore the rest.",
      ],
      bullets: [
        "Date — the transaction date as printed on the statement",
        "Posted Date — the date the bank recorded the movement, where the statement prints both",
        "Description — the merchant or narrative text, cleaned of characters that would break the row",
        "Debit and Credit — money out and money in, as separate positive columns",
        "Amount — the same movement as one signed figure",
        "Balance — the running balance, where the statement carries one",
      ],
    },
    {
      heading: "Why a leading equals sign in a merchant name matters",
      body: [
        "Spreadsheet applications treat certain leading characters as the start of a formula rather than the start of a word. A field beginning with =, +, -, or @ may be evaluated when the file is opened instead of being displayed. Merchant names are a surprisingly rich source of these: hyphenated references, plus signs in transfer narratives, and handles carried through from payment services all show up in real statements.",
        "The consequence is rarely dramatic and that is precisely the problem. A description field that starts with a hyphen can be read as a negative number, and the merchant name simply disappears from your ledger, replaced by a figure nobody entered. Neutralising those leading characters before the file is written means the description arrives as the text that was printed on the statement, in every application that opens it.",
      ],
    },
    {
      heading: "Line integrity and encoding",
      body: [
        "A CSV row is defined by its line ending, and a field is defined by its delimiter. Text lifted out of a PDF can carry tab characters and carriage returns inside what looks, on the page, like a single continuous description. Written into a file unchanged, those characters split one transaction into two lines or into extra phantom columns, and the import fails somewhere further down with an unhelpful message about field counts.",
        "Removing them at the point the field is built keeps the guarantee simple: one transaction, one line, seven fields. Combined with UTF-8 output, that means a statement containing a café, a Straße, or a name in a non-Latin script produces a file that reads correctly rather than one full of replacement characters.",
      ],
    },
  ],
  commonIssues: [
    "Merchant names beginning with a hyphen or plus sign being evaluated as arithmetic by the spreadsheet that opens the file",
    "Non-UTF-8 exports turning accented characters into question marks or mojibake on import",
    "Embedded line breaks inside a description splitting one transaction across two rows",
    "Column order changing from one export to the next, so a saved import mapping stops working",
    "Thousands separators left inside amount fields, which many importers reject outright",
  ],
  supported: [
    "Personal and business current, checking, and savings statements with a listed transaction table",
    "Credit card statements, verified with the previous-balance equation rather than the opening-balance one",
    "Statements printed in a currency that uses a comma as its decimal separator",
    "Descriptions containing accents, currency symbols, and non-Latin characters",
    "A single statement of up to 50 pages in one conversion",
  ],
  unsupported: [
    "Scanned or photographed statements that contain no selectable text",
    "PDFs still protected by an open password",
    "Files covering several accounts at once, which cannot be balanced as one statement",
    "Statements that print only a closing figure with no transaction detail to export",
  ],
  faqs: [
    {
      question: "Which delimiter and encoding does the file use?",
      answer:
        "Fields are comma-separated and the file is written as UTF-8. Fields containing a comma or a quotation mark are quoted so the delimiter inside them is not mistaken for a field boundary.",
    },
    {
      question: "What happens to a description that starts with an equals sign?",
      answer:
        "It is neutralised so the spreadsheet reading the file treats the field as text. The merchant name is preserved as printed rather than being evaluated as a formula or silently converted into a number.",
    },
    {
      question: "Why are there Debit, Credit, and Amount columns rather than just one?",
      answer:
        "Different importers want different shapes. Bookkeeping tools usually expect two positive columns; scripts and databases usually prefer one signed figure. Providing both means you do not have to derive one from the other.",
    },
    {
      question: "Can I reorder or rename the columns after downloading?",
      answer:
        "Yes, the file is yours once you have it. The fixed order is a guarantee about what we produce, not a restriction on what you do with it afterwards.",
    },
    {
      question: "Does the CSV contain the statement summary as well?",
      answer:
        "No. The CSV holds transaction rows only, so it imports cleanly without header junk. The period, balances, totals, and the reconciliation outcome live on the summary sheet of the Excel workbook that comes with it.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context:
        "The workbook side of the same conversion, with a filterable sheet and a statement summary.",
    },
    {
      href: "/pdf-bank-statement-to-csv",
      label: "PDF bank statement to CSV",
      context: "How dates are normalised and amounts are signed on the way out of the PDF.",
    },
    {
      href: "/convert-bank-statement-to-csv",
      label: "Convert a bank statement to CSV",
      context:
        "Written for bookkeeping workflows, where the export is one step in a longer reconciliation.",
    },
    {
      href: "/bank-statement-converter",
      label: "Bank statement converter",
      context: "The overview page, if you want the short version of how the whole thing works.",
    },
  ],
  futureExpansion: [
    "A reference page documenting each CSV column with worked examples of edge-case values",
    "Notes on importing the file into ledger tools that require a signed single-amount column",
    "A short explainer on quoting rules and how to spot a badly quoted CSV before importing it",
  ],
};
