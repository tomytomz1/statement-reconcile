import type { SeoPage } from "./types";

export const capitalOneStatementToExcel: SeoPage = {
  slug: "capital-one-statement-to-excel",
  targetQuery: "capital one statement to excel",
  searchIntent:
    "A customer who could be holding either a deposit-account statement or a card statement from the same issuer, and needs to know which one converts how.",
  title: "Capital One Statement to Excel | Statement Reconcile",
  metaDescription:
    "Convert an eligible Capital One PDF statement to Excel and CSV, deposit account or card. Independent tool, and the totals must reconcile before billing appears.",
  eyebrow: "Two statement types",
  h1: "Capital One Statement to Excel",
  intro: [
    "Capital One, N.A. issues both deposit accounts and credit cards, so “my Capital One statement” can mean two documents that balance in completely different ways. Before anything useful can be converted, the first thing to establish is which of the two you are holding.",
    "The converter works that out from the document itself, applies the matching equation, and shows you the outcome before there is anything to pay for. A checking or savings statement is verified as a running ledger; a card statement is verified by rolling the previous balance forward to the new balance.",
  ],
  outputFormats: ["xlsx", "csv"],
  outputDetails: [
    "A Transactions sheet with an autofilter and a frozen header row, identical in shape for either statement type, so downstream formulas never have to branch on which account you exported.",
    "A Statement Summary sheet naming which reconciliation method was applied — the asset-account ledger or the card roll-forward — alongside the period, balances, totals, fees, interest, transaction count, result, and generation time.",
    "A CSV whose seven columns never move: Date, Posted Date, Description, Debit, Credit, Amount, Balance. On a card statement the Balance column is populated only where the document actually prints a figure for it.",
    "One pack payment covers both files, up to 50 total pages, whichever of the two account types it turns out to be.",
  ],
  reconciliation: {
    heading: "Two account types, two equations, one gate",
    body: [
      "For a checking or savings statement, the ledger runs forward through the period: the opening balance, plus everything credited, minus everything debited, has to land exactly on the closing balance the statement printed.",
      "A card statement does not work that way, because a card balance is an amount owed rather than an amount held. There the roll-forward is the previous balance plus purchases plus fees plus interest, minus payments and minus credits, arriving at the new balance. Purchases increase what is owed; a payment or a refund reduces it. Applying the deposit-account equation to a card would invert half the document while still producing a table that reads sensibly.",
      "Whichever equation applies, it is evaluated by the same deterministic engine using plain decimal arithmetic over the extracted rows, and the same gate follows it: pass and you are offered the files, fail and the payment step never appears. We hold no per-issuer register of verified layouts, so this arithmetic is the whole of the assurance we offer — but it is assurance about your document rather than about a category of documents.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Work out which statement you have",
      detail:
        "A deposit statement shows an opening and closing balance for the period. A card statement shows a previous balance, a new balance, and usually a minimum payment and a due date.",
    },
    {
      title: "Load the PDF",
      detail:
        "The file is read inside your browser. Only the extracted text is sent onward for parsing, and it is not retained once the response has been returned.",
    },
    {
      title: "The right equation is selected",
      detail:
        "The parser determines the account type from the statement's own summary block and applies either the asset-ledger check or the card roll-forward.",
    },
    {
      title: "Both sides of the equation are shown",
      detail:
        "The preview prints the computed total next to the balance printed on the statement, so you see the comparison rather than accepting a pass or fail on trust.",
    },
    {
      title: "Unlock it if it balanced",
      detail:
        "The one-time billing screen releases the workbook and CSV. No account is created, no email is required, and there is no subscription behind the payment.",
    },
  ],
  sections: [
    {
      heading: "Telling a deposit statement from a card statement",
      body: [
        "The two documents look superficially similar — a summary block, then a list of dated lines with amounts beside them — but the summary block gives the type away immediately, and it is worth checking before you upload.",
        "It matters because direction is reversed between them. On a deposit account, money arriving is a credit that raises the balance. On a card, the nearest equivalent is a payment you made, which lowers the balance owed. A converter that treats one as the other produces a table where every sign is defensible in isolation and wrong in aggregate.",
      ],
      bullets: [
        "Deposit statements name an opening or beginning balance and a closing or ending balance",
        "Card statements name a previous balance and a new balance, usually with a credit limit nearby",
        "A minimum payment and a payment due date appear only on card statements",
        "Interest charged, together with a rate table, is a card-statement feature",
        "Some deposit statements carry a running balance column; card statements typically do not",
      ],
    },
    {
      heading: "What changes in the export, and what stays the same",
      body: [
        "The output shape is deliberately identical for both. Seven CSV columns in a fixed order, one workbook with the same two sheets, the same column names. If you convert a card statement one month and a checking statement the next, the import mapping you built the first time keeps working.",
        "What differs is which fields carry content. A card statement fills the fee and interest totals on the summary sheet and frequently leaves the per-row Balance column empty, because most card layouts do not print a running balance and we do not invent one. A deposit statement usually populates Balance on every row and leaves interest at zero unless the account earned some. Neither case is an error, and neither affects whether the reconciliation passes.",
      ],
    },
    {
      heading: "Why we describe the equations and not the issuer",
      body: [
        "Everything above describes how deposit statements and card statements behave as document types across the industry. None of it is a description of any particular institution's template, and it is not offered as one. We have not audited Capital One, N.A. statements, and we do not maintain a per-bank list of supported layouts.",
        "That absence is deliberate rather than an omission we intend to fix. A supported-banks list is a claim made in advance about documents nobody has seen; the arithmetic check is a claim made after reading the document you actually have. Convert eligible PDF statements when the text can be extracted and the printed totals can be independently reconciled, and treat the reconciliation result as the answer.",
      ],
    },
  ],
  commonIssues: [
    "A card statement uploaded in the belief that it is a deposit statement, which is why the summary sheet records the method that was applied",
    "Combined documents placing a card account and a deposit account in one PDF, which have no single equation to satisfy",
    "Card statements printing a rewards or points balance in the summary block, which is not currency and is not part of any ledger",
    "Deposit statements whose opening balance appears only as a mid-page label rather than in the summary block",
    "Scanned copies of either statement type, which contain no extractable text at all",
  ],
  supported: [
    "Eligible deposit-account PDF statements, when the text layer reads cleanly and the period balances are printed",
    "Eligible card PDF statements, when a previous balance and a new balance are both present",
    "Automatic selection between the asset-ledger check and the card roll-forward, with the choice recorded on the summary sheet",
    "Statements up to 50 pages, converted and verified as one document",
    "Amounts written with parentheses, trailing CR or DR markers, or either decimal separator convention",
  ],
  unsupported: [
    "Image-only PDFs produced by a scanner or a phone camera",
    "PDFs whose password has not been removed",
    "Any file containing more than one account, including a card and a deposit account issued together",
    "Statements that print activity but not the balances the equation needs",
  ],
  faqs: [
    {
      question:
        "I have both a card and a checking account with the same issuer. Is that one conversion?",
      answer:
        "Yes, as two separate files in one paid conversion pack, provided the combined pack stays within 50 pages. Each statement keeps its own equation and is verified independently; two accounts still cannot be bundled inside one PDF.",
    },
    {
      question: "How does the converter know which equation to apply?",
      answer:
        "From the statement's own summary block. Wording such as previous balance, new balance, minimum payment and credit limit identifies a card; opening and closing balances for a period identify a deposit account. The method chosen is written onto the Statement Summary sheet so you can confirm it was the right one.",
    },
    {
      question: "Why is the Balance column empty on my card export?",
      answer:
        "Because most card layouts do not print a running balance after each transaction, and we do not manufacture one. The column stays in place for consistency across exports and is filled only where the document itself provides the figure.",
    },
    {
      question: "Is Statement Reconcile part of Capital One?",
      answer:
        "No. It is an independent product with no affiliation to Capital One, N.A. and no authority to act for it. The institution is named here only to describe the documents readers are trying to convert.",
    },
    {
      question: "My rewards balance is missing from the spreadsheet. Should it be there?",
      answer:
        "No. Rewards points are not currency movements on the account and play no part in either balancing equation, so they are left out of the transaction table. Only the monetary rows that make the statement balance are exported.",
    },
  ],
  related: [
    {
      href: "/credit-card-statement-to-excel",
      label: "Credit card statement to Excel",
      context:
        "If it turns out to be the card statement, this page covers the roll-forward in full.",
    },
    {
      href: "/bank-statement-to-excel",
      label: "Bank statement to Excel",
      context: "If it turns out to be the deposit account, this is the general version.",
    },
    {
      href: "/citi-statement-to-excel",
      label: "Citi statement to Excel",
      context:
        "Explains how printed section subtotals give the check a second point of comparison.",
    },
    {
      href: "/faq",
      label: "Frequently asked questions",
      context: "Pricing, privacy, and what happens when a statement fails the check.",
    },
  ],
  independenceNotice:
    "Statement Reconcile is an independent tool. We are not affiliated with, endorsed by, or sponsored by Capital One, N.A., we do not act on its behalf, and nothing on this page is published with its involvement.",
  futureExpansion: [
    "A side-by-side walkthrough of the two equations applied to the same month of activity",
    "A page explaining why two accounts cannot share a single conversion",
    "Notes on which summary fields are populated for card statements versus deposit statements",
  ],
};
