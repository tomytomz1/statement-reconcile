import type { SeoPage } from "./types";

export const catchUpBookkeepingBankStatements: SeoPage = {
  slug: "catch-up-bookkeeping-bank-statements",
  targetQuery: "catch-up bookkeeping bank statements",
  searchIntent:
    "Someone facing months or years of unposted books who has the bank statements as PDFs and needs the historical transactions as data, and who is trying to work out the order of operations before starting.",
  title: "Catch-Up Bookkeeping From Old Bank Statements",
  metaDescription:
    "Turn months of old PDF bank statements into usable bookkeeping data. Convert each period, check the balances join up, and post from verified transactions.",
  eyebrow: "Historical bookkeeping",
  h1: "Turn Months of Old Bank Statements Into Usable Bookkeeping Data",
  intro: [
    "Catch-up work has a specific shape. The books stopped at some point, the bank feed will not reach back that far, and what exists instead is a run of monthly PDF statements covering the gap.",
    "The transactions in those statements are already complete and already correct. The job is to get them into a form you can post from, without introducing an error in the process and without spending the evening checking a converter's output line by line.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "One Excel workbook and one CSV per statement, so each period stays its own file and can be posted, reviewed, or corrected independently.",
    "A Statement Summary sheet per statement recording the period, the printed opening and closing balances, and the result of every check that ran.",
    "The CSV column order is fixed — Date, Posted Date, Description, Debit, Credit, Amount, Balance — which matters when you are mapping a dozen files into the same import template.",
    "A pack manifest listing every statement in the conversion, which is the quickest way to confirm afterwards that you converted the months you meant to.",
  ],
  reconciliation: {
    heading: "The check that matters most in a multi-month conversion",
    body: [
      "A single converted statement can be sanity-checked by eye. A year of them cannot, and that is exactly the situation where a missing page does the most damage: it lands in the middle of a period nobody is looking at closely, and it surfaces months later as a reconciliation that will not close by an amount nobody can place.",
      "Each statement is verified on its own before it can be bought. The extracted rows are re-added with exact decimal arithmetic and compared against the balances the bank printed on that document — opening to closing, the running-balance chain where one is present, and any stated totals. A statement that does not close is rejected rather than sold.",
      "There is a second check that is yours rather than ours, and it is worth doing deliberately. Once the statements are converted, read the closing balance of each period against the opening balance of the next. They should be identical. Where they are not, a statement is missing from the run, and it is far cheaper to discover that before posting than after.",
    ],
    equation: "Closing balance of one period = opening balance of the next",
  },
  steps: [
    {
      title: "Collect the full run before converting anything",
      detail:
        "Work out the first and last month you actually need and confirm every month between them is present. A gap found now costs an email to the client; a gap found after posting costs a reconciliation.",
    },
    {
      title: "Download originals from online banking, not scans",
      detail:
        "A PDF saved directly from the bank has a text layer. A photograph or a scan of a paper statement does not, and this version performs no character recognition.",
    },
    {
      title: "Convert in packs of up to 50 pages",
      detail:
        "Group several months into one conversion. Each statement inside the pack is verified separately, so one bad month is rejected on its own rather than blocking the rest.",
    },
    {
      title: "Check the periods join before you post",
      detail:
        "Read each statement's closing balance against the next one's opening balance. Continuous balances across the run are the evidence that no statement is missing.",
    },
    {
      title: "Post from the converted data, keep the verification",
      detail:
        "The Statement Summary sheet travels inside the workbook and records how each period was checked, which is what a reviewer or a later query will ask for.",
    },
  ],
  sections: [
    {
      heading: "Why the bank feed cannot rescue a catch-up job",
      body: [
        "Accounting software bank feeds are built for keeping current books current, not for reconstructing old ones. Most institutions expose only a limited window of history to the feed — commonly ninety days, sometimes a year — and the connection cannot reach behind it no matter how long the feed has been running.",
        "That limit is invisible until you need it. A business that connected its feed in March and stopped posting in the previous November will find the feed offering nothing for the months that actually matter. The statements, meanwhile, go back as far as the bank keeps them, which is usually years.",
        "There is a second trap in re-connecting a feed to fix history: some software will pull whatever the feed offers and create duplicates against transactions already posted by hand. Converting the statements to a file you control avoids that, because you decide what gets imported and over what date range.",
      ],
      bullets: [
        "Feeds typically expose 90 days to a year of history, regardless of connection age",
        "Closed accounts produce no feed at all, while their statements remain downloadable",
        "Re-connecting a feed can duplicate transactions already posted manually",
        "A converted file lets you control the date range being imported",
      ],
    },
    {
      heading: "Sequencing a year of statements without leaving a gap",
      body: [
        "The failure mode in a long catch-up is not usually a wrong amount. It is a missing month, or two months converted twice, or a period boundary that does not line up with the client's year end. All three are cheap to prevent and expensive to discover late.",
        "Statement periods rarely align with calendar months. A statement running from the 12th to the 11th is common, and it means the run you need for a financial year is not simply twelve files with twelve month names. Read the actual period from each document rather than trusting the filename, which is often just a download date.",
        "Once converted, the continuity check is mechanical: sort the statements by period start, then confirm each closing balance equals the next opening balance. The Statement Summary sheet in each workbook prints both figures, so the check takes a few minutes for a year and does not require opening the PDFs again.",
      ],
      bullets: [
        "Read the period from the statement itself, not the filename",
        "Sort by period start before checking continuity",
        "Each closing balance should equal the following opening balance exactly",
        "A break in that chain means a missing statement, not a conversion error",
      ],
    },
    {
      heading: "What conversion does not do for you",
      body: [
        "Converting statements produces accurate transaction data. It does not produce books. Coding, categorisation, matching against invoices and bills, handling transfers between accounts so they do not appear as income and expense twice, and deciding the treatment of anything unusual all remain judgment work, and they are the part of a catch-up engagement that is actually worth billing.",
        "It also does not reconcile anything in the accounting sense. The arithmetic check confirms the extracted rows agree with the figures printed on the statement supplied. Reconciling the client's ledger against the bank is a separate exercise performed against the client's records, and it is the one that matters for the accounts.",
        "The point of removing the transcription is that it removes the least valuable hours from the engagement while also removing the risk that those hours introduce a silent error into everything built on top of them.",
      ],
    },
  ],
  commonIssues: [
    "A month missing from the middle of the run, visible as a break between one closing balance and the next opening balance",
    "Statement periods that do not align with calendar months, so a financial year needs thirteen files rather than twelve",
    "Filenames that record the download date rather than the statement period, making the run look complete when it is not",
    "Overlapping periods where a client has downloaded both a monthly statement and a custom date-range export of the same transactions",
    "Older statements only available as scans, because the bank's online archive has aged out the original PDFs",
    "Transfers between two of the client's own accounts appearing in both converted files, which will double-count unless matched",
  ],
  supported: [
    "Personal and business current, checking, and savings statements with a dated transaction table",
    "Credit card statements, verified against the previous-balance roll-forward",
    "Several months grouped into one conversion pack, up to 50 pages in total",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
  ],
  unsupported: [
    "Scanned or photographed statements, as this version performs no character recognition",
    "Password-protected PDFs, which must be re-saved without the password first",
    "A single document covering more than one account, which has no single ledger to reconcile",
    "Runs longer than 50 pages in one pack, which have to be split across more than one conversion",
    "Any automatic posting, coding, or matching — the output is data, not bookkeeping",
  ],
  faqs: [
    {
      question: "How many months can I convert at once?",
      answer:
        "As many as fit inside 50 total pages for a single pack. Twelve monthly personal statements of three or four pages each fit comfortably; a year of dense business statements usually needs splitting across two or three packs. The page count is checked before anything is charged.",
    },
    {
      question: "How do I know I have not missed a statement?",
      answer:
        "Compare each period's closing balance against the next period's opening balance. Both figures are printed on the Statement Summary sheet of every workbook. If the chain is continuous across the whole run, no statement is missing from it.",
    },
    {
      question: "The oldest statements I need are only available as scans. What now?",
      answer:
        "Those cannot be converted here — there is no character recognition in this version, so an image-only PDF is rejected rather than guessed at. It is worth asking the bank whether the original PDFs can be reissued for the period, which is often possible even when the online archive no longer shows them.",
    },
    {
      question: "Will this create duplicates against transactions already posted?",
      answer:
        "That depends entirely on what you import and over what range, which is why a file you control is safer here than a re-connected bank feed. Check where the existing books actually stop before importing, and import only from that date forward.",
    },
    {
      question: "Does the conversion reconcile the account for me?",
      answer:
        "No, and the distinction matters. It confirms the extracted rows are arithmetically consistent with the balances printed on the statement. Reconciling the client's ledger against the bank is separate work performed against the client's own records.",
    },
  ],
  related: [
    {
      href: "/bank-feed-history-missing",
      label: "When your bank feed does not go back far enough",
      context: "Why the feed stops where it does, and what the alternatives actually are.",
    },
    {
      href: "/bank-statement-converter-for-bookkeepers",
      label: "Bank statement converter for bookkeepers",
      context: "The professional case: evidence for the working papers, and per-job pricing.",
    },
    {
      href: "/closed-bank-account-statements-to-csv",
      label: "Closed-account bank statements to CSV",
      context: "When the account no longer exists and no export can be produced.",
    },
    {
      href: "/bank-statement-to-quickbooks-csv",
      label: "Bank statement to QuickBooks CSV",
      context: "Preparing the converted data for a manual bank transaction import.",
    },
  ],
  futureExpansion: [
    "A worked example reconstructing a full financial year from thirteen statement periods",
    "Guidance on matching inter-account transfers across two converted statement runs",
    "Notes on deciding an import cut-off date when existing books stop mid-period",
  ],
};
