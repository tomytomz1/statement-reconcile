import type { SeoPage } from "./types";

export const bankStatementToQuickbooksCsv: SeoPage = {
  slug: "bank-statement-to-quickbooks-csv",
  targetQuery: "bank statement to quickbooks csv",
  searchIntent:
    "Someone whose bank feed is unavailable, incomplete, or does not reach back far enough, who needs a CSV they can push through the QuickBooks bank transaction import instead.",
  title: "Bank Statement to QuickBooks CSV | Statement Reconcile",
  metaDescription:
    "Turn a PDF statement into a CSV you can import into QuickBooks. This is a CSV for the bank transaction import wizard, not a .qbo Web Connect file. Independent tool.",
  eyebrow: "Preparing a CSV for import",
  h1: "Bank statement to QuickBooks CSV",
  intro: [
    "Bank feeds cover the recent past and the accounts you have connected. When you need an older period, an account the feed will not reach, or a gap the feed dropped, the fallback is a manual import — and that import wants a CSV with a shape it recognises.",
    "To be clear about what this produces: a CSV file for the bank transaction import, not a .qbo or Web Connect file. Web Connect files are not something this tool creates. What it does do is extract the transactions from your PDF statement, prove the arithmetic against the printed balances, and give you a CSV with predictable columns to map.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A CSV with a header row and seven columns in a fixed order: Date, Posted Date, Description, Debit, Credit, Amount, Balance. You map the ones the importer asks for and leave the rest unmapped.",
    "Dates written as ISO 8601 values, YYYY-MM-DD, so there is no ambiguity to resolve when the wizard asks you which date format the file uses.",
    "Amounts with no thousands separators and no currency symbol, which is the form bank-import parsers accept without complaint.",
    "Debit and Credit as two separate positive columns, and Amount as one signed figure with money out negative — so the file suits either the four-column or the three-column import shape without editing.",
    "An Excel workbook of the same transactions in the same purchase, whose Statement Summary sheet records the reconciliation checks that were run before the file was released.",
  ],
  reconciliation: {
    heading: "Import errors are cheap; a silently incomplete import is not",
    body: [
      "A malformed CSV fails loudly. The wizard rejects it, you fix the column mapping, and you try again — irritating, but self-correcting. The expensive failure is the file that imports perfectly and is missing three transactions, because nothing in the ledger flags it. The account simply will not reconcile at the end of the period, and by then the difference is a search problem rather than a fix.",
      "So the check runs before you ever reach the import. The extracted rows are re-added in our own code using exact decimal arithmetic, and the result is tested against the balances printed on the statement, along with any stated total debits and total credits it carries. If the figures do not agree, the paywall never appears and you are told what did not close.",
      "That gives the import a useful property: the number you can compute from the file matches a number your bank published, before a single transaction has been accepted into the ledger.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Establish the period the import needs to cover",
      detail:
        "Check the last transaction already in the account so the statement you convert starts after it. Import ranges that overlap what is already posted are the usual source of duplicates.",
    },
    {
      title: "Convert the statement PDF",
      detail:
        "The file is read in your browser and the transaction table is rebuilt from the text coordinates. Only the extracted text is sent for parsing, and it is not retained afterwards.",
    },
    {
      title: "Read the reconciliation verdict before paying",
      detail:
        "The period, balances, computed totals, equation, and a ten-row preview are shown. If the arithmetic did not close there is no payment step and nothing to import.",
    },
    {
      title: "Download the CSV for $19 and decide on a column shape",
      detail:
        "Use Debit and Credit for a four-column import, or Amount alone for a three-column import. Both are already in the file, so this is a mapping decision rather than an editing job.",
    },
    {
      title: "Map the columns in the import wizard",
      detail:
        "Point the importer's date field at Date, its description field at Description, and its amount fields at either Amount or the Debit and Credit pair. Leave Posted Date and Balance unmapped.",
    },
  ],
  sections: [
    {
      heading: "Three columns or four, and which to choose",
      body: [
        "Bank transaction imports in QuickBooks generally accept a CSV in one of two shapes. The three-column shape carries a date, a description, and a single amount column in which money out is negative. The four-column shape carries a date, a description, and two separate amount columns, one for money in and one for money out.",
        "Our export contains the material for both, which is why the column count in the file is seven rather than three or four. You do not delete columns to fit a shape; you choose which columns to map and ignore the others. The exact field names and the number of shapes on offer do change between QuickBooks versions and regions, so treat the wizard's own labels as authoritative and use the mapping step to reconcile them with our headers.",
      ],
      bullets: [
        "Three-column shape — map Date, Description, and Amount",
        "Four-column shape — map Date, Description, and the Debit and Credit pair",
        "Leave Posted Date unmapped unless the importer specifically wants a posting date",
        "Leave Balance unmapped; a running balance is not a transaction and importing it as one creates phantom entries",
      ],
    },
    {
      heading: "Sign conventions, and the mistake that inverts a whole month",
      body: [
        "The single-amount shape depends entirely on the sign. Money leaving the account must be negative and money arriving must be positive. Our Amount column already follows that convention, which is the common one for bank imports.",
        "The four-column shape depends instead on which column is which, and this is where an import goes wrong in a way that is easy to miss. If money out is mapped to the money-in field, every figure still imports, every amount is still correct to the cent, and the ledger is now wrong by twice the value of the period. The tell is the account balance moving in the wrong direction after the import, so check that before you start categorising.",
        "One practical safeguard: our reconciliation shows you total credits and total debits for the period. After the import, the movement on the account should agree with those two figures. If it does not, the mapping is the first thing to suspect.",
      ],
    },
    {
      heading: "Dates, and why ISO removes an entire class of problem",
      body: [
        "Import wizards typically ask you to state the date format in the file, because 03/04/2026 is genuinely ambiguous. Choosing wrongly does not always produce an error — it produces transactions in the wrong month, and for any day of the month at or below twelve it produces them silently.",
        "Every date in our CSV is written as YYYY-MM-DD with a four-digit year, and the day and month order is established from the statement itself rather than assumed from a locale. If the wizard offers an ISO or year-first option, choose it. If it insists on a day-first or month-first format, you can convert the column in a spreadsheet first, but you are at least converting from an unambiguous starting point rather than guessing what the original meant.",
      ],
    },
  ],
  commonIssues: [
    "Importing a range that overlaps transactions already in the account, producing duplicates that then have to be excluded one by one",
    "A misread date format that quietly places transactions in the wrong month rather than failing the import",
    "Debit and credit columns mapped the wrong way round, which imports cleanly and inverts the period",
    "A running balance column mapped as an amount, creating a transaction for every balance figure",
    "Thousands separators or currency symbols left in amount fields, which many bank-import parsers reject",
    "Descriptions containing a comma that were never quoted, shifting every field after them by one column",
  ],
  supported: [
    "Current, checking, savings, and business account statements with a listed transaction table",
    "Credit card statements, reconciled with the previous-balance equation, for a card account in your chart of accounts",
    "Statements up to 50 pages and 20 MB in a single conversion",
    "Layouts using separate debit and credit columns, one signed amount column, or amounts grouped under section headings",
    "Parenthesised negatives, CR and DR markers, and comma or dot decimal separators, all normalised before the CSV is written",
  ],
  unsupported: [
    ".qbo, Web Connect, OFX, and QIF files — the only formats produced here are CSV and XLSX",
    "Direct posting into QuickBooks, a connected app, or an API integration of any kind",
    "Scanned or image-only PDFs, since there is no character recognition in this version",
    "Password-protected PDFs and documents containing more than one account",
    "Statements whose printed balances are insufficient to verify the extraction",
  ],
  faqs: [
    {
      question: "Do you produce a .qbo or Web Connect file?",
      answer:
        "No. The only outputs are a CSV and an Excel workbook. If your workflow strictly requires a Web Connect file, this is not the tool for it — everything on this page is about the manual CSV import route instead.",
    },
    {
      question: "Do I have to delete the columns the importer does not want?",
      answer:
        "No. The wizard maps fields rather than requiring an exact column count, so you point it at the columns you need and leave Posted Date and Balance unmapped. Deleting columns only risks breaking a mapping you will reuse next month.",
    },
    {
      question: "How do I check after the import that nothing went missing?",
      answer:
        "Compare the net movement the import produced against the total credits and total debits shown in the reconciliation summary. Those two figures were computed from the same rows the CSV contains, so a mismatch points at the import rather than the extraction.",
    },
    {
      question: "The importer will not accept my dates. What should I change?",
      answer:
        "Select an ISO or year-first date format in the wizard, since the file is written as YYYY-MM-DD. If only day-first or month-first options exist, reformat the Date column in a spreadsheet before importing — the underlying values are unambiguous, so the conversion is safe.",
    },
    {
      question: "Can this replace a bank feed?",
      answer:
        "Not as an ongoing arrangement. A feed delivers transactions continuously; this converts one or more statement files in a $19 pack of up to 50 total pages. It is for historic periods, unsupported accounts, and gaps a feed left behind.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-xero-csv",
      label: "Bank statement to Xero CSV",
      context:
        "The same import problem in a different package, with different column expectations.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "The specification of the file itself: encoding, quoting, and the fixed column order.",
    },
    {
      href: "/convert-bank-statement-to-csv",
      label: "Convert a bank statement to CSV",
      context: "How a converted period fits into a bookkeeping run rather than a single import.",
    },
    {
      href: "/faq",
      label: "Questions about scope and limits",
      context: "What is and is not covered, including formats that are deliberately not offered.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Intuit Inc. or QuickBooks, we are not part of any partner or developer programme, and nothing here is published with Intuit's involvement.",
  futureExpansion: [
    "A worked example of a four-column mapping with a before-and-after of the account balance",
    "A short guide to spotting an inverted sign convention within the first ten imported rows",
    "Notes on choosing period boundaries so consecutive imports neither overlap nor leave a gap",
  ],
};
