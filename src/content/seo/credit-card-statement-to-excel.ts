import type { SeoPage } from "./types";

export const creditCardStatementToExcel: SeoPage = {
  slug: "credit-card-statement-to-excel",
  targetQuery: "credit card statement to excel",
  searchIntent:
    "Someone holding a PDF card statement who needs the charges, payments, fees, and interest in a spreadsheet they can sort and total.",
  title: "Credit Card Statement to Excel | Statement Reconcile",
  metaDescription:
    "Turn a PDF credit card statement into an Excel workbook. Purchases, payments, fees and interest stay separate, and the balance is checked before you pay.",
  eyebrow: "Credit Card Statement to Excel",
  h1: "Credit Card Statement to Excel",
  intro: [
    "A credit card statement is not a bank statement with a different logo on it. It runs the other way round: a purchase increases what you owe, a payment reduces it, and the figure the issuer is asking you to settle is a new balance built on top of a previous one.",
    "This page turns a PDF card statement into an Excel workbook, keeping purchases, payments, fees, interest, and refunds distinguishable, then rebuilds the new balance from the rows it extracted and compares it with the one your issuer printed. You see that comparison before there is anything to pay.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet with one row per line of card activity, an autofilter on the header, and the header row frozen so a long statement stays readable while you scroll.",
    "Separate Debit and Credit columns so charges and credits never collapse into one ambiguous figure, alongside a signed Amount column for tools that prefer a single value.",
    "A Statement Summary sheet holding the previous balance, the new balance, the statement period, total purchases, total payments, fees, interest, the transaction count, the reconciliation method and its result, and the time the file was generated.",
    "A CSV of the same rows in the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, included in the same purchase.",
  ],
  reconciliation: {
    heading: "Rebuilding the new balance from your rows",
    body: [
      "Card statements give us more to work with than most current accounts do. As well as a previous balance and a new balance, issuers usually print category totals: what was spent, what was paid, what was charged in fees, and what interest was applied over the period. Each of those is an independent handle on the same set of rows.",
      "The engine totals the extracted transactions by category and walks the equation forward from the previous balance. If the result lands on the printed new balance, the extraction accounted for every line that moved what you owe. Where the category totals are printed too, they are compared as well, which narrows down where a discrepancy came from instead of only telling you that one exists.",
      "All of this is plain decimal arithmetic in our own code, run after extraction and quite separate from it. It is an arithmetic result about the rows, not a judgement about whether the document is genuine.",
    ],
    equation: "Previous balance + purchases + fees + interest − payments − credits = new balance",
  },
  steps: [
    {
      title: "Open the statement PDF",
      detail:
        "Select the file you downloaded from your card issuer. It is read inside your browser, and the PDF itself is never sent to us.",
    },
    {
      title: "Activity is read off the page",
      detail:
        "The text layer is parsed using the position of each text run, so the column a figure sits in is what decides whether it is a charge or a credit.",
    },
    {
      title: "Rows are classified",
      detail:
        "Purchases, payments, fees, interest, and refunds are separated using the columns and the section headings the issuer printed, rather than guessed at from the description text.",
    },
    {
      title: "The balance is rebuilt and compared",
      detail:
        "The equation is walked forward from your previous balance and checked against the new balance and against any category subtotals on the statement.",
    },
    {
      title: "Review, then pay $19 once",
      detail:
        "The result of the check is on screen first. If it failed, no payment step appears. If it passed, $19 unlocks the workbook and the CSV.",
    },
  ],
  sections: [
    {
      heading: "Which way the signs point on a card statement",
      body: [
        "The most common failure when card activity reaches a spreadsheet is a sign that has been flipped. On an asset account, money leaving is a debit and that feels intuitive. A card account is a liability: the balance is what you owe, so a $60 restaurant charge makes it larger and a $200 payment from your current account makes it smaller.",
        "We keep the issuer's own convention. A charge lands in the Debit column and increases the balance; a payment or a refund lands in Credit and reduces it. The signed Amount column follows the same logic, so a total across that column reflects the net movement over the period instead of an accidental cancellation between the two directions.",
      ],
      bullets: [
        "Purchases and cash advances increase the balance owed",
        "Fees and interest also increase it, and stay identifiable rather than merged into spending",
        "Payments you made reduce the balance and are not spending",
        "Refunds and chargebacks reduce the balance but belong to the merchant they came from",
      ],
    },
    {
      heading: "Telling fees and interest apart from spending",
      body: [
        "Interest and fees look like transactions and are not. If they end up in the same bucket as purchases, every spending figure you calculate afterwards is inflated by an amount that has nothing to do with anything you bought.",
        "Issuers usually help here by printing those lines under their own headings — interest charged, annual fee, foreign transaction fee, late payment fee — and often by giving a total for the period. The extractor uses those headings to classify the rows, and the Statement Summary sheet reports fees and interest as figures of their own, so you can subtract them, chart them, or leave them out of a spending analysis without hunting through hundreds of rows.",
      ],
    },
    {
      heading: "Working with the workbook once you have it",
      body: [
        "The Transactions sheet is built to be used rather than admired. With the autofilter already applied to the header row, you can filter Description down to one merchant, filter Debit to non-empty values to look only at charges, or sort by amount to find the largest items in the period.",
        "Because dates are normalised to ISO YYYY-MM-DD, Excel sorts them correctly and a pivot table grouped by month behaves the way you expect. Amounts are written as exact decimal values, so a SUM over the Amount column returns the same figure the reconciliation engine used, down to the cent.",
      ],
    },
  ],
  commonIssues: [
    "Charges and payments arriving in a single column with no direction, so the total comes out meaningless",
    "Interest and fee lines counted as purchases, quietly inflating the spending figure for the period",
    "Refunds recorded as positive spending, which double-counts the original charge instead of cancelling part of it",
    "Rewards or points summaries read as money because they sit in a column that looks like an amount column",
    "Documents that combine more than one card account, which have no single previous and new balance to check",
  ],
  supported: [
    "Credit card and charge card statements that print a previous balance and a new balance",
    "Statements that group activity under headings such as purchases, payments, fees, and interest charged",
    "Transaction date and posting date printed as separate columns, or a single date per row",
    "Card statements up to 50 pages in one conversion",
    "Parenthesised negatives, CR and DR markers, and amounts written with either a comma or a dot as the decimal separator",
  ],
  unsupported: [
    "Statements that print only a summary and a minimum payment, with no itemised activity",
    "Scanned or photographed statements with no text layer to read",
    "Password-protected PDFs, which need to be unlocked in a PDF reader before conversion",
    "Documents covering several card accounts at once",
  ],
  faqs: [
    {
      question: "Why does my card statement use a different equation from a current account?",
      answer:
        "Because a card balance is money you owe rather than money you hold. There is no opening and closing cash position to compare, so the previous balance is carried forward and the period's charges, fees, and interest are added while payments and credits are taken off to arrive at the new balance.",
    },
    {
      question: "Will the workbook tell me how much I actually spent, separately from interest?",
      answer:
        "Yes. Purchases, payments, fees, and interest are reported as their own totals on the Statement Summary sheet, and fee and interest rows stay identifiable in the Transactions sheet, so a spending figure does not silently include finance charges.",
    },
    {
      question: "What happens to a refund from a merchant?",
      answer:
        "It is treated as a credit, because it reduces the balance owed. It keeps that direction in the Debit and Credit columns and in the signed Amount column, so it offsets the original charge instead of adding to your spending.",
    },
    {
      question: "My statement shows a payment I made after the closing date. Is it included?",
      answer:
        "Only if the issuer printed it inside the period the document covers. The reconciliation works on the activity between the previous and the new balance, so anything the issuer placed outside that window is not part of the equation being checked.",
    },
    {
      question: "Can I get the same data as a CSV as well as the workbook?",
      answer:
        "Both files come with the one $19 payment and contain the same transactions, so you do not have to decide in advance which one you will end up using.",
    },
  ],
  related: [
    {
      href: "/credit-card-statement-to-csv",
      label: "Credit card statement to CSV",
      context: "For feeding card activity straight into expense software or a ledger import.",
    },
    {
      href: "/american-express-statement-to-excel",
      label: "American Express statement to Excel",
      context: "The same conversion written for American Express statements.",
    },
    {
      href: "/discover-statement-to-excel",
      label: "Discover statement to Excel",
      context: "The same conversion written for Discover card statements.",
    },
    {
      href: "/how-it-works",
      label: "How it works",
      context:
        "Where the reconciliation check sits in the process, and what it can and cannot tell you.",
    },
  ],
  futureExpansion: [
    "A worked example showing a statement whose fee total disagreed, and how the mismatch was located",
    "Notes on handling foreign currency transactions that carry a separate conversion line",
    "A comparison of charge card and revolving credit statement layouts",
  ],
};
