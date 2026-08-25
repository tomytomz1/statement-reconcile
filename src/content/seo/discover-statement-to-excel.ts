import type { SeoPage } from "./types";

export const discoverStatementToExcel: SeoPage = {
  slug: "discover-statement-to-excel",
  targetQuery: "discover statement to excel",
  searchIntent:
    "A cardholder whose statement contains cashback and statement credits, who wants those rows exported in the right direction rather than silently treated as charges.",
  title: "Discover Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert an eligible Discover PDF statement to Excel and CSV. Independent tool. Cashback and statement credits must balance the roll-forward before you pay.",
  eyebrow: "Card statements with credits",
  h1: "Discover Statement to Excel",
  intro: [
    "Reward credits are the likeliest thing on a card statement to be extracted with the wrong sign. A cashback redemption or a statement credit is a line in the activity list that looks like every other line — a date, a description, an amount — and the only thing marking it as money coming back rather than going out is a sign, a column position, or the section heading above it.",
    "That is fortunate, because a mis-signed credit is also one of the easiest errors for arithmetic to catch. If a credit is recorded as a charge, the recomputed balance misses by twice its value, the roll-forward fails, and the payment step never appears. The error blocks the sale instead of ending up in your spreadsheet.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet listing purchases, payments, cashback and statement credits, fees and interest as separate rows, filterable and with the header row frozen.",
    "Credits written into the Credit column with a negative Amount, so filtering on credits and summing the Amount column agree with each other instead of contradicting.",
    "A Statement Summary sheet carrying the previous balance, the new balance, the purchase total, combined payments and credits, fees, interest, the transaction count, the reconciliation method, its result, and the generation timestamp.",
    "A CSV with the fixed header Date, Posted Date, Description, Debit, Credit, Amount, Balance, so a credit is identifiable by column as well as by sign.",
  ],
  reconciliation: {
    heading: "A sign error is a doubling error, and doubling is loud",
    body: [
      "Consider a $150 statement credit read as a $150 charge. Nothing about that row looks wrong on its own. The date is right, the description is right, the amount is right. In a spreadsheet you would have no reason to question it, and you might not notice for months.",
      "The roll-forward notices at once. The row should have reduced the balance by $150 and instead increased it by $150, so the computed new balance sits $300 away from the figure printed on the statement. Small errors are hard to detect; sign errors are not small, because they move the total by twice the amount involved. That is why the check is worth running precisely on the rows that are easiest to get wrong.",
      "We do not maintain a list of card issuers whose statement layouts we have verified, and we have not inspected how Discover Bank builds its documents. The arithmetic takes the place of that list: it is computed by a deterministic engine over the extracted rows in plain decimal arithmetic, and if it does not close then the paywall is never displayed and you are not charged.",
    ],
    equation: "Previous balance + purchases + fees + interest − payments − credits = new balance",
  },
  steps: [
    {
      title: "Load the card statement",
      detail:
        "Pick the PDF from your machine. Parsing happens in the browser and the file itself is not uploaded to us.",
    },
    {
      title: "Credits are identified before they are totalled",
      detail:
        "Each row's direction is taken from the statement's own presentation — a sign, a column, or the section it sits under — rather than inferred from words like reward or cashback in the description.",
    },
    {
      title: "The roll-forward is recomputed",
      detail:
        "Purchases, fees and interest are added to the previous balance while payments and credits are subtracted, using decimal arithmetic in our own code.",
    },
    {
      title: "The result is compared and shown",
      detail:
        "The computed new balance appears next to the one printed on your statement, together with the credit total, so a sign problem is visible rather than merely implied.",
    },
    {
      title: "Pay only after it balances",
      detail:
        "A passing check makes the billing screen and both files available. A failing check ends the process with no checkout, no account, and nothing kept.",
    },
  ],
  sections: [
    {
      heading: "The kinds of credit that turn up on a card statement",
      body: [
        "Credits are not one thing. A merchant refund, a cashback redemption applied to the balance, a promotional or goodwill credit, a reversed fee, and a disputed charge that was removed all reduce what is owed, and they arrive on the statement in different forms and frequently in different sections.",
        "What they share is direction, and direction is the only property the equation cares about. What they do not share is meaning, which is why they stay as individual rows carrying their original descriptions instead of being netted off against purchases. If you are reconciling expenses, a refund for a specific purchase and a reward redemption are entirely different events, and an export that merges them has thrown the distinction away.",
      ],
      bullets: [
        "Merchant refunds for returned or cancelled goods",
        "Cashback or reward redemptions applied against the balance",
        "Reversed fees and interest adjustments",
        "Credits arising from a resolved dispute",
        "Promotional or courtesy credits issued by the card provider",
      ],
    },
    {
      heading: "Why the description is never used to decide direction",
      body: [
        "It looks reasonable to treat any row whose description contains a word like credit, refund or reward as money coming back. In practice descriptions are unreliable evidence. Merchant names contain arbitrary words, a purchase from a business with credit in its name is still a purchase, and a charge for a rewards programme is a charge sitting under a rewards-sounding label.",
        "Direction is therefore taken from structure: an explicit minus sign, a trailing credit marker, placement in a credit column, or membership of a section the statement has itself headed as payments and credits. Where the structure is genuinely ambiguous, the extraction produces totals that do not roll forward, and a failed check is a far better outcome than a confident wrong answer.",
      ],
    },
    {
      heading: "What the check does and does not prove",
      body: [
        "A passing reconciliation means the extracted rows are arithmetically consistent with the balances the document printed: nothing was dropped, nothing was counted twice, no amount was misread, and no direction was reversed. That is a specific and useful guarantee about the numbers in your spreadsheet.",
        "It is not a claim about the document itself. We do not verify that a statement is genuine, that it came from the institution it names, or that what it says is true — only that the figures we extracted add up the way the page says they should. And because we hold no register of supported issuer layouts, this internal consistency check is the whole of what we offer in place of one. Convert eligible PDF statements when the text can be extracted and the totals can be independently reconciled.",
      ],
    },
  ],
  commonIssues: [
    "A cashback redemption read as a charge, which throws the roll-forward out by twice its value",
    "Reward point balances printed in the summary block being mistaken for currency amounts",
    "Credits listed in a separate section at the top of the activity list rather than in date order",
    "A reversed fee appearing in the fee section with a credit marker instead of among payments and credits",
    "Scanned statements, where there is no text layer and therefore no structure to read direction from",
  ],
  supported: [
    "Eligible card PDF statements, when the text layer can be read and both the previous and new balances are printed",
    "Credits identified by a minus sign, a credit marker, a credit column, or a statement-designated credits section",
    "Cashback and reward redemptions applied to the balance, exported as individual credit rows",
    "Fee reversals and dispute adjustments kept as their own rows rather than netted against charges",
    "Statements up to 50 pages, reconciled as one document",
  ],
  unsupported: [
    "Image-only or scanned PDFs with no extractable text",
    "PDFs that are still password-protected",
    "Documents containing more than one account",
    "Statements whose printed figures are insufficient to test the roll-forward",
  ],
  faqs: [
    {
      question: "Do reward points appear in the export?",
      answer:
        "No. Points are not a currency movement on the account and play no part in the balance equation, so they are not written as transactions. A cashback redemption applied to your balance is different: that is a real credit in money and it is exported as a row.",
    },
    {
      question: "A credit was extracted with the wrong sign. What happens to me?",
      answer:
        "You never see the file. The roll-forward will not close, the reconciliation is reported as failed, the paywall is not shown, and no payment is taken. The error costs you the upload and nothing else.",
    },
    {
      question: "Are refunds netted against the purchases they relate to?",
      answer:
        "No. Each stays as its own row with its own date and description. Netting would hide the original purchase and make expense reconciliation harder, and the equation does not require it.",
    },
    {
      question: "Is this an official Discover product?",
      answer:
        "No. Statement Reconcile is an independent tool with no affiliation to, sponsorship by, or endorsement from Discover Bank, and it is not operated on that institution's behalf.",
    },
    {
      question: "Does a successful check mean my statement is authentic?",
      answer:
        "No, and we do not claim it does. The check confirms that the transactions we extracted add up to the balances printed on the page. It says nothing about where the document came from or whether the figures on it are true.",
    },
  ],
  related: [
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context: "The general card conversion page, with the roll-forward explained end to end.",
    },
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "If the transaction rows themselves are what you need out of the document.",
    },
    {
      href: "/american-express-statement-to-excel",
      label: "American Express statement to Excel",
      context: "Covers how fees and interest are categorised apart from spending.",
    },
    {
      href: "/security",
      label: "How your file is handled",
      context: "What is read locally, what is sent for parsing, and what is retained.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Discover Bank, and we do not act on its behalf or under any arrangement with it.",
  futureExpansion: [
    "A taxonomy of credit types on card statements and how each is presented in a layout",
    "A worked example of the doubling effect a single reversed sign produces in the total",
    "Guidance on reconciling exported credits against merchant refund records",
  ],
};
