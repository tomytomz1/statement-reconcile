import type { SeoPage } from "./types";

export const wellsFargoStatementToExcel: SeoPage = {
  slug: "wells-fargo-statement-to-excel",
  targetQuery: "wells fargo statement to excel",
  searchIntent:
    "Someone with a long PDF statement running to many pages who wants the whole period in one spreadsheet without page headers and continuation lines polluting the data.",
  title: "Wells Fargo Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert an eligible Wells Fargo PDF statement to Excel and CSV, including long multi-page files. Independent tool. The totals must reconcile before you pay.",
  eyebrow: "Multi-page statements",
  h1: "Wells Fargo Statement to Excel",
  intro: [
    "A statement running to twenty or thirty pages is not simply a longer version of a two-page one. It carries continuation pages, column headings reprinted at the top of every sheet, per-page subtotals, and footers sitting in the middle of the transaction flow. All of that is text on the page, and none of it is a transaction.",
    "This converter is built to read a long statement as one continuous ledger and then demonstrate that it did so, by re-adding the extracted rows and comparing the sum with the balances printed on the document. Up to 50 pages fit in one conversion pack, and the reconciliation result is shown before billing appears.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "One Transactions sheet holding the entire statement in order, however many pages the original ran to, with an autofilter and a frozen header row.",
    "A Statement Summary sheet giving the period, opening and closing balances, credit and debit totals, fees, interest, the transaction count for the whole document, the reconciliation method, its result, and the generation timestamp.",
    "A CSV with the fixed header Date, Posted Date, Description, Debit, Credit, Amount, Balance and no page-break artefacts: no repeated header lines, no page numbers, no continuation markers.",
    "Both files are included in one payment covering a pack of up to 50 total pages. Pages are not metered and there is no per-page charge.",
  ],
  reconciliation: {
    heading: "A page-boundary mistake shows up in the total",
    body: [
      "The particular risk on a long document is that something structural gets counted as data. A column heading reprinted at the top of page seven is not a transaction. A “total this page” figure is not a transaction. A footer carrying an account identifier is not a transaction. Every one of them is a line of text sitting in roughly the same horizontal band as the real rows.",
      "If any of it leaks into the extracted table, the recomputed total drifts away from the printed closing balance and the check fails. Equally, if a genuine row at a page seam is lost, the total drifts the other way. The arithmetic does not care which of the two mistakes happened; it reports only that the ledger no longer closes.",
      "We do not publish a list of institutions whose statements we have verified, and we could not keep one honest if we tried. Nobody here has examined how Wells Fargo Bank, N.A. builds its documents. The reconciliation run against your own file is what replaces that promise, and it runs before the paywall exists.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Submit the whole statement as one file",
      detail:
        "Send the complete PDF rather than splitting it up. The check depends on covering the full period, from the opening balance to the closing balance.",
    },
    {
      title: "Pages are stitched into one ledger",
      detail:
        "Text is read page by page in your browser, then joined into a single sequence so a transaction table continuing across a page break remains one table.",
    },
    {
      title: "Structural text is filtered out",
      detail:
        "Reprinted column headings, page numbers, continuation markers, and footers are identified as page furniture and excluded from the transaction rows.",
    },
    {
      title: "The full-period arithmetic is run",
      detail:
        "Every extracted row across every page is summed once and compared with the statement's own opening and closing balances.",
    },
    {
      title: "Check the count, then pay",
      detail:
        "The preview reports how many transactions were found across the document. If that number and the balance check both look right, the billing screen unlocks both files.",
    },
  ],
  sections: [
    {
      heading: "Where long statements break converters",
      body: [
        "Most extraction failures on long documents happen within a few lines of a page boundary. The last row on one page and the first row on the next are the two likeliest places for a transaction to be duplicated, dropped, or fused with its neighbour, because that is where the layout's normal vertical rhythm is interrupted.",
        "The second common failure is repetition. Column headings printed once look like headings; printed thirty times they begin to look like data, especially when they sit in the same columns as the values beneath them. A converter that does not recognise them as furniture will emit thirty junk rows — each contributing nothing to any total, and each one something you then have to find and delete.",
      ],
      bullets: [
        "A description that wraps across a page break can be split into two half-rows",
        "Continuation notices and per-page totals occupy transaction-shaped space on the page",
        "Page numbers and account identifiers repeat in the same position on every sheet",
        "Some documents restart the running balance display at the top of each page",
        "Interest, fees, and service charges are often collected in a section at the end rather than in date sequence",
      ],
    },
    {
      heading: "Why the transaction count is worth reading",
      body: [
        "The preview reports how many transactions were extracted. On a three-page statement you could count them yourself; on a thirty-page one you will not, which is exactly why the number is put in front of you.",
        "Many statements also print an activity count of their own somewhere in the summary block. Where one is present, comparing it against the extracted count is a quick independent sanity check that sits alongside the balance equation. The balance check tells you the values are right; the count tells you the population is right. Both being true at once is a considerably stronger statement than either one on its own.",
      ],
    },
    {
      heading: "The 50-page limit and what to do when you hit it",
      body: [
        "One conversion pack covers one or more statements up to 50 total pages. Each file is held and reconciled as its own complete unit; pages are not counted for billing.",
        "If your statement exceeds it, the answer is not to split the file. Half a statement has no printed closing balance to reconcile against, so the check would be meaningless and the output unverifiable. Most institutions issue statements by period, so a shorter period is usually available as its own document, and each of those converts and reconciles on its own terms.",
      ],
    },
  ],
  commonIssues: [
    "Rows lost or duplicated at a page seam, which the balance check surfaces as a mismatch",
    "Reprinted column headings or continuation markers being read as transactions",
    "Fee and interest sections printed out of date order at the end of the document",
    "Statements assembled from a scanner, where no page contains extractable text",
    "A document longer than 50 pages, which has to be converted as a shorter statement period instead",
  ],
  supported: [
    "Eligible multi-page PDF statements, where the text layer can be read and the printed balances allow an independent check",
    "Transaction tables that continue across page breaks, read as one ledger",
    "Documents up to 50 pages, priced and reconciled as a single statement",
    "Layouts that repeat column headings, footers, or per-page subtotals on every sheet",
    "Activity grouped into sections such as deposits, withdrawals, fees, and interest rather than one continuous list",
  ],
  unsupported: [
    "Scanned or image-only pages anywhere in the document",
    "Statements longer than 50 pages in a single file",
    "PDFs that are still password-protected",
    "Files carrying more than one account, and statements lacking the printed balances the check requires",
  ],
  faqs: [
    {
      question: "My statement is 34 pages. Does that cost more?",
      answer:
        "No. One conversion pack may contain one or more statements up to 50 total pages combined. A thirty-four-page pack and a three-page pack carry the same one-time charge shown after verification.",
    },
    {
      question: "Will the export contain the headings that repeat throughout the PDF?",
      answer:
        "It should not. Reprinted headings, page numbers, and continuation markers are treated as page furniture and left out of the transaction rows. If any of it did leak through, it would normally disturb the totals, so the check fails rather than letting you buy a dirty file.",
    },
    {
      question: "Should I split a long statement into smaller PDFs first?",
      answer:
        "No. Splitting removes the opening or closing balance the arithmetic needs, so neither piece can be verified. Convert the complete document, or use a shorter statement period issued as its own file.",
    },
    {
      question: "Do you have a relationship with Wells Fargo?",
      answer:
        "None whatsoever. Statement Reconcile is independent, has no arrangement with Wells Fargo Bank, N.A., and does not represent it. The name appears here only to describe the kind of document readers arrive with.",
    },
    {
      question: "My fees are listed at the end rather than in date order. Is that a problem?",
      answer:
        "No. The equation sums every extracted row across the whole period, so where a row is printed does not change the result. Fees and interest are also reported as their own totals on the summary sheet.",
    },
  ],
  related: [
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context: "What the parser does with a PDF's text layer before any totalling happens.",
    },
    {
      href: "/bank-statement-transaction-extractor",
      label: "Bank statement transaction extractor",
      context: "Focused on pulling the transaction rows out, whatever you do with them next.",
    },
    {
      href: "/chase-statement-to-excel",
      label: "Chase statement to Excel",
      context: "Covers why a downloaded PDF converts and a scanned one does not.",
    },
    {
      href: "/pricing",
      label: "Pricing",
      context: "One payment per conversion pack, up to 50 total pages, with all outputs included.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Wells Fargo Bank, N.A., and we do not act on its behalf or at the direction of any bank.",
  futureExpansion: [
    "Guidance on choosing statement periods when a document would otherwise exceed the 50-page limit",
    "A catalogue of page-furniture patterns and how each is distinguished from a genuine transaction row",
    "A note on comparing the extracted transaction count against an activity count printed on the statement",
  ],
};
