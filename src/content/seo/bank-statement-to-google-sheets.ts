import type { SeoPage } from "./types";

export const bankStatementToGoogleSheets: SeoPage = {
  slug: "bank-statement-to-google-sheets",
  targetQuery: "bank statement to google sheets",
  searchIntent:
    "Someone who works in a browser spreadsheet rather than a desktop one and wants the statement as live rows they can share, filter, and total in Google Sheets.",
  title: "Bank Statement to Google Sheets | Statement Reconcile",
  metaDescription:
    "Import a reconciled statement CSV into Google Sheets: File then Import, separator and locale settings, and amounts that stay numeric. Independent tool.",
  eyebrow: "Importing the CSV",
  h1: "Bank statement to Google Sheets",
  intro: [
    "If your working spreadsheet lives in a browser, the route from a PDF statement to usable rows is the CSV rather than the workbook. Google Sheets imports CSV files readily — the care is needed in the import dialogue and in one setting most people never look at, because that is where amounts quietly become text and dates quietly become the wrong month.",
    "The conversion itself comes first. Your statement is read in the browser, the transactions are extracted, and the totals are tested against the balances printed on the document before the payment step appears. What you then import is a file whose arithmetic has already been shown to agree with the bank's own figures.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A comma-delimited CSV with a single header row and the columns always in the order Date, Posted Date, Description, Debit, Credit, Amount, Balance.",
    "UTF-8 text with a byte order mark, so the encoding is declared rather than guessed, and accented or non-Latin names in descriptions arrive intact.",
    "CRLF line endings and RFC 4180 quoting, which means a description containing a comma, a quotation mark, or a line break cannot break the row it belongs to.",
    "Description fields beginning with =, +, -, or @ neutralised, so a spreadsheet displays the merchant name instead of evaluating it.",
    "Amounts written as plain decimal numbers with a dot separator and no thousands separators or currency symbols, which is what a spreadsheet needs in order to treat them as numbers.",
    "The Excel workbook is included in the same one-time purchase, which is where the statement period, balances, and verification record live.",
  ],
  reconciliation: {
    heading: "A spreadsheet will total whatever you give it, correct or not",
    body: [
      "The thing a spreadsheet is best at is also what makes a bad import dangerous. SUM over a column returns an answer immediately, confidently, and with no indication of whether the column contained every transaction on the statement. A file missing two rows produces a total that looks exactly like a correct one, and once that figure has been copied into a summary tab or shared with someone, it stops being questioned.",
      "So the arithmetic is settled before the file is handed over. Every extracted row is re-added in our own code using exact decimal arithmetic, and the result is compared with the opening and closing balances printed on the statement, together with any stated totals it carries. You are shown the comparison, with the figures, while the download is still locked.",
      "That gives you a number to check your import against. After the rows land in Sheets, sum the Amount column and compare the movement against the total credits and debits in the summary. If the two disagree, the problem is in the import settings rather than in the extraction, and you know where to look.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Convert the statement and read the verdict",
      detail:
        "The PDF is opened in your browser and the transaction table is rebuilt from the text positions. The period, balances, computed totals, equation, and ten sample rows are shown before any payment step exists.",
    },
    {
      title: "Review the result and download the CSV",
      detail:
        "One paid conversion pack may contain one or more statements up to 50 total pages, with the Excel workbook and verification reports included.",
    },
    {
      title: "Set the spreadsheet locale before importing",
      detail:
        "In a new spreadsheet, open the settings and check the locale. It governs how numbers and dates are interpreted on import, and changing it afterwards does not re-parse values that were already misread.",
    },
    {
      title: "Use File then Import, with comma as the separator",
      detail:
        "Upload the CSV, choose whether to create a spreadsheet or add a sheet, set the separator to comma rather than leaving it to detection, and leave the option that converts text to numbers and dates switched on.",
    },
    {
      title: "Confirm the numbers are numbers",
      detail:
        "Click an amount cell. A numeric value aligns right and shows in the formula bar without a leading apostrophe. Then sum the Amount column and compare it against the totals from the reconciliation summary.",
    },
  ],
  sections: [
    {
      heading: "The import dialogue, option by option",
      body: [
        "There are only a handful of choices in the import panel and each one has a sensible answer for this file. The exact wording changes from time to time, so match the intent rather than the label.",
        "Import location decides whether the rows become a new spreadsheet, a new sheet in the current one, or a replacement for the current sheet. For a monthly workflow, adding a new sheet per statement keeps a year in one place; replacing the current sheet is what breaks any formula you wrote against the previous import.",
        "Separator type offers automatic detection, tab, comma, and a custom character. Automatic detection usually gets it right, but there is no reason to leave it to chance when the file is definitively comma-delimited. Choose comma.",
        "The remaining option — the one that converts text into numbers, dates, and formulas — should stay on. With it off, every amount arrives as a string, no column will sum, and no date will sort chronologically. With it on, the values are parsed using the spreadsheet's locale, which is why the locale is worth checking first.",
      ],
      bullets: [
        "Import location — prefer a new sheet over replacing an existing one",
        "Separator type — set comma explicitly rather than relying on detection",
        "Convert text to numbers and dates — leave on, or nothing will total or sort",
        "Import the CSV rather than the workbook if you want editable rows rather than a converted copy",
      ],
    },
    {
      heading: "Locale is what decides whether 1234.56 is a number",
      body: [
        "A browser spreadsheet parses values according to the locale set on the document, not according to your keyboard or your operating system. In a locale that uses a dot as the decimal separator, the amount 1234.56 becomes the number one thousand two hundred and thirty-four point five six. In a locale that uses a comma as its decimal separator, the same text may be read as a thousands-grouped integer or refused as a number altogether.",
        "Our amounts are always written with a dot decimal separator and no thousands grouping, regardless of how the statement itself printed them. That is a deliberate normalisation: a statement using comma decimals is detected while the document is being read and converted, so the file has one consistent numeric convention instead of inheriting the bank's. The consequence for you is simple — the spreadsheet locale needs to be one that reads a dot as a decimal point.",
        "Dates are less fragile because they are written as YYYY-MM-DD, which is unambiguous and is recognised across locales. The pleasant side effect is that sorting works whether the column was parsed as dates or left as text, since ISO values sort correctly either way.",
      ],
      bullets: [
        "Check the document locale before the first import, not after",
        "Amounts always use a dot decimal separator with no thousands grouping",
        "Dates are ISO YYYY-MM-DD and sort correctly even if parsed as text",
        "An empty Posted Date or Balance cell means the statement printed nothing there, not that a value was lost",
      ],
    },
    {
      heading: "Encoding and leading characters in a shared spreadsheet",
      body: [
        "Two details in the file exist specifically so that the import is uneventful. The first is the byte order mark at the start of the UTF-8 text. Its practical job is to declare the encoding rather than leave a reader guessing, which is what stops a café or a Straße in a merchant name from arriving as replacement characters. In practice Google Sheets consumes the mark rather than displaying it, so the first header cell reads Date and nothing precedes it.",
        "The second is the handling of descriptions that begin with =, +, -, or @. A spreadsheet reads those characters as the start of an expression, not the start of a word, and with text conversion enabled on import it will act on them. A description beginning with an equals sign becomes a formula and the merchant name is gone, replaced by a result or an error. A description beginning with a hyphen becomes a negative number, which is worse, because a number looks like it belongs in a spreadsheet full of numbers.",
        "Real statements produce these more often than you would expect: hyphenated payment references, plus signs in transfer narratives, and handles carried through from payment services. Neutralising the leading character before the file is written means the description arrives as printed. That matters more in a shared document than a private one, because a cell whose contents were rewritten on import is not obviously wrong to the next person who opens it.",
      ],
    },
  ],
  commonIssues: [
    "Text conversion switched off during import, leaving every amount as a string that will not sum",
    "A document locale that reads a comma rather than a dot as the decimal separator, so amounts import as text or as the wrong magnitude",
    "Replacing the current sheet on import and breaking the formulas written against the previous month",
    "Separator detection choosing wrongly on a statement whose descriptions are unusually comma-heavy",
    "Descriptions starting with a hyphen being evaluated as negative numbers, so the merchant name disappears",
    "Importing the CSV twice into the same sheet and doubling the period without any warning",
  ],
  supported: [
    "Current, checking, savings, business, and credit card statements with a listed transaction table",
    "Statements originally printed with comma decimal separators, normalised to dot decimals in the file",
    "Descriptions containing accents, currency symbols, and non-Latin scripts",
    "One or more statements up to 50 total pages, with a 20 MB per-file limit",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
  ],
  unsupported: [
    "Any add-on, extension, or connected import; you download the CSV and import it yourself",
    "Live refreshing or a link back to the statement, since nothing is stored after the conversion",
    "Scanned or photographed statements with no text layer, as this version has no character recognition",
    "Password-protected PDFs, non-PDF files, and documents covering more than one account",
    "Statements whose printed balances are insufficient to verify the extraction",
  ],
  faqs: [
    {
      question: "Which import settings should I pick for this file?",
      answer:
        "Comma as the separator, a new sheet rather than replacing an existing one, and the text-conversion option left on. The only setting to check outside the dialogue is the document locale, which decides how the amounts are parsed.",
    },
    {
      question: "My amounts came in as text and will not add up. What happened?",
      answer:
        "Almost always the text-conversion option was switched off, or the document locale expects a comma decimal separator. Fix the locale, then re-import rather than trying to repair the existing column, because changing the setting does not re-parse values already imported.",
    },
    {
      question: "Does the byte order mark appear as a stray character in the first cell?",
      answer:
        "It should not. The mark is there to declare that the file is UTF-8, and the import reads it as encoding information rather than content, so the header row begins with Date. If you ever see a stray glyph there, delete it from the header cell and the rows below are unaffected.",
    },
    {
      question: "Could I open the Excel workbook here instead of importing the CSV?",
      answer:
        "You can, and it is the better choice when you want the Statement Summary sheet alongside the transactions. Import the CSV instead when you want plain rows to build formulas and filters on without a conversion step in between.",
    },
    {
      question: "Will a neutralised description look different once it is imported?",
      answer:
        "It reads as the text the statement printed. The point of the neutralisation is that a leading =, +, -, or @ is treated as part of the name rather than as an instruction, so the cell shows the merchant rather than a formula result or a number.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "The full specification of the file: quoting, encoding, and the seven fixed columns.",
    },
    {
      href: "/bank-statement-to-xero-csv",
      label: "Bank statement to Xero CSV",
      context: "If the spreadsheet is a staging step before the rows go into a ledger.",
    },
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "What the workbook adds over the plain CSV, including the summary sheet.",
    },
    {
      href: "/extract-transactions-from-pdf",
      label: "Extract transactions from a PDF",
      context: "Where the rows come from, and why a PDF table has to be reconstructed at all.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Google LLC, we publish no add-on or extension, and nothing described here is provided in cooperation with Google.",
  futureExpansion: [
    "A short reference on locale settings and the decimal separators each one expects on import",
    "A template sheet with a monthly tab layout and a total that ties back to the statement summary",
    "Notes on spotting a double import by comparing row counts against the reconciliation transaction count",
  ],
};
