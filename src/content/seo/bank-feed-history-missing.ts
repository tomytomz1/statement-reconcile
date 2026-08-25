import type { SeoPage } from "./types";

export const bankFeedHistoryMissing: SeoPage = {
  slug: "bank-feed-history-missing",
  targetQuery: "bank feed does not go back far enough",
  searchIntent:
    "Someone who has connected a bank feed to their accounting software, discovered it only pulled a few months of history, and is trying to work out how to get the earlier transactions in.",
  title: "Bank Feed Not Going Back Far Enough? What to Do",
  metaDescription:
    "Why bank feeds only pull 90 days to a year of history, what actually extends it, and how to get earlier transactions into your books from PDF statements instead.",
  eyebrow: "Troubleshooting",
  h1: "What to Do When Your Bank Feed Doesn't Go Back Far Enough",
  intro: [
    "You connected the feed expecting the account history and got the last three months. This is the normal behaviour of bank feeds rather than a fault, and reconnecting will not change it.",
    "This page explains why the limit exists, what genuinely extends it, and what to do about the period the feed will never reach.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A CSV per statement with a fixed column order, suitable for the manual import route your accounting software already supports.",
    "An Excel workbook with the same transactions plus a Statement Summary sheet, for reviewing a period before importing it.",
    "Amounts as real numbers with signs preserved, so debits and credits do not need re-deriving after import.",
    "A verification PDF per statement recording which checks ran and what they returned.",
  ],
  reconciliation: {
    heading: "Why an imported historical period deserves a check",
    body: [
      "Transactions arriving through a bank feed have one quiet advantage: they came from the bank's own system, so nobody had to read them off a page. A historical period imported from a converted file does not have that, which is why the conversion is worth verifying rather than trusting.",
      "Each statement is checked before it can be bought. The extracted rows are re-added with exact decimal arithmetic and compared against the balances printed on the statement — opening to closing, the running-balance chain where present, and any stated totals. A statement that does not close is rejected.",
      "There is also a check worth doing on your side once the historical period is in. Compare the closing balance of the last converted statement against the opening position of the earliest feed transaction. If those meet cleanly, the two halves of the history join, and the account has no hole in the middle.",
    ],
    equation: "Last converted closing balance = balance where the feed history begins",
  },
  steps: [
    {
      title: "Find out where the feed actually starts",
      detail:
        "Sort the imported transactions by date and note the earliest one. That date, not the connection date, is the real boundary you are working with.",
    },
    {
      title: "Try the software's own extended-history option first",
      detail:
        "Some accounting packages offer a longer initial pull, or a direct file import of an OFX or QBO downloaded from the bank. If the bank still offers that download for the period, it is less work than converting.",
    },
    {
      title: "Download PDF statements for the remaining period",
      detail:
        "Whatever the feed and the bank's export cannot reach, the statement archive usually can. Download the originals rather than printing or scanning them.",
    },
    {
      title: "Convert and verify the gap period",
      detail:
        "Group the statements into packs of up to 50 pages. Each is verified against its own printed balances before checkout is offered.",
    },
    {
      title: "Import only up to where the feed begins",
      detail:
        "Set the import cut-off at the day before the feed's earliest transaction. Overlapping the two sources is the most common way this job creates duplicates.",
    },
  ],
  sections: [
    {
      heading: "Why the limit exists and what does not fix it",
      body: [
        "The window is set by the bank, not by the accounting software. Institutions expose a fixed slice of history through their data-sharing connections — commonly 90 days, sometimes six months or a year, occasionally more — and the aggregator that powers the feed can only pass on what it is given. The software is not withholding anything.",
        "This means the two instincts everyone has are both wrong. Disconnecting and reconnecting the feed pulls the same window again from the same starting point, so it achieves nothing except a fresh set of duplicate-detection work. Waiting does not help either, because the window rolls forward with the present rather than accumulating behind it — a feed connected for three years still exposes only its institution's window.",
        "What can genuinely extend it is narrower: some banks offer a longer initial history on first connection than on subsequent ones, some accounting packages accept a direct OFX or QBO file downloaded from the bank for a period the feed will not cover, and some institutions expose more history to a business banking connection than a personal one. All three are worth checking before falling back to statements.",
      ],
      bullets: [
        "The window is the bank's limit, passed through by the aggregator",
        "Reconnecting re-pulls the same window and creates duplicate-matching work",
        "The window rolls forward with time rather than accumulating",
        "A direct OFX or QBO download sometimes reaches further than the feed",
      ],
    },
    {
      heading: "Getting the earlier period in without creating duplicates",
      body: [
        "Duplicates are the real hazard in this job, and they are entirely avoidable. They happen when the historical import and the feed both cover the same few days, which produces two entries for every transaction in the overlap and a reconciliation that will not balance until someone finds them all by hand.",
        "The fix is a hard cut-off. Establish the exact date of the earliest transaction the feed delivered, and import historical data only up to the day before it. Do not rely on the software's duplicate detection to sort out an overlap: it matches on amount and date and will happily keep two identical £40 card payments made on the same day, because sometimes those are genuinely two payments.",
        "It is also worth importing one period at a time rather than a whole year at once, and reconciling each before moving to the next. It is slower in the moment and much faster overall, because an error surfaces while you still know which file caused it.",
      ],
      bullets: [
        "Find the earliest feed transaction date before importing anything",
        "Cut the historical import off the day before that date",
        "Do not rely on duplicate detection to resolve a deliberate overlap",
        "Import and reconcile one period at a time",
      ],
    },
    {
      heading: "When the statements are the only route left",
      body: [
        "For a closed account, a migrated platform, or a period beyond anything the bank will export, PDF statements are what remains. They are also the most durable artefact in this whole picture, because they were delivered to the customer rather than held on the customer's behalf.",
        "Converting them produces the same transaction data the feed would have produced, in a file you control, with the date range under your own hand. That control is the part that matters: an import you scope yourself cannot silently overlap something already posted.",
        "The trade is that a converted statement has been read off a page rather than taken from the bank's system, which is why arithmetic verification is not optional here. A converted period that does not close against its own printed balances should not be imported, and it is not offered for sale.",
      ],
    },
  ],
  commonIssues: [
    "Reconnecting the feed in the hope of more history and creating a set of duplicates instead",
    "Assuming the feed start date is the connection date, when it is usually earlier or later",
    "Importing a historical file that overlaps the feed by a few days, producing paired duplicates",
    "Relying on software duplicate detection, which cannot distinguish a genuine repeat payment from an import artefact",
    "Discovering only after import that a statement in the middle of the historical period is missing",
    "Bank OFX or QBO downloads that cover the period but omit the running balance the software wants",
  ],
  supported: [
    "Text-based PDF statements covering any period the bank still makes available",
    "Personal and business current, checking, savings, and credit card statements",
    "Several statements grouped into one conversion pack, up to 50 pages in total",
    "Statements whose layout changes across the run, since each is parsed independently",
  ],
  unsupported: [
    "Connecting to a bank or extending a feed — nothing here logs into any institution",
    "Scanned or photographed statements, as this version performs no character recognition",
    "Direct import into accounting software; the output is a file you import yourself",
    "OFX or QBO output, which is not offered in this version",
    "Password-protected PDFs, which must be re-saved without the password first",
  ],
  faqs: [
    {
      question: "Will disconnecting and reconnecting the feed pull more history?",
      answer:
        "Almost never. The window is set by the bank and is measured backwards from the moment of connection, so a reconnection re-pulls the same slice. What it does reliably produce is a second copy of recent transactions for you to de-duplicate.",
    },
    {
      question: "Why does my feed only go back 90 days when I have been connected for years?",
      answer:
        "Because the window rolls forward rather than accumulating. The connection exposes the institution's fixed slice of recent history at any given moment; it does not build an archive behind it. Transactions the feed delivered previously stay in your books, but the feed itself will not re-offer them.",
    },
    {
      question: "Can I just import a file from the bank instead of converting statements?",
      answer:
        "If the bank still offers a CSV, OFX, or QBO download covering the period, do that first — it is less work and the data comes straight from their system. Statement conversion is for the periods where that download is no longer available.",
    },
    {
      question: "How do I avoid duplicating transactions the feed already brought in?",
      answer:
        "Find the date of the earliest transaction the feed delivered and import historical data only up to the day before it. A hard cut-off is reliable; duplicate detection across a deliberate overlap is not.",
    },
    {
      question: "Does this connect to my bank?",
      answer:
        "No. There is no bank connection anywhere in this tool and no credential is ever requested. It reads PDF statements you already have, in your own browser.",
    },
  ],
  related: [
    {
      href: "/catch-up-bookkeeping-bank-statements",
      label: "Catch-up bookkeeping from old bank statements",
      context: "The full multi-month workflow once you know how far back you need to go.",
    },
    {
      href: "/closed-bank-account-statements-to-csv",
      label: "Closed-account bank statements to CSV",
      context: "When there is no feed to extend because the account no longer exists.",
    },
    {
      href: "/bank-statement-to-quickbooks-csv",
      label: "Bank statement to QuickBooks CSV",
      context: "Preparing a converted period for a manual bank transaction import.",
    },
    {
      href: "/bank-statement-to-xero-csv",
      label: "Bank statement to Xero CSV",
      context: "The equivalent manual import route for Xero.",
    },
  ],
  futureExpansion: [
    "A per-institution table of published feed history windows, once enough are confirmed",
    "A worked example of setting an import cut-off against a live feed",
    "Notes on reconciling the join between a converted period and the feed's earliest transaction",
  ],
};
