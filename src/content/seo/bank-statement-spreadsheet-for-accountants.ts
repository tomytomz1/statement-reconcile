import type { SeoPage } from "./types";

export const bankStatementSpreadsheetForAccountants: SeoPage = {
  slug: "bank-statement-spreadsheet-for-accountants",
  targetQuery: "bank statement to spreadsheet for accountants",
  searchIntent:
    "A practising accountant or bookkeeper who receives client statements as PDFs, needs them as spreadsheets, and is weighing up cost per job, evidence quality, and what happens to client data.",
  title: "Bank Statement Spreadsheets for Accountants",
  metaDescription:
    "Per-statement pricing with no subscription or seat licence, plus a Statement Summary sheet that records every reconciliation check for the client file.",
  eyebrow: "Professional preparers",
  h1: "Bank statement to spreadsheet for accountants",
  intro: [
    "Client statements arrive as PDFs, usually at the least convenient moment and usually without the CSV that would have made the job trivial. Getting them into a spreadsheet is unbilled preparation work, and the part of it that matters is not the typing but the certainty that nothing was lost on the way.",
    "This converts one PDF statement into an Excel workbook and a CSV for $19, and it will not take the payment until the extracted rows have been re-added and shown to agree with the balances the bank printed. The workbook carries a second sheet recording exactly which checks ran and what they returned, which is the part that is worth keeping on the file.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet with a frozen header row and an autofilter, amounts held as real numbers with a currency-appropriate number format, and the rows in statement order.",
    "A Statement Summary sheet stating the period, the opening and closing balances, total debits and credits, the reconciliation method applied, the equation used, every individual check performed, the transaction count, and the generation timestamp.",
    "No formulas, no macros, and no external links in the workbook, so it can be attached to a file or circulated without triggering a security warning or breaking when moved.",
    "A CSV with the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, for pushing into a bookkeeping package rather than reading by hand.",
    "Both files for the one $19 payment, with no separate charge for either format.",
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
      title: "Convert one statement, one account at a time",
      detail:
        "Each document is a separate conversion, because each one is verified against its own printed balances. Combined packs covering several accounts have no single ledger to reconcile and are not supported.",
    },
    {
      title: "Read the verdict before committing anything",
      detail:
        "The period, the balances, the computed totals, the equation, and ten preview rows are shown while the files are still locked. Confirm the period is the one the engagement needs.",
    },
    {
      title: "Pay $19 per conversion pack and take every output",
      detail:
        "No account, no seat licence, no minimum, nothing to renew. The charge is per conversion pack, with one or more statements up to 50 total pages, and it includes Excel, CSV, and verification reports.",
    },
    {
      title: "Keep the Statement Summary sheet with the working papers",
      detail:
        "It is the record of what was converted, over what period, by which method, and with what result — which is what a reviewer or a later query will actually ask for.",
    },
  ],
  sections: [
    {
      heading: "Why per-statement pricing suits practice work",
      body: [
        "Practice demand for statement conversion is lumpy. Nothing for six weeks, then a new client arrives with fourteen months of PDFs, then nothing again until the next disclosure or the next tidy-up job. A monthly subscription priced for steady use is the wrong shape for that, and the wrong shape in an expensive direction: you pay through the quiet months to have capacity available in the busy ones.",
        "A $19 charge per conversion pack maps directly onto the work. Statements can be grouped into packs of up to 50 total pages, and when the job is finished the cost stops. There is no seat licence or account to administer.",
        "It is also a cost that behaves properly as a disbursement. A per-statement charge on a specific client's job is straightforward to recharge or absorb as a decision about that engagement, rather than an overhead you have to apportion across everything.",
      ],
      bullets: [
        "No subscription, no minimum term, and nothing to cancel",
        "No seat licence and no user administration, because there are no accounts",
        "One charge covers one or more statements up to 50 total pages in all output formats",
        "Cost attaches to a specific job rather than sitting as a fixed monthly overhead",
      ],
    },
    {
      heading: "The Statement Summary sheet as a working paper",
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
    "Statements up to 50 pages and 20 MB per conversion",
    "Separate debit and credit columns, a single signed amount column, or amounts grouped under section headings",
    "Statements in currencies using a comma decimal separator, and descriptions containing accented or non-Latin characters",
  ],
  unsupported: [
    "Batch or bulk conversion; statements are handled one at a time, each verified on its own",
    "Any account, portal, saved history, or API — there is nothing to log in to and nothing stored to return to",
    "Scanned and image-only PDFs, as this version performs no character recognition",
    "Password-protected PDFs, non-PDF files, and documents covering more than one account",
    "Statements whose printed balances and subtotals are not sufficient to verify the extraction",
  ],
  faqs: [
    {
      question: "Is there a firm licence, a seat count, or a minimum commitment?",
      answer:
        "None of the three. The only charge is $19 for each statement you convert. Nobody needs to be set up as a user, there is no annual renewal, and a month in which you convert nothing costs nothing.",
    },
    {
      question: "What can I hold on file to evidence how the spreadsheet was derived?",
      answer:
        "The Statement Summary sheet inside the workbook. It names the period, the printed balances, the computed totals, the method, the equation, and the result of each check, so the derivation is documented in the same file as the data.",
    },
    {
      question: "Can I recharge the cost to the client?",
      answer:
        "That is between you and your engagement terms, but the pricing is shaped to make it simple: a discrete charge attached to one identifiable statement for one client, rather than a share of a subscription that would have to be apportioned.",
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
      href: "/business-bank-statement-to-excel",
      label: "Business bank statement to Excel",
      context: "The same conversion described from the client's side, before the file reaches you.",
    },
    {
      href: "/bank-statement-to-quickbooks-csv",
      label: "Bank statement to QuickBooks CSV",
      context: "If the next step is a manual bank transaction import rather than a review.",
    },
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "Full detail on the workbook, both sheets, and how the formatting is applied.",
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
