import type { SeoPage } from "./types";

export const pdfBankStatementToCsv: SeoPage = {
  slug: "pdf-bank-statement-to-csv",
  targetQuery: "pdf bank statement to csv",
  searchIntent:
    "Someone who wants to get from a PDF to a file another program can read without human tidying in between, and who cares about date formats, signs, and encoding.",
  title: "PDF Bank Statement to CSV | Statement Reconcile",
  metaDescription:
    "Go from a PDF statement straight to a machine-readable CSV with ISO dates, signed amounts, and UTF-8 text. The rows are reconciled before any payment is requested.",
  eyebrow: "PDF to machine-readable data",
  h1: "PDF bank statement to CSV",
  intro: [
    "A PDF is designed to look identical everywhere and to be parsed by nobody. A CSV is the opposite: no appearance to speak of, and complete predictability for whatever reads it next. Getting from one to the other means making a series of decisions that a printed page never had to make, about how a date is written, which direction counts as negative, and how text is encoded.",
    "Those decisions are made once here and applied consistently. Dates come out in ISO form, amounts carry an explicit sign, text is UTF-8, and the seven columns never change order. Before the file is offered, the transaction rows are added up and measured against the balances the statement printed.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A comma-separated file with the columns Date, Posted Date, Description, Debit, Credit, Amount, Balance in that fixed order, one transaction per line.",
    "Dates normalised to ISO YYYY-MM-DD, so they sort correctly as plain strings and are unambiguous regardless of who reads the file.",
    "An Amount column carrying a single signed figure per transaction, alongside separate positive Debit and Credit columns for tools that expect that shape.",
    "UTF-8 encoding throughout, with description text stripped of embedded tabs and carriage returns so each record occupies exactly one line.",
    "An accompanying Excel workbook whose second sheet records the period, balances, totals, and the reconciliation result for the same data.",
  ],
  reconciliation: {
    heading: "Verification before automation",
    body: [
      "The value of a machine-readable file is that nobody has to look at it. That is also its risk: if a row was lost between the PDF and the CSV, the pipeline downstream will accept the file, process it happily, and produce a figure that is wrong by an amount nobody can trace back to its cause.",
      "Checking the arithmetic at the point of extraction is the cheapest place to catch that. Debits and credits are totalled from the rows that were recovered, using decimal arithmetic in our own code rather than anything the extraction model touched, and the result is set against the opening and closing balances on the document. Where a running balance is printed against each line, the chain of balances can be walked row by row as a second, stricter test.",
      "The comparison happens while the download is still locked, and its outcome is shown on screen. A failed check means no paywall and no payment, which keeps a file that might be incomplete out of your pipeline in the first place.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Select the PDF",
      detail:
        "It is read in your browser. Only the text extracted from the pages is sent onward for parsing, and nothing is retained once the response has been produced.",
    },
    {
      title: "Rows are recovered from the page",
      detail:
        "Transaction lines are separated from headers, footers, and carried-forward figures, and continuation text is folded back into the row it describes.",
    },
    {
      title: "Values are normalised",
      detail:
        "Dates are converted to ISO form, thousands separators are removed from amounts, and each movement is given an explicit sign in the Amount column.",
    },
    {
      title: "The totals are reconciled",
      detail:
        "The recovered rows are summed and compared with the balances and any stated totals the statement printed, and you are shown the comparison.",
    },
    {
      title: "Review the result, then download",
      detail:
        "A single payment covers one conversion pack with one or more statements up to 50 total pages and includes CSV, Excel, and verification reports.",
    },
  ],
  sections: [
    {
      heading: "What normalisation actually removes",
      body: [
        "The awkwardness of statement data is not that it is complicated but that it is inconsistent. Two banks will print the same information in different date orders, with different negative conventions, with or without thousands separators, and with the currency symbol sometimes attached to the figure and sometimes not. Every one of those variations has to be resolved by somebody before the data can be used.",
        "Normalising at export time means resolving them once, in a defined way, so the file you receive looks the same whichever institution produced the statement. That is what makes the output worth automating against: a script written for last month's file does not need to be revisited when this month's arrives from a different account.",
      ],
    },
    {
      heading: "Dates in one unambiguous format",
      body: [
        "Both date columns are written as YYYY-MM-DD. The choice matters for two reasons. It sorts correctly as text, which means a file can be ordered chronologically without being parsed first, and it cannot be misread by a person or a program that assumes a different regional convention.",
        "The harder part is deciding what a printed date meant in the first place. A statement showing a two-part numeric date offers no inherent clue about which part is the day, and guessing from a locale setting is how a July transaction becomes a June one. The order is settled from evidence inside the document — the statement period printed on it, and the fact that transactions run forward through that period — rather than assumed.",
      ],
      bullets: [
        "Both Date and Posted Date use YYYY-MM-DD, or are left empty when the statement prints only one of them",
        "Day and month order is determined from the document rather than from a regional default",
        "Two-digit years are resolved against the statement period rather than a fixed century rule",
        "Chronological sorting works on the raw text, with no date parsing required first",
      ],
    },
    {
      heading: "Signs, separators, and the shape of an amount",
      body: [
        "The Amount column expresses each movement as one signed number: money leaving the account is negative, money arriving is positive. Statements themselves express this in at least four ways — two columns, a trailing CR or DR marker, brackets around negatives, or a minus sign — and all of them are collapsed into the same convention on the way out.",
        "Separators are handled at the same point. Thousands separators are removed, because most importers reject a figure containing a comma, and decimal commas are converted so that a European statement and a North American one produce numerically identical files. What is not done anywhere is rounding: the figures are carried through as decimals so the totals used in the reconciliation are the same values that appear in the file.",
      ],
    },
  ],
  commonIssues: [
    "Dates arriving in a mixture of formats within one file, so chronological sorting produces nonsense",
    "A minus sign printed after the figure rather than before it, which many parsers read as text",
    "Currency symbols left inside the amount field, causing an import to reject the whole column",
    "Two-digit years being interpreted into the wrong century and pushing transactions decades away",
    "Rounding introduced during extraction, so a total that should be exact is out by a few pence",
  ],
  supported: [
    "Statements printing a single dated column and statements printing both a transaction and a posting date",
    "Amounts marked with CR and DR indicators, brackets, or a trailing minus sign",
    "Figures written with either a decimal point or a decimal comma, with or without thousands separators",
    "Card statements, which are reconciled with the previous-balance equation and exported to the same seven columns",
    "Statements of up to 50 pages covering one account and one period",
  ],
  unsupported: [
    "PDFs made from scans or photographs, where no character data exists to normalise",
    "Encrypted files that have not been unlocked and re-saved first",
    "Statements presenting more than one account in a single document",
    "Documents that print balances but no dated transaction lines",
  ],
  faqs: [
    {
      question: "What date format do the two date columns use?",
      answer:
        "ISO 8601 calendar dates, written as YYYY-MM-DD. That format sorts correctly as plain text and removes any ambiguity about which number is the day and which is the month.",
    },
    {
      question: "How is Posted Date different from Date?",
      answer:
        "Date is the transaction date shown on the statement, and Posted Date is when the bank recorded it against the account. Many statements print only one of the two; where that is the case there is nothing to place in the other column.",
    },
    {
      question: "Which direction is negative in the Amount column?",
      answer:
        "Money out of the account is negative and money in is positive. If your target system uses the opposite convention, the separate Debit and Credit columns give you both figures as positive numbers to map instead.",
    },
    {
      question: "Are amounts rounded during conversion?",
      answer:
        "No. Values are carried through as decimals, which is also what the reconciliation arithmetic operates on, so the totals shown to you are computed from exactly the figures written into the file.",
    },
    {
      question: "Can the file be loaded directly by a script or a database import?",
      answer:
        "That is what it is shaped for: a fixed header, one record per line, ISO dates, unadorned numeric fields, and UTF-8 text. No manual tidying step is expected between download and load.",
    },
  ],
  related: [
    {
      href: "/pdf-bank-statement-to-excel",
      label: "PDF bank statement to Excel",
      context:
        "The same source document, delivered as a formatted workbook rather than a data file.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context:
        "More on the CSV itself: column order, quoting, and how risky characters in descriptions are handled.",
    },
    {
      href: "/convert-pdf-transactions-to-csv",
      label: "Convert PDF transactions to CSV",
      context:
        "Aimed at extracting the transaction rows specifically, rather than the statement as a whole.",
    },
    {
      href: "/security",
      label: "Security and data handling",
      context: "What happens to the PDF and the extracted text during a conversion.",
    },
  ],
  futureExpansion: [
    "A specification page listing each column with its type, format, and permitted empty cases",
    "Worked examples of unusual negative-amount conventions and how each is normalised",
    "A short article on validating an imported CSV against the statement totals inside your own system",
  ],
};
