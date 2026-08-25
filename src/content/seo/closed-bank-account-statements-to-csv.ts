import type { SeoPage } from "./types";

export const closedBankAccountStatementsToCsv: SeoPage = {
  slug: "closed-bank-account-statements-to-csv",
  targetQuery: "closed bank account statements to csv",
  searchIntent:
    "Someone who needs transaction data from an account that has been closed or migrated, where no download, export, or feed can be produced any more and only saved PDF statements remain.",
  title: "Closed Bank Account Statements to CSV",
  metaDescription:
    "Convert PDF statements from a closed or migrated bank account into CSV and Excel. No login to the old bank required — the statements you already saved are enough.",
  eyebrow: "Accounts that no longer exist",
  h1: "Convert Closed-Account Bank Statement PDFs to CSV",
  intro: [
    "A closed account is a particular kind of dead end. The transactions happened, they matter for the accounts or the return, and every normal route to getting them as data has been shut off with the account.",
    "There is no export to run, no feed to connect, and often no login to sign into. What usually survives is a set of PDF statements someone downloaded while the account was still open, which is enough.",
  ],
  outputFormats: ["csv", "xlsx"],
  outputDetails: [
    "A CSV with the fixed column order Date, Posted Date, Description, Debit, Credit, Amount, Balance, ready to map into whatever the transactions are being posted to.",
    "An Excel workbook with the same transactions plus a Statement Summary sheet recording the period and every check that ran.",
    "Amounts held as real numbers rather than text, so a sum in the destination behaves the way it should.",
    "A verification PDF per statement, which is the durable record of how the data was derived when the source account can no longer be consulted.",
  ],
  reconciliation: {
    heading: "Verification matters more when the source cannot be re-queried",
    body: [
      "With a live account, a doubtful figure can be checked. You log in, find the transaction, and settle the question in a minute. A closed account removes that option permanently, which changes the risk profile of the conversion: an error introduced now may never be discoverable again.",
      "That is the argument for insisting on arithmetic verification rather than accepting a plausible-looking spreadsheet. The extracted rows are re-added using exact decimal arithmetic and tested against the balances printed on the statement itself — opening to closing, the running-balance chain where the bank printed one, and any stated totals. If those do not agree, the conversion is rejected rather than sold.",
      "The check is entirely self-contained, which is what makes it work here. It relies only on figures printed on the document in hand, so it functions identically whether the account was closed last week or in 2019, and it needs nothing from the bank.",
    ],
    equation: "Opening balance + credits − debits = closing balance",
  },
  steps: [
    {
      title: "Find every statement that was saved",
      detail:
        "Check email archives for statement notifications with attachments, any shared drive the business used, and the records of whoever handled the books at the time. Statements are frequently more complete than anyone expects.",
    },
    {
      title: "Ask the bank before assuming the gap is permanent",
      detail:
        "Many institutions will reissue statements for a closed account on request, sometimes years later and sometimes for a fee. It is worth one phone call before reconstructing a period from other evidence.",
    },
    {
      title: "Convert the run as one or more packs",
      detail:
        "Group the statements into packs of up to 50 pages. Each is verified separately against its own printed balances, so a rejected document does not block the rest.",
    },
    {
      title: "Confirm the run is continuous",
      detail:
        "Each closing balance should equal the next opening balance. Where the chain breaks, a statement is missing — and for a closed account that is the moment to go looking, not later.",
    },
    {
      title: "Archive the verification alongside the data",
      detail:
        "Keep the verification PDF and the workbook together. When the source account no longer exists, the derivation record is the only evidence of where the numbers came from.",
    },
  ],
  sections: [
    {
      heading: "Why a closed account has no export path",
      body: [
        "Closing an account usually terminates online access to it, either immediately or after a short grace period. Once that happens, the CSV or OFX download that would have solved this problem in thirty seconds is gone, and so is the ability to connect a bank feed. The data still exists inside the institution, but the self-service routes to it do not.",
        "Migration produces the same outcome by a different route. When a bank is acquired or moves customers to a new platform, historical transactions frequently do not travel with the account. The new platform may show a balance carried forward and nothing before it, while the old platform has been retired entirely.",
        "In both cases PDF statements are the artefact that survives, because they were delivered to the customer rather than held on the customer's behalf. Whatever was downloaded or emailed at the time is still readable, and readable is all a converter needs.",
      ],
      bullets: [
        "Online access typically ends at or shortly after closure",
        "Bank feeds cannot connect to an account that no longer exists",
        "Platform migrations often carry a balance forward without the transaction history",
        "Statements delivered to the customer survive independently of the bank's systems",
      ],
    },
    {
      heading: "Where to look when the statements seem to be gone",
      body: [
        "The usual assumption is that if the statements are not in an obvious folder, they are lost. In practice they are often scattered rather than absent, because statements arrive through several channels over the life of an account.",
        "Email is the most productive place to search, because paperless statement notifications frequently carry the PDF as an attachment rather than only a link. Searching for the bank's name across the whole mail archive, including archived and deleted folders where the provider retains them, tends to surface more than expected. Accounting software is the second place: some packages store documents attached to bank reconciliations, and a previous bookkeeper may have filed them there.",
        "If genuine gaps remain, the bank itself is the next step rather than the last resort. Reissuing statements for a closed account is a routine request at most institutions, though it may take weeks and may carry a per-statement charge. That is still ordinarily cheaper than reconstructing a period from cheque stubs and invoices.",
      ],
      bullets: [
        "Email archives, including deleted and archived folders, for statement notifications with attachments",
        "Shared drives and document folders used by the business at the time",
        "Accounting software document storage attached to old reconciliations",
        "The bank's own reissue process, which usually survives account closure",
      ],
    },
    {
      heading: "What the conversion can and cannot establish",
      body: [
        "The verification confirms that the transactions read out of a statement are arithmetically consistent with the balances that statement prints. That is a genuine and useful guarantee, and it is the one that catches a skipped page or a misread column.",
        "It is not a guarantee that the statement is authentic, that it is complete as a record of the account, or that the bank's own figures were correct. For a closed account those questions cannot be settled from the document alone, and no converter should claim otherwise.",
        "If the transaction history is needed for something where authenticity matters — a dispute, a lending decision, a formal filing — the converted data is a working tool rather than evidence, and the original PDFs remain the documents of record. Keep them.",
      ],
    },
  ],
  commonIssues: [
    "Statements that only ever existed as links in an email, where the link now points at a retired banking platform",
    "The final statement of an account being issued after closure and arriving by post rather than electronically",
    "Scanned copies made when the account was closed, which contain no extractable text and cannot be converted",
    "A migrated account whose statements change layout partway through the run, when the bank moved platforms",
    "Joint or business accounts where statements went to a person who has since left the business",
    "Archived PDFs that were re-saved by a document management system and lost the coordinate precision column reconstruction relies on",
  ],
  supported: [
    "Text-based PDF statements from closed current, checking, savings, and credit card accounts",
    "Statements from banks that no longer exist, provided the PDF itself is readable",
    "Several statements grouped into one conversion pack, up to 50 pages in total",
    "Layout changes across a run, since each statement is parsed and verified independently",
  ],
  unsupported: [
    "Scanned or photographed statements, as this version performs no character recognition",
    "Password-protected PDFs, which must be re-saved without the password first",
    "Retrieving statements from a bank on your behalf — there is no login to the institution anywhere in this tool",
    "Reconstructing a period for which no statement exists, by inference or any other means",
    "A single document covering more than one account",
  ],
  faqs: [
    {
      question: "Do I need access to the old bank account?",
      answer:
        "No. Nothing in this tool logs into a bank. It reads the PDF statements you already have, in your own browser, which is precisely why a closed account is not an obstacle.",
    },
    {
      question:
        "The bank was acquired and the old statements have vanished from the new portal. Can you get them?",
      answer:
        "No — there is no connection to any institution here. But the acquiring bank is usually obliged to retain the records, and asking them to reissue statements for the period is often successful even when the portal shows nothing.",
    },
    {
      question: "My oldest statements are scans. Is there any way to convert them?",
      answer:
        "Not in this version. An image-only PDF is rejected rather than guessed at, because guessing at digits in a financial document is exactly the failure this tool exists to avoid. Ask the bank whether the original PDFs can be reissued.",
    },
    {
      question: "Is the converted CSV acceptable as a record for tax purposes?",
      answer:
        "Treat it as a working file, not a document of record. Keep the original PDF statements, which are what a tax authority or auditor would expect to see. Requirements vary by jurisdiction and this is not tax advice.",
    },
    {
      question: "What if a statement in the middle of the run fails verification?",
      answer:
        "It cannot be bought, and you will be told what stopped it. Remove it and take the statements that passed, then decide separately how to deal with that period — which for a closed account usually means requesting a reissue.",
    },
  ],
  related: [
    {
      href: "/catch-up-bookkeeping-bank-statements",
      label: "Catch-up bookkeeping from old bank statements",
      context: "Sequencing a long run of statements so the periods join without gaps.",
    },
    {
      href: "/bank-feed-history-missing",
      label: "When your bank feed does not go back far enough",
      context: "The live-account version of the same problem, and what to try first.",
    },
    {
      href: "/bank-statement-to-csv",
      label: "Bank statement to CSV",
      context: "Full detail on the CSV column order and how amounts and signs are written.",
    },
    {
      href: "/bank-statement-converter-for-bookkeepers",
      label: "Bank statement converter for bookkeepers",
      context: "Evidence for the working papers when the source account cannot be re-queried.",
    },
  ],
  futureExpansion: [
    "A checklist for requesting statement reissues, with the details banks typically ask for",
    "Notes on handling a run where the statement layout changes mid-way after a platform migration",
    "Guidance on what to retain as documents of record once converted data exists",
  ],
};
