import type { SeoPage } from "./types";

export const extractTransactionsFromPdf: SeoPage = {
  slug: "extract-transactions-from-pdf",
  targetQuery: "extract transactions from pdf",
  searchIntent:
    "Someone who has tried copying a transaction table out of a PDF, watched it collapse, and wants to understand why the file behaves that way before deciding what to use.",
  title: "Extract Transactions from PDF | Statement Reconcile",
  metaDescription:
    "How transactions are recovered from a PDF: text at coordinates, column clustering, wrapped descriptions, and right-aligned amounts rebuilt into real rows.",
  eyebrow: "How the extraction works",
  h1: "Extract transactions from a PDF",
  intro: [
    "A PDF is a page-description format. It records what to draw and where to draw it, which is why it looks identical everywhere and why the table you can plainly see is not a table as far as the file is concerned. There are no cells, no column definitions, and no rows — only fragments of text, each with a position.",
    "Extraction means reconstructing the table from those positions. This page explains what that involves, where it goes wrong, and why the arithmetic check at the end is not an optional extra but the only practical way to know whether the reconstruction was faithful.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "One row per transaction, with the date, description, direction, amount, and running balance separated into their own fields rather than left as one line of text.",
    "Dates rewritten as YYYY-MM-DD after the day and month order has been established from the document itself.",
    "Amounts as exact decimal values with thousands separators removed, negatives resolved from whichever notation the statement used, and no floating-point arithmetic anywhere in the pipeline.",
    "A CSV with the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, and an Excel workbook containing the same rows plus a Statement Summary sheet.",
  ],
  reconciliation: {
    heading: "Reconstruction cannot be self-verifying, so it is verified against the page",
    body: [
      "Every step described below is an inference. Which fragments belong to the same line, where one column ends and the next begins, whether a second line of text is a new transaction or the tail of the previous description — none of these are stated in the file, and all of them are decided from geometry. An inference can be wrong while looking entirely reasonable, and a reconstructed table gives no sign of which of its rows were guesses.",
      "What makes statements tractable is that they carry their own answer key. A bank prints an opening balance, a closing balance, and often subtotals or a running balance, and those figures were computed from the same transactions the page lists. So once the rows have been rebuilt, a separate deterministic routine in our own code adds them back up with exact decimal arithmetic and tests the result against what was printed. That routine sees only numbers; it has no access to the reasoning that produced them and cannot be argued into agreeing.",
      "A row dropped by a bad line grouping changes the sum. A row duplicated by a mishandled page break changes the sum. A decimal misplaced by a misread column boundary changes the sum. One test catches the whole family at once, which is why it runs before the paywall exists rather than being left to you.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Read the text layer with its geometry",
      detail:
        "pdf.js is used in your browser to walk the content stream and produce text fragments together with their positions on the page. The PDF itself never leaves your machine; only these positioned fragments are sent onward for parsing.",
    },
    {
      title: "Group fragments into visual lines",
      detail:
        "Fragments sharing a baseline within a small vertical tolerance belong to the same printed line. Tolerance matters because superscripts, footnote markers, and slightly different font sizes shift a baseline without starting a new line.",
    },
    {
      title: "Cluster horizontal positions into columns",
      detail:
        "Across the whole document, fragment positions fall into bands with gaps between them. Those bands are the columns. Deriving them from the full document rather than one line means a short line with an empty column does not shift everything after it.",
    },
    {
      title: "Classify the columns and rejoin what wrapped",
      detail:
        "Each band is identified by the shape of what it contains — dates, amounts, or narrative — and lines carrying no date and no amount are attached to the transaction above them instead of becoming rows.",
    },
    {
      title: "Recompute the arithmetic and compare",
      detail:
        "The rebuilt rows are summed and tested against the printed balances, any stated totals, and the running-balance chain where the statement provides one.",
    },
    {
      title: "Review the verdict, then pay if it holds",
      detail:
        "The equation, figures, and ten sample rows are shown before any payment step. The billing screen unlocks both files for a verified pack; if reconstruction cannot be reconciled, the paywall never appears.",
    },
  ],
  sections: [
    {
      heading: "Why copying and pasting produces one useless column",
      body: [
        "When you select a statement table in a PDF reader and paste it elsewhere, the reader has to serialise two-dimensional content into a one-dimensional stream. It walks the text in roughly the order the file draws it and inserts line breaks where it thinks a line ended. Column structure is not part of what it emits, because column structure was never in the file to begin with.",
        "The result is text in approximately the right sequence with every boundary destroyed. A date, a merchant name, and an amount arrive as one run of characters with a space or a tab between them if you are lucky, and the tab positions are inconsistent because they were derived from pixel gaps rather than from a grid. Splitting that back apart with a delimiter fails on the first description containing a space, which is all of them.",
        "The information you need was in the coordinates, and pasting is precisely the operation that throws the coordinates away. Extraction has to work with them instead.",
      ],
      bullets: [
        "The file stores drawing instructions, not a table structure",
        "Reading order in the content stream need not match visual order on the page",
        "A single printed word can be emitted as several fragments where kerning was adjusted",
        "Whitespace between columns is a gap in position, not a character in the file",
      ],
    },
    {
      heading: "Column clustering, and the tyranny of the right edge",
      body: [
        "Description text is set from a left margin, so its fragments start at a consistent horizontal position. Amounts are not: they are right-aligned so that decimal points line up, which means the position where an amount begins depends on how many digits it has. A payment of 9.50 and a payment of 14,320.75 start in completely different places and end in the same one.",
        "Any approach that clusters on where text starts will therefore scatter a single amount column across several apparent columns, and will do it worst on exactly the statements that mix small and large figures. The stable anchor for a numeric column is its right edge, or equivalently the position of its decimal separator. Getting that right is the difference between one amount column and four fragments of one.",
        "The same reasoning explains a subtler failure. When two numeric columns sit close together — an amount and a running balance, say — a wide figure in the left column can reach into the horizontal band of the right one. Deriving the band boundaries from the whole document, where the pattern is visible across hundreds of lines, is more robust than deciding them line by line.",
      ],
      bullets: [
        "Left-aligned text clusters on its start position; right-aligned numbers cluster on their end position",
        "Decimal separator alignment is often the most reliable signal in a numeric column",
        "Column bands derived document-wide survive lines where a column is empty",
        "A wide figure can overlap the band of a neighbouring column and must not be reassigned to it",
      ],
    },
    {
      heading: "Wrapped descriptions, page breaks, and where the sign lives",
      body: [
        "The hardest structural problem is deciding what constitutes a row. A transaction is not one printed line. A long merchant narrative, a payment reference, or a card number fragment can wrap onto a second or third line, and those continuation lines have a date column that is empty and an amount column that is empty. Treated naively they become extra transactions with no money attached, which inflates the row count and tells you nothing about whether the amounts are right.",
        "Page boundaries add their own version of the problem. A statement repeats its column headers, its account number, and often a carried-forward subtotal on every page. Those are page furniture, not transactions, and a carried-forward figure counted as a credit will break the arithmetic even when every real row was extracted correctly. Conversely, a transaction whose description wraps across a page break has to be rejoined across that boundary.",
        "Then there is the question of direction, which is not always printed next to the number. Some statements use two columns and the sign is positional. Some use one column and the sign is notational — a leading minus, a trailing minus, parentheses, or a CR or DR marker. Some print neither, and group transactions under a heading such as Payments or Purchases, so the sign belongs to the section rather than the row and has to be carried down until the next heading. All three conventions have to mean the same thing by the time the row is written out.",
      ],
      bullets: [
        "A continuation line has no date and no amount, and belongs to the transaction above it",
        "Repeated headers, account numbers, and carried-forward figures must be recognised as furniture",
        "Section headings can be the only carrier of direction for the rows beneath them",
        "A trailing minus, a leading minus, parentheses, and a DR marker all have to resolve to the same sign",
      ],
    },
  ],
  commonIssues: [
    "Kerning splitting one printed number into two fragments, so 1,240.00 arrives as separate pieces to be rejoined",
    "Right-aligned amounts of different widths being read as belonging to different columns",
    "Continuation lines of a wrapped description counted as transactions with a missing amount",
    "Carried-forward subtotals at a page break added into the period total as if they were transactions",
    "Two transactions on the same day collapsing into one where the date is printed only once",
    "A section heading such as Payments or Fees being the only indication of a row's direction",
  ],
  supported: [
    "PDFs containing a real text layer, which is what online banking downloads normally produce",
    "Layouts with separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
    "Running balance columns, which allow the stricter chain-continuity check",
    "Parenthesised negatives, leading and trailing minus signs, CR and DR markers, and comma or dot decimal separators",
    "Multiple date formats, with day and month order established from the document",
    "Documents up to 50 pages and 20 MB in a single conversion",
  ],
  unsupported: [
    "Image-only PDFs, whether scanned or photographed, since there is no character recognition in this version",
    "Password-protected PDFs, which have to be unlocked in a reader and re-saved first",
    "Documents containing more than one account, which have no single ledger to reconcile",
    "Statements whose printed figures are insufficient to verify what was extracted",
    "Files that are not PDFs",
  ],
  faqs: [
    {
      question: "I can select the text in my statement, so why does pasting still ruin the table?",
      answer:
        "Selecting proves a text layer exists; pasting discards the part you need. The copy operation flattens the page into a stream of characters and drops the coordinates that defined the columns, so what arrives is the right words with every boundary lost.",
    },
    {
      question: "How are column boundaries found when later pages print no header row?",
      answer:
        "From the distribution of text positions across the whole document rather than from headers. Columns show up as bands of positions with empty gaps between them, and that pattern is present on every page whether or not a header is repeated.",
    },
    {
      question: "Two numbers sit on the same line. How is the amount told apart from the balance?",
      answer:
        "By which horizontal band each one occupies, established document-wide, and then tested arithmetically. If the assignment were reversed the running-balance chain would stop being continuous, which is one of the checks performed before the file is released.",
    },
    {
      question: "Do you hold a stored layout template for each bank?",
      answer:
        "No. Nothing here is keyed to an institution. The extraction works from the geometry of whatever document you provide, and the printed balances on that same document decide whether the result is trustworthy.",
    },
    {
      question: "Why does adding up a column require exact decimal arithmetic?",
      answer:
        "Because binary floating point cannot represent most decimal fractions exactly, and summing hundreds of them accumulates small errors. A verification step that reports a difference of a fraction of a cent it created itself is worse than no verification at all.",
    },
  ],
  related: [
    {
      href: "/bank-statement-transaction-extractor",
      label: "Bank statement transaction extractor",
      context:
        "The same machinery framed around statements specifically rather than the file format.",
    },
    {
      href: "/pdf-bank-transaction-extractor",
      label: "PDF bank transaction extractor",
      context: "What can and cannot be extracted, including text layers versus scans.",
    },
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context: "The output side: how the rebuilt table is written into a workbook.",
    },
    {
      href: "/how-it-works",
      label: "How the reconciliation check works",
      context: "Where verification sits relative to extraction, and what happens when it fails.",
    },
  ],
  futureExpansion: [
    "An annotated diagram of one anonymised statement page with the derived column bands drawn over it",
    "A note on why reading order in a PDF content stream can differ from visual order on the page",
    "A comparison of column clustering on left-aligned narrative text against right-aligned numeric columns",
  ],
};
