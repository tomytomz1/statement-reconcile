import type { SeoPage } from "./types";

export const convertBankStatementToCsv: SeoPage = {
  slug: "convert-bank-statement-to-csv",
  targetQuery: "convert bank statement to csv",
  searchIntent:
    "A bookkeeper, accountant, or business owner who needs a period of transactions inside a ledger and wants the import to be right the first time.",
  title: "Convert Bank Statement to CSV | Statement Reconcile",
  metaDescription:
    "Get a whole period of transactions into your ledger as a CSV. A verified export means one clean import instead of a second pass hunting for a missing row.",
  eyebrow: "For bookkeeping workflows",
  h1: "Convert a bank statement to CSV",
  intro: [
    "In a bookkeeping context, a CSV is rarely the destination. It is the thing that gets a period of transactions into a ledger so the actual work — categorising, matching, reconciling — can begin. Anything wrong with the file at that point does not stay in the file; it propagates into the accounts and has to be unpicked later.",
    "This conversion is built around that reality. The export has a stable shape that an import mapping can rely on month after month, and the rows are tested against the balances printed on the statement before the file is released, so the period you are bringing in is the period the bank says it is.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A transaction-only CSV with no preamble or footer rows, so an import routine can start reading at the header line.",
    "The same seven columns in the same order every time — Date, Posted Date, Description, Debit, Credit, Amount, Balance — so a saved field mapping keeps working across periods.",
    "Both a two-column debit and credit representation and a single signed amount, letting you map whichever your ledger expects without a preparation step.",
    "An Excel workbook alongside the CSV, whose summary sheet holds the period, balances, totals, fees, interest, transaction count, and the reconciliation outcome as a record for the file.",
  ],
  reconciliation: {
    heading: "Two different reconciliations, and why you still need both",
    body: [
      "There is a reconciliation you perform in your ledger: matching what the accounts say against what the bank says, chasing the differences, and signing the period off. Nothing here replaces that, and nothing here should be mistaken for it.",
      "What happens before you download is narrower and comes earlier. The rows recovered from the statement are added up in our own code, using plain decimal arithmetic, and compared with the figures printed on the document — the opening and closing balances, or a card's previous and new balance, and where available the running balance beside each line or the stated totals for the period.",
      "The purpose is to establish that the data entering your ledger matches the source document before you start working with it. It means a difference you find later is a real difference in the books, not an artefact of a transaction that never made it out of the PDF. If that check does not pass, the payment step is not shown at all.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Start with the statement for the period",
      detail:
        "One PDF, one account, one period. The file is read in the browser and is not uploaded; only its extracted text is sent for parsing and it is not stored afterwards.",
    },
    {
      title: "Confirm the period on screen",
      detail:
        "The statement dates and balances are shown in the preview, which is the quickest way to catch the wrong month before it reaches the ledger.",
    },
    {
      title: "Check the totals against the document",
      detail:
        "The extracted rows are summed and set against the printed balances, so the completeness of the period is settled before anything is imported.",
    },
    {
      title: "Review the result and take the CSV",
      detail:
        "One payment per conversion pack, with one or more statements and up to 50 total pages. There is no subscription or account, and the Excel workbook and verification reports are included.",
    },
    {
      title: "Map the columns once",
      detail:
        "Because the column order does not change between statements, the mapping you configure in your accounting software is reusable for every subsequent period.",
    },
  ],
  sections: [
    {
      heading: "Getting a period of transactions into a ledger",
      body: [
        "A bank feed handles this invisibly when one is available. The situations that bring people here are the ones where it is not: an account closed before anyone thought to connect it, a portal that only exposes ninety days of history, a client who arrives with a folder of PDFs covering the last financial year, or a period that predates the feed being switched on.",
        "In all of those cases the PDF is the record of account, and the task is to turn it into rows without introducing anything the bank did not say. That is a narrower job than it sounds, because the failure everyone worries about is not a mangled description — it is a transaction that quietly did not come across.",
      ],
    },
    {
      heading: "Why a verified export saves a second pass",
      body: [
        "Consider what normally follows an unverified import. The period goes in, the ledger is reconciled against the closing balance, and it comes out short by an odd amount. At that point you cannot tell whether the ledger is missing an entry, the bank posted something you have not recorded, or the conversion dropped a line. Each possibility is investigated in a different place, and the investigation costs more than the original import did.",
        "Testing the extraction against the statement's own figures before the file is released eliminates one of those three branches entirely. If the rows you imported reconcile to the printed balances, the discrepancy in the ledger is a bookkeeping question rather than a data question, and you can go straight to the entries instead of re-reading a PDF line by line to find the row that went missing.",
      ],
    },
    {
      heading: "Working through a backlog of periods",
      body: [
        "Catch-up work has its own rhythm. A stack of statements is usually processed in date order, one period at a time, with each import checked before the next begins — partly because the closing balance of one period should meet the opening balance of the next, which gives you a natural checkpoint at every boundary.",
        "Each file is extracted and verified against its own opening and closing figures. One paid conversion pack may contain several independently verified statements, up to 50 total pages combined.",
      ],
      bullets: [
        "Work in date order so each period's opening balance can be checked against the last one's closing balance",
        "Import one period at a time rather than concatenating several CSVs before the first import",
        "Keep the Excel summary sheet with the working papers as a record of what was checked and when",
        "Watch the period boundaries for transactions dated in one month but posted in the next",
        "Confirm the account and currency in the preview before importing, particularly when handling several clients in a session",
      ],
    },
  ],
  commonIssues: [
    "Overlapping statement periods causing the same transaction to be imported twice",
    "Imports that assume a single amount column when the ledger expects separate debit and credit fields",
    "Descriptions truncated by the importing software, leaving several distinct payees looking identical",
    "Opening balances entered as a transaction rather than as a starting position, throwing the period out by that amount",
    "Foreign-currency transactions listed with both a local and a converted figure, only one of which belongs in the ledger",
  ],
  supported: [
    "Business and personal current accounts, with the statement's own balances used for verification",
    "Savings and deposit accounts where interest is printed as a transaction line",
    "Company card statements, verified with the previous-balance equation",
    "Historic periods that a bank feed can no longer reach, provided the PDF still has its text layer",
    "Statements of up to 50 pages per conversion, one account at a time",
  ],
  unsupported: [
    "Batch processing of several statements in a single run",
    "Scanned or photographed documents with no extractable text",
    "Files containing more than one account, which have no single balance pair to verify against",
    "Password-protected statements that have not been unlocked first",
  ],
  faqs: [
    {
      question: "Will the file import into my accounting software?",
      answer:
        "Most packages accept a CSV and let you map the columns to their own fields, and the fixed column order means you configure that mapping once. We cannot guarantee behaviour in every product, so it is worth running one period through before committing a backlog.",
    },
    {
      question: "Does your check replace the bank reconciliation I do in the ledger?",
      answer:
        "No, and it is not intended to. Ours confirms that the extracted rows agree with the figures printed on the statement. Yours confirms that the books agree with the bank. The first makes the second easier to trust, but it does not do it for you.",
    },
    {
      question: "How should I handle a year of statements for one client?",
      answer:
        "Add the statements in date order to one pack, within the 50-page combined limit. Each period is verified against its own printed balances, so you can also confirm that each closing balance meets the next opening balance.",
    },
    {
      question: "What if some of these transactions are already in the ledger?",
      answer:
        "That is an import question rather than an export one. Most software offers a review stage before entries are posted; matching on date, amount, and description before committing is the usual way to avoid duplicating a period that was partly entered by hand.",
    },
    {
      question: "Should I keep the original PDF after converting?",
      answer:
        "Yes. The statement remains the source document for your records, and the CSV is a derived copy of it. Keeping the Excel summary sheet alongside it also preserves a note of which reconciliation method was applied and what it returned.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "The technical detail of the file itself: column order, encoding, and description handling.",
    },
    {
      href: "/credit-card-statement-to-csv",
      label: "Credit card statement to CSV",
      context:
        "Card statements balance on a different equation, which matters when a company card is part of the backlog.",
    },
    {
      href: "/convert-bank-statement-to-excel",
      label: "Convert a bank statement to Excel",
      context: "If the period is going to be reviewed by a person before it is posted anywhere.",
    },
    {
      href: "/how-it-works",
      label: "How it works",
      context: "The full sequence from opening the PDF to the verification result, in order.",
    },
  ],
  futureExpansion: [
    "A practical guide to catch-up bookkeeping from a folder of PDF statements",
    "Notes on mapping the seven columns into the import formats used by common ledger packages",
    "An article on period boundaries and transactions that post in the following month",
  ],
};
