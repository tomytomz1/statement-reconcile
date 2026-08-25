import type { SeoPage } from "./types";

export const bankOfAmericaStatementToExcel: SeoPage = {
  slug: "bank-of-america-statement-to-excel",
  targetQuery: "bank of america statement to excel",
  searchIntent:
    "A person with a deposit-account PDF statement who needs it in a spreadsheet and wants deposits and withdrawals to end up on the correct side.",
  title: "Bank of America Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert an eligible Bank of America PDF statement into Excel and CSV. Independent tool. Deposits and withdrawals are checked against the printed balances.",
  eyebrow: "Deposit account statements",
  h1: "Bank of America Statement to Excel",
  intro: [
    "A deposit-account statement usually presents money in and money out as two separate columns. Getting one into Excel means more than lifting the numbers off the page: it means knowing which of the two columns each number came from, because on many layouts that is the only thing recording whether the row was a deposit or a withdrawal.",
    "This converter reconstructs those columns from the PDF, writes them into a workbook and a CSV, and then proves the reconstruction by re-adding the rows and comparing the result with the balances the statement prints. The proof is shown to you before a price is.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet in the .xlsx workbook with every row recorded in the correct direction, plus an autofilter and a frozen header row so a long statement stays navigable.",
    "Debit and Credit kept as separate columns alongside a single signed Amount column, so an import expecting either convention has what it needs without a rewrite.",
    "A Statement Summary sheet recording the period covered, opening and closing balances, total credits, total debits, fees, interest, the number of transactions, the reconciliation method and its result, and when the file was produced.",
    "The same fixed CSV header every time — Date, Posted Date, Description, Debit, Credit, Amount, Balance — regardless of which column arrangement the original statement used.",
  ],
  reconciliation: {
    heading: "Direction errors are precisely what the equation catches",
    body: [
      "Suppose a $2,400 withdrawal is read as a $2,400 deposit. Every individual field in the export is correct: the date, the description, the amount. Only the direction is wrong, and nothing about the resulting spreadsheet looks unusual enough to investigate.",
      "The arithmetic notices immediately. Flipping one row's direction moves the computed closing balance by twice that row's value, so the equation misses by $4,800 and the check fails. This is the reason the sum is run by a separate deterministic engine rather than trusted to the step that read the page: it re-derives the closing balance from the rows alone and holds it against the number the statement printed.",
      "We do not maintain a list of institutions whose layouts we have verified, because such a list would be a promise about documents we have never opened. The equation is the substitute, and unlike a compatibility list it is evaluated against the file actually in front of you.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Load the statement PDF",
      detail:
        "Choose the file from your machine. Parsing happens in the browser, so the document itself is never transmitted anywhere.",
    },
    {
      title: "Columns are located before rows are read",
      detail:
        "The extractor first establishes where the deposit column, the withdrawal column, the description block, and any balance column sit horizontally on the page.",
    },
    {
      title: "Direction is assigned from position",
      detail:
        "The column an amount falls into decides whether it is recorded as a credit or a debit. Description wording is never used to guess which way a row points.",
    },
    {
      title: "The ledger is recomputed and compared",
      detail:
        "Opening balance plus all credits minus all debits is calculated in decimal arithmetic and matched against the closing balance printed on the statement.",
    },
    {
      title: "Review the result, then decide",
      detail:
        "Totals, the equation used, and sample rows appear on screen. Only if the check passed does a payment step exist at all.",
    },
  ],
  sections: [
    {
      heading: "Two columns, one meaning per row",
      body: [
        "In a two-column layout, the horizontal position of an amount carries information that appears nowhere else on the line. The figure 148.30 printed under a deposits heading and the same figure printed under a withdrawals heading are different events, and the only thing distinguishing them is a few dozen points of horizontal offset.",
        "That makes column reconstruction the load-bearing step. If the boundary between the two columns is placed slightly wrong, or a wide amount overhangs into its neighbour's territory, whole groups of rows can land on the wrong side. The extraction still returns a full table that reads plausibly from top to bottom.",
      ],
      bullets: [
        "Amounts are usually right-edge aligned, so the right edge is a more reliable signal than the left",
        "A single unusually wide figure can visually intrude on the column beside it without belonging to it",
        "Some layouts print a running balance in a third numeric column that must not be mistaken for an amount",
        "Section lines such as service charges and interest paid carry amounts that belong in the ledger and must still be picked up",
      ],
    },
    {
      heading: "Descriptions are not direction hints",
      body: [
        "It is tempting to infer direction from wording — a line mentioning a payment must be money out, a line mentioning a transfer must be money in. That heuristic is wrong often enough to be dangerous. A payment received and a payment sent read almost identically, and transfers move in both directions with the same vocabulary.",
        "So the converter does not do it. Direction comes from column geometry, or from an explicit sign on a single-amount layout, and from nothing else. Where the geometry is ambiguous enough that the extractor cannot resolve it cleanly, the totals will not balance, and you are told the check failed rather than handed a confident guess.",
      ],
    },
    {
      heading: "What this page will not tell you about the bank",
      body: [
        "We will not describe the internal layout of Bank of America, N.A. statements as verified fact, because we have not audited them. Across the industry some issuers print separate deposit and withdrawal columns, some print one signed amount, and some run a balance down the right edge while others do not. Your document is one of those shapes, and the converter is written to handle the shapes generally.",
        "The check that matters is the one performed on your file, not a badge on a marketing page. Convert eligible PDF statements when the format can be extracted and independently reconciled, and let the reconciliation result — shown before the paywall — be the answer about your particular document.",
      ],
    },
  ],
  commonIssues: [
    "Amounts overhanging a column boundary, which can push a row's direction the wrong way",
    "Statements delivered as image-only scans, where there are no text coordinates to read columns from",
    "Documents combining a personal and a business account, which contain two ledgers and therefore no single closing balance to test",
    "Encrypted PDFs that a reader will open but a parser cannot, until the protection is removed",
    "Statements printing a mid-period balance but not the period opening balance, leaving nothing to anchor the sum to",
  ],
  supported: [
    "Eligible PDF statements from any institution, when the text layer can be extracted and the totals can be independently reconciled",
    "Two-column deposit and withdrawal layouts, where direction is taken from column position",
    "Single signed amount layouts, with negatives written as a minus sign or in parentheses",
    "Statements with a running balance column and statements without one",
    "Documents up to 50 pages, converted and verified as a single statement",
  ],
  unsupported: [
    "Image-only or photographed PDFs",
    "Password-protected files that have not been unlocked and re-saved",
    "Files containing more than one account",
    "Statements without enough printed balance information to verify the extracted rows",
  ],
  faqs: [
    {
      question: "How does the converter decide whether a row is a deposit or a withdrawal?",
      answer:
        "By where the amount sits on the line. On a two-column layout, the column an amount falls into determines its direction. On a single-column layout, the sign printed with the amount does. Wording in the description is never used to infer it.",
    },
    {
      question: "The CSV has a Debit column and an Amount column. Which one should I use?",
      answer:
        "Whichever your destination expects. Debit and Credit hold unsigned values in separate columns; Amount holds the same transaction as one signed number. They describe the same row two ways and are always populated consistently with each other.",
    },
    {
      question: "Are you connected to Bank of America in any way?",
      answer:
        "In no way at all. Statement Reconcile is an independent product, we have no agreement with Bank of America, N.A., and nothing here is provided on that institution's behalf.",
    },
    {
      question: "The check passed. Does that mean every description is perfect?",
      answer:
        "It means the numbers are internally consistent: no row was dropped, duplicated, mis-signed, or misread by an amount. Description text is not part of the equation, so scan the preview rows for anything truncated before you pay.",
    },
    {
      question: "Can I convert a statement for a joint account?",
      answer:
        "Yes, provided the document covers one account. A joint account is still a single ledger with one opening and one closing balance. What cannot be handled is a file bundling two different accounts into one PDF.",
    },
  ],
  related: [
    {
      href: "/convert-bank-statement-to-excel",
      label: "Convert a bank statement to Excel",
      context: "The same conversion described without reference to any institution.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "If the Debit and Credit columns are what your import actually needs.",
    },
    {
      href: "/wells-fargo-statement-to-excel",
      label: "Wells Fargo statement to Excel",
      context: "Written around long statements that continue across many pages.",
    },
    {
      href: "/how-it-works",
      label: "How the reconciliation check works",
      context: "The extraction and verification sequence, step by step.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Bank of America, N.A., we do not act on its behalf, and no part of this service is provided in cooperation with it.",
  futureExpansion: [
    "An illustrated explanation of right-edge amount alignment and how column boundaries are inferred from it",
    "A page on feeding the Debit, Credit and Amount columns into software that accepts only one of the two conventions",
    "Worked examples of the arithmetic signature left behind by a single reversed row",
  ],
};
