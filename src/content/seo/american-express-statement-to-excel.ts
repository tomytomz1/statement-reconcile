import type { SeoPage } from "./types";

export const americanExpressStatementToExcel: SeoPage = {
  slug: "american-express-statement-to-excel",
  targetQuery: "american express statement to excel",
  searchIntent:
    "Someone converting a card statement who needs spending, payments, fees and interest to stay distinguishable rather than collapsing into one column of numbers.",
  title: "American Express Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert an eligible American Express PDF statement to Excel and CSV. Independent tool. The previous balance must roll forward to the new balance first.",
  eyebrow: "Card statements",
  h1: "American Express Statement to Excel",
  intro: [
    "A card statement is a roll-forward, not a record of cash on hand. It starts from what was owed at the end of last period, adds what was spent and what was charged, subtracts what was paid and what was refunded, and arrives at what is owed now. Converting one to Excel means preserving that structure, not merely lifting the numbers off the page.",
    "The converter extracts the rows, categorises fees and interest apart from purchases, keeps payments and credits on their own side of the equation, and then re-derives the new balance from the previous balance. Whether it landed on the printed figure is shown to you before any payment step appears.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet with an autofilter and a frozen header row, holding purchases, payments, credits, fees and interest as individual rows in one table.",
    "Payments and credits carried as credits with their direction preserved, and purchases, fees and interest carried as debits, so summing the Amount column reproduces the movement between the two balances.",
    "A Statement Summary sheet reporting the previous balance, the new balance, total purchases, total payments and credits, total fees, total interest, the transaction count, the roll-forward method and its result, and when the file was written.",
    "A CSV in the fixed order Date, Posted Date, Description, Debit, Credit, Amount, Balance, with both a transaction date and a posted date populated wherever the statement prints both.",
  ],
  reconciliation: {
    heading: "Rolling the previous balance forward to the new balance",
    body: [
      "The equation for a card is not the one used for a checking account, and applying the wrong one would invert half the document. What you owe rises when you spend and falls when you pay, so purchases, fees and interest all push in one direction while payments and credits push in the other.",
      "The engine reconstructs that movement from the extracted rows using plain decimal arithmetic and compares its answer with the new balance printed on the statement. Fees and interest are summed as their own categories rather than folded into purchases, partly because that is more useful to you and partly because a statement stating them separately hands us two more figures to test against.",
      "Nobody here has examined how American Express Company formats its statements, and we keep no list of issuers whose layouts we have checked. What we have is a calculation performed on the document you supplied, with the result displayed before the price is. If the balance does not roll forward correctly, the paywall does not open and there is nothing to refund.",
    ],
    equation: "Previous balance + purchases + fees + interest − payments − credits = new balance",
  },
  steps: [
    {
      title: "Supply the full statement period",
      detail:
        "The roll-forward needs both ends: the previous balance and the new balance. A few pages extracted from the middle have neither and cannot be verified at all.",
    },
    {
      title: "The file is parsed in your browser",
      detail:
        "The PDF stays on your machine. Only the extracted text is sent for parsing, and it is discarded once the response comes back.",
    },
    {
      title: "Rows are classified, not just read",
      detail:
        "Each line is sorted into a purchase, a payment, a credit, a fee, or an interest charge, because the equation treats those five groups differently.",
    },
    {
      title: "The new balance is recomputed",
      detail:
        "Starting from the previous balance, the categorised totals are applied and the result compared with the statement's own new balance.",
    },
    {
      title: "Review, then unlock",
      detail:
        "The preview shows both figures side by side. If they agree, $19 releases the workbook and the CSV; if they do not, there is nothing to pay.",
    },
  ],
  sections: [
    {
      heading: "Why fees and interest get their own categories",
      body: [
        "It would be simpler to treat every charge as a purchase. The arithmetic would still close, because a fee and a purchase move the balance in the same direction by the same mechanism. Simpler, and considerably less useful.",
        "Interest and fees are the two lines most people are actually looking for when they put a card statement into a spreadsheet. They are the numbers that get queried, disputed, expensed under a different code, or tracked across months to see whether they are growing. Collapsing them into a single spending figure destroys exactly the information the conversion was for, so they are totalled separately on the summary sheet and stay identifiable as rows.",
      ],
      bullets: [
        "Annual and monthly membership fees are charges, not spending",
        "Late fees and foreign transaction fees belong to the fee total rather than to purchases",
        "Interest charged on purchases and on cash advances both count as interest",
        "A fee that is later reversed appears as a credit, not as a negative fee",
      ],
    },
    {
      heading: "Signs, and why a refund is not a negative purchase",
      body: [
        "A refund and a purchase are not the same event with opposite signs, even though the arithmetic can be made to look that way. A credit reduces the balance owed; a purchase increases it. Recording an $80 refund as a purchase of −$80 happens to produce the right total and the wrong table.",
        "The distinction matters the moment you do anything with the export beyond summing one column. Filtering for spending in a month, comparing purchases against a budget, or totalling what came back to you all break if credits are hiding inside the purchase figures. So credits and payments keep their identity: they populate the Credit column, they carry a negative Amount, and they are totalled apart from purchases on the summary sheet.",
      ],
    },
    {
      heading: "What this page is not claiming",
      body: [
        "Everything described here is how card statements behave as a class of document. It is not a description of any particular issuer's template, and it is not a statement that we have tested one. We do not publish a supported-issuer list, because a list of that kind would be a promise about files we have never opened.",
        "The substitute is narrower but firmer. Convert eligible PDF statements when the text layer can be extracted and the printed balances allow the roll-forward to be checked independently. The check runs on your document, its result is on screen before the payment step exists, and a failure costs you nothing beyond the time it took to upload.",
      ],
    },
  ],
  commonIssues: [
    "Payments recorded as purchases, which moves the computed new balance by twice the payment amount",
    "A minimum payment figure read as a transaction, when it is a forward-looking instruction rather than period activity",
    "Cash advance sections with their own fee and interest lines, which must be categorised rather than merged into spending",
    "Statements showing a transaction date and a separate posted date, where using the wrong one shifts rows across a period boundary",
    "Image-only PDFs, which contain no text to classify in the first place",
  ],
  supported: [
    "Eligible card PDF statements, when the previous balance, the new balance, and the activity list can all be extracted",
    "Purchases, payments, credits, fees and interest classified into separate categories for the roll-forward",
    "Statements printing both a transaction date and a posted date, each written to its own column",
    "Foreign currency descriptions where the amounts are settled in a single currency",
    "Documents up to 50 pages, verified as one statement",
  ],
  unsupported: [
    "Scanned or photographed statements with no text layer",
    "Password-protected PDFs that have not been unlocked first",
    "Files containing more than one card account",
    "Statements omitting either the previous balance or the new balance, which leaves the roll-forward unanchored",
  ],
  faqs: [
    {
      question: "Why do payments show as negative in the Amount column?",
      answer:
        "Because a payment reduces the balance owed. Amount is signed from the perspective of what you owe: purchases, fees and interest are positive, payments and credits are negative, and the column sums to the movement between the previous and new balance.",
    },
    {
      question:
        "My statement lists a transaction date and a posted date. Which drives the reconciliation?",
      answer:
        "The statement's own activity list does. Both dates are exported to their own columns so you can re-sort on either, but the rows included in the period are the rows the statement itself presents for that period.",
    },
    {
      question: "Are cash advances handled?",
      answer:
        "They are extracted as rows like any other activity, and any fee or interest attached to them is categorised as a fee or as interest rather than as spending. The roll-forward includes them the same way the statement does.",
    },
    {
      question: "Is Statement Reconcile affiliated with American Express?",
      answer:
        "No. We have no affiliation with, sponsorship from, or endorsement by American Express Company, and we do not act for it. The name appears here to describe a document type and for no other reason.",
    },
    {
      question: "The reconciliation failed on my statement. Can you fix the file for me?",
      answer:
        "There is no service behind the failure: nothing was charged and nothing was stored. The usual causes are a missing text layer, a document covering more than one account, or a statement that does not print both balances. Re-downloading the original PDF from the issuer resolves most of them.",
    },
  ],
  related: [
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context: "The same roll-forward described without naming an issuer.",
    },
    {
      href: "/credit-card-statement-to-csv",
      label: "Credit card statement to CSV",
      context: "If your expense system takes a flat file rather than a workbook.",
    },
    {
      href: "/discover-statement-to-excel",
      label: "Discover statement to Excel",
      context: "Goes deeper on credits, refunds, and what a reversed sign does to the total.",
    },
    {
      href: "/how-it-works",
      label: "How the reconciliation check works",
      context: "The order of extraction, verification, preview, and payment.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by American Express Company, and we do not act on its behalf or with its authorisation.",
  futureExpansion: [
    "A page on exporting card activity for expense reporting while keeping fees and interest separated",
    "A comparison of transaction date and posted date, and when each is the right sort key",
    "Notes on how cash advance fees and interest are categorised on the summary sheet",
  ],
};
