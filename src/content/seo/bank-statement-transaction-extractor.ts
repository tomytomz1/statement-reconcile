import type { SeoPage } from "./types";

export const bankStatementTransactionExtractor: SeoPage = {
  slug: "bank-statement-transaction-extractor",
  targetQuery: "bank statement transaction extractor",
  searchIntent:
    "Someone who wants the transaction rows themselves — a clean table pulled out of a statement PDF — and cares about whether the extraction can be trusted.",
  title: "Bank Statement Transaction Extractor | Statement Reconcile",
  metaDescription:
    "Extract transactions from a PDF bank statement using the column geometry of the page. Wrapped rows are rejoined and the totals are checked before you pay.",
  eyebrow: "Transaction Extractor",
  h1: "Bank Statement Transaction Extractor",
  intro: [
    "Pulling transactions out of a statement is a layout problem before it is a finance problem. The PDF contains no table: it contains strings placed at coordinates, and the columns you see on screen are an effect of where those strings happen to sit.",
    "This extractor works from that geometry, reconstructs the rows, and then proves its work by re-deriving the closing balance from what it found. Where a layout is genuinely ambiguous it stops and tells you, which is a more useful answer than a plausible table with one wrong number buried in it.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A transaction table in document order, one row per posted line, exported as both an .xlsx workbook and a .csv file.",
    "A Transactions sheet carrying an autofilter and a frozen header, which matters most on the long tables that extraction tends to produce.",
    "A Statement Summary sheet recording the period, the opening and closing balances, total debits and credits, fees, interest, how many transactions were extracted, which reconciliation method ran, its result, and when the file was generated.",
    "CSV columns fixed at Date, Posted Date, Description, Debit, Credit, Amount, Balance, so a script downstream never has to sniff the header.",
  ],
  reconciliation: {
    heading: "The extraction proves itself with arithmetic",
    body: [
      "An extractor cannot inspect its own reading and know that it was right. What it can do is produce a number that only comes out correct if nothing was missed, duplicated, or misread, and the closing balance is exactly that number.",
      "Once the rows are built, a separate pass totals the debits and credits and steps from the opening balance to the closing figure. Where the statement prints a running balance on every line, the chain is walked row by row instead, which localises a break to the transaction where it started. Where the statement prints stated totals for debits and credits, those are compared too.",
      "The arithmetic is ordinary decimal maths in our own code, deliberately independent of whatever read the page. Its result appears on screen with the figures behind it, before a payment step exists at all.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Load the PDF",
      detail:
        "The statement is opened in your browser. The file stays there; only its text layer is passed on for parsing.",
    },
    {
      title: "Text runs are grouped into columns",
      detail:
        "Horizontal positions are clustered to locate the column boundaries, which is what allows a bare number to be identified as a debit, a credit, or a balance.",
    },
    {
      title: "Rows are assembled",
      detail:
        "Runs sharing a baseline become a row, continuation lines are folded back into the description above them, and repeated page furniture is discarded.",
    },
    {
      title: "The table is verified",
      detail:
        "Totals are recomputed and compared with the printed balances and subtotals, or the running balance chain is walked line by line.",
    },
    {
      title: "Preview, then unlock",
      detail:
        "You read the summary and the first rows, and pay $19 only if the verification passed.",
    },
  ],
  sections: [
    {
      heading: "Columns are positions, not fields",
      body: [
        "Consider a line that reads 12 MAR CARD PAYMENT 4471 84.20 1,209.55. Nothing in that text says which figure is the transaction and which is the balance. The only thing distinguishing them is that one sits beneath the heading Paid Out and the other sits beneath Balance, several centimetres to the right.",
        "So the extractor measures. It collects the horizontal extent of every text run on the page, clusters them, and works out where the column edges fall. A number is then classified by the column it occupies rather than by its place in the sentence, which is why a statement with an empty debit column on one line and an empty credit column on the next is read correctly instead of shifting every value leftwards.",
      ],
      bullets: [
        "Column edges are derived from the page, so a layout we have never seen still resolves",
        "An empty cell stays empty instead of pulling the following value into its place",
        "Right-aligned amounts are matched on their right edge, which is where a currency column actually lines up",
        "Balance columns are told apart from amount columns by position, not by which number happens to be larger",
      ],
    },
    {
      heading: "Rows that are not one line, and lines that are not rows",
      body: [
        "Descriptions overflow. A long reference — a card acceptor name, an internal transfer note, a standing order reference — wraps onto a second and occasionally a third line with no amount beside it. Read naively, each of those becomes a transaction worth nothing, and the row count stops matching the number of transactions on the statement.",
        "The extractor rejoins them. A line carrying description text but no figure in any amount column cannot be a transaction of its own, so its text is appended to the row above. The reverse case is handled as well: page headers, column headings repeated at the top of each continuation page, account numbers, page numbers, and carried-forward markers all look like rows and are none of them. They are recognised as furniture and kept out of the table, while the balances they carry are still used for the check.",
      ],
    },
    {
      heading: "Refusing is a feature",
      body: [
        "There are statements where the geometry is genuinely undecidable: two amount columns close enough that their clusters overlap, a section with no heading and no balance to anchor it, a document that turns out to hold two accounts with their balance chains interleaved. A guess in that situation produces a table that looks completely normal.",
        "In those cases the extractor stops. You are told what it could not resolve, and no payment step is offered, because a table nobody can vouch for is not worth $19. That is the same rule the reconciliation check follows: if the arithmetic will not close, the answer is no rather than probably.",
        "It is worth being precise about what a passing check means. A statement that reconciles has been read consistently with the totals its bank printed. That is an arithmetic result about the extraction, not a verdict on the document itself.",
      ],
    },
  ],
  commonIssues: [
    "Continuation pages that repeat the column headings, dropping a header row into the middle of the data",
    "Wrapped reference text read as extra transactions with no value",
    "Carried-forward and brought-forward balance lines counted as if they were transactions",
    "Section headings such as Direct Debits mistaken for the description of the first row beneath them",
    "Footers, page numbers, and promotional text drifting into the description column",
  ],
  supported: [
    "Layouts with separate paid-in and paid-out columns, and layouts with a single signed amount column",
    "Statements with a running balance on every line, and statements with only opening and closing figures",
    "Transactions grouped under section headings that carry their own subtotals",
    "Multi-page statements up to 50 pages, with rows kept in the order they were printed",
    "Descriptions that wrap over two or more lines",
  ],
  unsupported: [
    "PDFs with no text layer, where there are no text runs to measure",
    "Encrypted PDFs that have not been unlocked and re-saved",
    "Statements holding two or more accounts, which have no single balance chain to follow",
    "Layouts where the printed figures are too sparse to confirm the extraction, such as a statement with no closing balance and no subtotals",
  ],
  faqs: [
    {
      question: "How does the extractor decide that a number is a debit rather than a credit?",
      answer:
        "By where it sits on the page. Column boundaries are measured from the text runs on the statement, and each figure is classified by the column it falls in. Nothing is inferred from words like payment or transfer in the description, because those turn up on both sides.",
    },
    {
      question: "What happens to a description that wraps onto the next line?",
      answer:
        "It is appended to the row above. A line with description text but no figure in any amount column cannot be a transaction in its own right, so it is folded back into the transaction it belongs to and the row count stays honest.",
    },
    {
      question: "Why would the extractor refuse a statement it can clearly read part of?",
      answer:
        "Because partial is the dangerous case. If one section cannot be placed, the rest of the table may be perfect and you have no way to tell which part is not. Returning nothing is better than returning something you would have to audit line by line.",
    },
    {
      question: "Are the rows in the same order as the statement?",
      answer:
        "Yes. Document order is preserved across pages, so the extracted table reads downwards in the same sequence as the PDF and the two can be compared side by side.",
    },
    {
      question: "Does this work on banks you have never seen before?",
      answer:
        "It should, because it works from the geometry of the page rather than from a template per bank. A layout that puts its columns somewhere unusual still gets measured, and the arithmetic check afterwards is what tells you whether the measuring worked.",
    },
  ],
  related: [
    {
      href: "/pdf-bank-transaction-extractor",
      label: "PDF bank transaction extractor",
      context: "What a PDF has to contain before extraction is possible at all.",
    },
    {
      href: "/bank-statement-converter",
      label: "Bank statement converter",
      context: "The general overview, if you mainly want the finished spreadsheet.",
    },
    {
      href: "/how-it-works",
      label: "How it works",
      context: "Each stage in sequence, including where the check happens and what it reports.",
    },
    {
      href: "/security",
      label: "Security",
      context: "Where the file is read, what is sent for parsing, and what is not kept.",
    },
  ],
  futureExpansion: [
    "An annotated page showing measured column boundaries on an anonymised statement",
    "A note on how section subtotals are matched to the rows beneath them",
    "Examples of layouts that were refused, and the reason each one was undecidable",
  ],
};
