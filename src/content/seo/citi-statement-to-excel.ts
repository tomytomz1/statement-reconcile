import type { SeoPage } from "./types";

export const citiStatementToExcel: SeoPage = {
  slug: "citi-statement-to-excel",
  targetQuery: "citi statement to excel",
  searchIntent:
    "A reader with a statement that groups activity under headings and prints a subtotal beneath each one, wanting all of it in a single spreadsheet.",
  title: "Citi Statement to Excel — PDF to XLSX | Statement Reconcile",
  metaDescription:
    "Convert an eligible Citi PDF statement to Excel and CSV. Independent tool. Printed subtotals and the closing balance are both checked against your rows.",
  eyebrow: "Statements with subtotals",
  h1: "Citi Statement to Excel",
  intro: [
    "Some statements do more than list transactions and print a closing balance. They group activity into sections — deposits, withdrawals, fees, interest, purchases — and print a subtotal under each group. Those subtotals are convenient for a reader. They are considerably more valuable to a converter.",
    "Where a statement provides them, this converter treats every one as a separate assertion to be tested. The extracted rows are grouped the same way, added up in plain decimal arithmetic, and held against the stated figure. Each subtotal that agrees narrows the space in which an error could still be hiding, and all of it happens before a payment step is offered.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet holding every row from every section in one filterable table with a frozen header, so a grouped statement becomes a single sortable ledger.",
    "A Statement Summary sheet listing the period, the balances, total credits and debits, fees, interest, the transaction count, the reconciliation method and its result, and the time the workbook was generated.",
    "A CSV using the fixed seven-column order — Date, Posted Date, Description, Debit, Credit, Amount, Balance — with the section a row came from reflected in its debit or credit placement rather than in an extra column.",
    "Fees and interest reported as their own totals on the summary sheet, so figures the statement chose to break out separately do not vanish into one lump.",
  ],
  reconciliation: {
    heading: "Two checks are better than one, when the document offers two",
    body: [
      "The primary check is always the period equation: the opening balance, plus everything credited, minus everything debited, must equal the closing balance the statement printed. That single test catches dropped rows, duplicated rows, misread amounts, and reversed signs, because every one of those changes the sum.",
      "What it does not do is tell you where the problem is. A statement that prints subtotals gives us a second, finer-grained pass. If the deposits section states a total and our extracted deposit rows add to something else, the failure is localised to that section. Just as usefully, subtotals agreeing across every section makes an overall match much harder to achieve by coincidence.",
      "Both checks are computed by the same deterministic engine in our own code, from the numbers alone, with no reference to how the rows were read. And to be plain about the limits of what we know: we keep no per-bank register of layouts we have verified, and we have not audited how Citibank, N.A. formats its documents. The arithmetic is what stands in for that promise, evaluated against your file rather than against a category.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Open the statement",
      detail:
        "Select the PDF. It is read locally in the browser and the file itself is never transmitted to us.",
    },
    {
      title: "Sections and their rows are separated",
      detail:
        "Where the statement groups activity under headings, each heading's rows stay associated with it so the group can be totalled independently later.",
    },
    {
      title: "Stated subtotals are captured as claims",
      detail:
        "A subtotal printed under or beside a group is recorded as a figure to test against, never absorbed into the transaction table as another row.",
    },
    {
      title: "Group totals and the period total are both computed",
      detail:
        "Each group's extracted rows are summed and compared with its stated subtotal, then the whole period is checked against the printed closing balance.",
    },
    {
      title: "See where it stands, then buy or walk away",
      detail:
        "The preview reports which checks passed and the numbers behind them. The billing screen unlocks the files only when reconciliation succeeded.",
    },
  ],
  sections: [
    {
      heading: "What a subtotal is worth as evidence",
      body: [
        "A closing balance is one number covering an entire period. It is an excellent detector and a poor diagnostician: it tells you something is wrong without telling you what. Subtotals split that single test into several smaller ones, and smaller tests fail closer to the problem that caused them.",
        "There is a probabilistic argument too. Any individual check can pass by accident, because two errors of equal size in opposite directions cancel each other out. The more independent totals a document states, and the more of them that agree with the extracted rows, the less plausible that coincidence becomes. A statement printing five subtotals is offering five separate opportunities for a mistake to be caught.",
      ],
      bullets: [
        "A mismatched section subtotal points at the rows in that section, not at the whole period",
        "Fee and interest subtotals verify categories that are otherwise easy to omit entirely",
        "Offsetting errors that survive one check rarely survive several in a row",
        "A subtotal has to be read as a claim about rows, never added to the ledger as a row itself",
      ],
    },
    {
      heading: "The mistake of counting a subtotal twice",
      body: [
        "The obvious hazard in a document full of subtotals is double counting. A section total sits on its own line, in the amount column, formatted like an amount, often only a few points below the rows it summarises. Read as a transaction, it inflates its group by exactly the size of the group.",
        "That failure has a distinctive signature, which is part of why the layered check earns its keep: the period equation then misses by the sum of every subtotal wrongly absorbed. The converter separates stated totals from transaction rows before any summing begins, and where that separation goes wrong the numbers will not close and you are told so instead of sold a file.",
      ],
    },
    {
      heading: "Generic layouts, specific documents",
      body: [
        "Section subtotals are a formatting choice, not a property of any one institution. Some issuers print them beneath every group, some print a single activity summary at the top of the statement, and some print neither and give you only an opening and a closing balance. All three are readable, and only the last has one check rather than several.",
        "Because we do not know in advance which of those your document is, we do not claim in advance that it will convert. Convert eligible PDF statements when the text layer can be extracted and the printed figures allow an independent reconciliation, and let the on-screen result decide. That result costs nothing and arrives before the paywall.",
      ],
    },
  ],
  commonIssues: [
    "Section subtotals absorbed into the transaction table, which inflates a group by its own total",
    "Adjacent groups whose rows run together because the heading between them is set in the same size as the body text",
    "Interest and fee sections carrying only one or two rows, which are easy to lose altogether",
    "Statements delivered as scans, where there is no text layer to group in the first place",
    "Documents whose printed subtotals cover a different date range from the transaction list, leaving nothing consistent to compare",
  ],
  supported: [
    "Eligible PDF statements from any issuer, when the text can be extracted and the printed figures support an independent check",
    "Activity grouped under section headings with stated subtotals, tested group by group",
    "Statements with no subtotals at all, verified on the period equation alone",
    "Separate fee and interest sections, totalled and reported on the summary sheet",
    "Documents up to 50 pages in a single conversion",
  ],
  unsupported: [
    "Scanned or image-only PDFs",
    "Password-protected files that have not been unlocked",
    "Documents covering more than one account",
    "Statements printing neither usable balances nor subtotals, leaving no way to test the extraction",
  ],
  faqs: [
    {
      question: "What happens if one subtotal matches and another does not?",
      answer:
        "The reconciliation is reported as failed and the payment step does not appear. A partial match is not a pass, because the entire point of the exercise is that the whole document adds up.",
    },
    {
      question: "Will the subtotal lines themselves show up as rows in my spreadsheet?",
      answer:
        "No. Stated totals are separated from transaction rows before anything is summed, precisely so they cannot be counted twice. They inform the check; they never become data in the export.",
    },
    {
      question: "My statement has no section subtotals. Is the result less reliable?",
      answer:
        "It has one check instead of several, so a failure is harder to localise, but the period equation is still decisive. If the extracted rows do not reproduce the closing balance, the check fails and nothing is charged.",
    },
    {
      question: "Does Citi endorse this converter?",
      answer:
        "No. There is no endorsement, no partnership, and no arrangement of any kind with Citibank, N.A. Statement Reconcile is an independent tool, and the name is used here only to describe a document type.",
    },
    {
      question: "Do I see the numbers behind the check, or only a pass or fail?",
      answer:
        "You see the numbers. The preview shows the computed totals beside the figures printed on the statement, along with the equation used, so the verdict is something you can audit rather than something you have to accept.",
    },
  ],
  related: [
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "The fixed seven-column output, described on its own terms.",
    },
    {
      href: "/convert-pdf-transactions-to-excel",
      label: "Convert PDF transactions to Excel",
      context: "For documents where the transaction list matters more than the account summary.",
    },
    {
      href: "/american-express-statement-to-excel",
      label: "American Express statement to Excel",
      context: "How the same layered thinking applies to a card balance roll-forward.",
    },
    {
      href: "/security",
      label: "How your file is handled",
      context: "Where the PDF is read, what is sent, and what is kept afterwards.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Citibank, N.A., and we do not act on its behalf in any capacity.",
  futureExpansion: [
    "An explanation of how layered checks reduce the chance of offsetting errors passing unnoticed",
    "A reference on the section headings most commonly used to group statement activity",
    "A worked example showing the arithmetic signature of a subtotal counted as a transaction",
  ],
};
