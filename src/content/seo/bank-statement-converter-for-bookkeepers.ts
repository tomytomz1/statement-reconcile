import type { SeoPage } from "./types";

export const bankStatementConverterForBookkeepers: SeoPage = {
  slug: "bank-statement-converter-for-bookkeepers",
  targetQuery: "bank statement converter for bookkeepers",
  searchIntent:
    "A bookkeeper, accountant, or tax preparer holding a catch-up or cleanup engagement where the client supplied months of PDF statements instead of usable exports, weighing cost per job, evidence quality, and what happens to client data.",
  title: "Bank Statement Converter for Bookkeepers & Accountants",
  metaDescription:
    "Convert months of PDF bank statements into verified Excel and CSV files for catch-up bookkeeping. Preview the evidence before paying. No subscription.",
  eyebrow: "Catch-up and cleanup work",
  h1: "Catch Up Months of Bookkeeping Without Retyping Bank Statements",
  intro: [
    "Your client sent PDFs instead of usable transaction exports. Convert the historical statements into structured Excel and CSV files, inspect the verification, and move on to the books.",
    "The conversion will not offer checkout until the extracted rows have been re-added and shown to agree with the balances the bank printed. The workbook carries a second sheet recording exactly which checks ran and what they returned, which is the part worth keeping with the workpapers.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet with a frozen header row and an autofilter, amounts held as real numbers with a currency-appropriate number format, and the rows in statement order.",
    "A Statement Summary sheet stating the period, the opening and closing balances, total debits and credits, the reconciliation method applied, the equation used, every individual check performed, the transaction count, and the generation timestamp.",
    "No formulas, no macros, and no external links in the workbook, so it can be attached to a file or circulated without triggering a security warning or breaking when moved.",
    "A CSV with the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, for pushing into a bookkeeping package rather than reading by hand.",
    "Both files come with the one-time pack payment, with no separate charge for either format.",
  ],
  reconciliation: {
    heading: "Evidence you can point at, rather than an assurance you have to give",
    body: [
      "The professional difficulty with any conversion tool is not accuracy in the abstract. It is that you sign off work based on the output, and a tool that produces a plausible spreadsheet gives you nothing to rely on except its reputation. If a row is missing, you are the one who has to explain how it was missed.",
      "The verification here is deliberately mechanical for that reason. After the transaction rows have been extracted, a separate deterministic routine in our own code re-adds them using exact decimal arithmetic and tests the result against the figures printed on the statement: the opening and closing balances, any stated total debits and total credits, the running-balance chain where one is printed, and stated category subtotals on card statements. The routine works on numbers alone and has no visibility of the reasoning that produced them.",
      "The scope of that claim is narrow and worth stating plainly. It establishes that the extracted rows are arithmetically consistent with the figures printed on the document supplied. It does not verify that the document is genuine, does not confirm the bank's own figures, and does not replace the bank reconciliation you perform against the client's books. It removes one specific risk — an incomplete or misread extraction — and it removes it before you have built anything on top of it.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Ask the client for the original download, not a scan",
      detail:
        "The single biggest determinant of success is whether the PDF has a text layer. A file saved from online banking does; a photograph of a paper statement does not, and there is no character recognition in this version to rescue it.",
    },
    {
      title: "Group the months into a pack",
      detail:
        "Several statements can go into one conversion pack, up to 50 pages in total. Each is verified separately against its own printed balances, so a bad month is rejected on its own rather than contaminating the rest.",
    },
    {
      title: "Read the verdict before committing anything",
      detail:
        "The period, the balances, the computed totals, the equation, and a row preview are shown while the files are still locked. Confirm the periods are the ones the engagement needs and that there is no gap between them.",
    },
    {
      title: "Review the pack, then take every output",
      detail:
        "No account, no seat licence, no minimum, nothing to renew. The charge is per conversion pack and includes Excel, CSV, verification reports, and the pack manifest.",
    },
    {
      title: "Keep the Statement Summary sheet with the working papers",
      detail:
        "It is the record of what was converted, over what period, by which method, and with what result — which is what a reviewer or a later query will actually ask for.",
    },
  ],
  sections: [
    {
      heading: "The client gave you the records. The data just happens to be trapped in PDFs",
      body: [
        "Catch-up work rarely arrives tidy. The bank feed does not reach back to the period you need, or the account was closed when the client changed banks, or a previous bookkeeper stopped posting in March and nobody noticed until the tax deadline made it everyone's problem. What survives is a folder of monthly PDFs.",
        "The transactions in those PDFs are complete and already correct. That is the frustrating part: the work is not analysis, it is transcription, and transcription is where a year of books quietly acquires a wrong digit that nobody finds until the reconciliation refuses to close.",
        "Converting them removes the typing. Verifying them removes the second job — the one where you scroll a few hundred clean-looking rows trying to satisfy yourself that a page was not skipped. That second job is the expensive one, because it costs senior attention and produces nothing billable.",
      ],
      bullets: [
        "Bank feed history that does not reach the start of the engagement",
        "Closed or migrated accounts where no export can be produced any more",
        "Cleanup engagements picked up mid-year from incomplete records",
        "Prior-year records reconstructed for a late tax filing",
      ],
    },
    {
      heading: "Keep the proof with the data",
      body: [
        "Most of the value of a converted statement, six months later, is not the transaction list. The client's ledger has the transactions. What is missing by then is the answer to a simple question: how do we know this spreadsheet represented the statement completely?",
        "That is what the summary sheet is for. It records the statement period as read from the document, the opening and closing balances, the totals computed from the extracted rows, which reconciliation method applied and why, the equation in full, each check that was performed with its outcome, the number of transactions, and when the file was produced. It travels inside the workbook, so it cannot be separated from the data it describes by someone forwarding a single file.",
        "For a card statement the method differs, and the sheet says so. Card statements are verified against the previous balance rolling forward to the new balance, and where the issuer prints category totals for payments, purchases, fees, and interest, those are checked individually — which localises a discrepancy to one category rather than reporting only that the period did not close.",
      ],
      bullets: [
        "Statement period and currency as read from the document",
        "Printed balances alongside the totals computed from the extracted rows",
        "The method, the equation, and the pass or fail of each individual check",
        "Transaction count and generation timestamp, for tying the file to a point in time",
      ],
    },
    {
      heading: "Pay for the engagement, not another seat",
      body: [
        "Practice demand for statement conversion is lumpy. Nothing for six weeks, then a new client arrives with fourteen months of PDFs, then nothing again until the next disclosure or the next tidy-up job. A monthly subscription priced for steady use is the wrong shape for that, and the wrong shape in an expensive direction: you pay through the quiet months to have capacity available in the busy ones.",
        "A single charge per conversion pack maps directly onto the work. Statements can be grouped into packs of up to 50 total pages, and when the job is finished the cost stops. There is no seat licence or account to administer.",
        "It is also a cost that behaves properly as a disbursement. A per-pack charge on a specific client's job is straightforward to recharge or absorb as a decision about that engagement, rather than an overhead you have to apportion across everything.",
      ],
      bullets: [
        "No subscription, no minimum term, and nothing to cancel",
        "No seat licence and no user administration, because there are no accounts",
        "One charge covers one or more statements up to 50 total pages in all output formats",
        "Cost attaches to a specific job rather than sitting as a fixed monthly overhead",
      ],
    },
    {
      heading: "Client data, and how little of it moves",
      body: [
        "Handling another party's bank statement raises a question your own risk register will already have an opinion about: where does the document go. The answer here is that it does not go anywhere. The PDF is opened and read inside your browser using pdf.js. It is not uploaded, and there is no copy of it on a server to be retained, indexed, or requested later.",
        "What is transmitted is the positioned text extracted from the page, which is required for the parsing step, and it is not stored once the parsed response has been returned. There is no account, which means no client statement is ever sitting in a document library behind a login, and no credential exists to be shared with a colleague or left behind when someone leaves the firm.",
        "None of that is a substitute for your own assessment. Your obligations to the client and under whichever data protection regime applies to your practice are yours to satisfy, and you should form your own view before putting a client's document through any third-party tool. What we can state factually is the narrow surface area: the file stays on the machine, the extracted text is transient, and there is no stored account or retained document afterwards.",
      ],
    },
  ],
  commonIssues: [
    "Clients sending phone photographs or scans of paper statements, which contain no extractable text",
    "Statement packs that combine a current account, a savings account, and a card into one PDF and so cannot be reconciled as one ledger",
    "PDFs still carrying the delivery password, which must be removed in a reader and the file re-saved before conversion",
    "Summary or year-end documents that report balances and totals without listing individual transactions",
    "Files re-rendered by a document portal or a PDF editor, which sometimes lose the coordinate precision column reconstruction relies on",
    "Statements from a period that has already been partly posted, where an import would duplicate what is in the ledger",
  ],
  supported: [
    "Personal and business current, checking, and savings statements with a dated transaction table",
    "Credit card statements, verified with the previous-balance equation and, where printed, category subtotals",
    "Several statements in one pack, up to 50 pages and 20 MB per file",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
    "Statements in currencies using a comma decimal separator, and descriptions containing accented or non-Latin characters",
  ],
  unsupported: [
    "Any account, portal, saved history, or API — there is nothing to log in to and nothing stored to return to",
    "Scanned and image-only PDFs, as this version performs no character recognition",
    "Password-protected PDFs, non-PDF files, and single documents covering more than one account",
    "Statements whose printed balances and subtotals are not sufficient to verify the extraction",
    "Packs larger than 50 total pages, which have to be split across more than one conversion",
  ],
  faqs: [
    {
      question: "Is there a firm licence, a seat count, or a minimum commitment?",
      answer:
        "None of the three. The only charge is the one-time amount shown for a verified conversion pack. Nobody needs to be set up as a user, there is no annual renewal, and a month in which you convert nothing costs nothing.",
    },
    {
      question: "Can I convert a whole year of statements at once?",
      answer:
        "Up to the 50-page limit for a single pack, yes, and each statement is verified separately inside it. Twelve monthly statements of three or four pages each fit comfortably. A year of dense business statements may need splitting across two packs, and the page count is checked before anything is charged.",
    },
    {
      question: "What can I hold on file to evidence how the spreadsheet was derived?",
      answer:
        "The Statement Summary sheet inside the workbook. It names the period, the printed balances, the computed totals, the method, the equation, and the result of each check, so the derivation is documented in the same file as the data.",
    },
    {
      question: "What happens if one month in the pack fails verification?",
      answer:
        "That statement is marked as rejected and cannot be bought. You can remove it and take the months that passed, which produces a new pack, or abandon the conversion entirely. A failed statement is never quietly dropped from a pack you have paid for.",
    },
    {
      question: "Do you keep a copy of my client's statement?",
      answer:
        "No. The PDF is never uploaded — it is read in your browser — and the extracted text sent for parsing is not stored once the response has been returned. There is no account and no document library, so there is nothing retained to disclose or delete.",
    },
    {
      question: "Can a junior run the conversion and a reviewer check it afterwards?",
      answer:
        "Yes, and the summary sheet is what makes the review possible without repeating the work. The reviewer can see which check was applied to that period and what it returned, rather than having to take the transaction sheet on trust.",
    },
  ],
  related: [
    {
      href: "/catch-up-bookkeeping-bank-statements",
      label: "Catch-up bookkeeping from old bank statements",
      context: "Sequencing a multi-month conversion so the periods join up without gaps.",
    },
    {
      href: "/bank-statement-to-quickbooks-csv",
      label: "Bank statement to QuickBooks CSV",
      context: "If the next step is a manual bank transaction import rather than a review.",
    },
    {
      href: "/business-bank-statement-to-excel",
      label: "Business bank statement to Excel",
      context: "The same conversion described from the client's side, before the file reaches you.",
    },
    {
      href: "/security",
      label: "How your file is handled",
      context: "What stays in the browser, what is transmitted, and what is kept afterwards.",
    },
  ],
  futureExpansion: [
    "A sample anonymised Statement Summary sheet published as a reference working paper",
    "Notes on documenting a conversion where the reconciliation failed and the statement was rekeyed instead",
    "Guidance on sequencing a multi-month conversion so periods neither overlap nor leave a gap in the ledger",
  ],
};
