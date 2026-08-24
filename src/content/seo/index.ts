import { americanExpressStatementToExcel } from "./american-express-statement-to-excel";
import { bankOfAmericaStatementToExcel } from "./bank-of-america-statement-to-excel";
import { bankStatementConverter } from "./bank-statement-converter";
import { bankStatementSpreadsheetForAccountants } from "./bank-statement-spreadsheet-for-accountants";
import { bankStatementToCsv } from "./bank-statement-to-csv";
import { bankStatementToExcel } from "./bank-statement-to-excel";
import { bankStatementToGoogleSheets } from "./bank-statement-to-google-sheets";
import { bankStatementToQuickbooksCsv } from "./bank-statement-to-quickbooks-csv";
import { bankStatementToXeroCsv } from "./bank-statement-to-xero-csv";
import { bankStatementTransactionExtractor } from "./bank-statement-transaction-extractor";
import { businessBankStatementToExcel } from "./business-bank-statement-to-excel";
import { capitalOneStatementToExcel } from "./capital-one-statement-to-excel";
import { chaseStatementToExcel } from "./chase-statement-to-excel";
import { citiStatementToExcel } from "./citi-statement-to-excel";
import { convertBankStatementToCsv } from "./convert-bank-statement-to-csv";
import { convertBankStatementToExcel } from "./convert-bank-statement-to-excel";
import { convertPdfTransactionsToCsv } from "./convert-pdf-transactions-to-csv";
import { convertPdfTransactionsToExcel } from "./convert-pdf-transactions-to-excel";
import { creditCardStatementToCsv } from "./credit-card-statement-to-csv";
import { creditCardStatementToExcel } from "./credit-card-statement-to-excel";
import { discoverStatementToExcel } from "./discover-statement-to-excel";
import { extractTransactionsFromPdf } from "./extract-transactions-from-pdf";
import { pdfBankStatementToCsv } from "./pdf-bank-statement-to-csv";
import { pdfBankStatementToExcel } from "./pdf-bank-statement-to-excel";
import { pdfBankTransactionExtractor } from "./pdf-bank-transaction-extractor";
import type { SeoPage } from "./types";
import { wellsFargoStatementToExcel } from "./wells-fargo-statement-to-excel";

/**
 * The registry of conversion landing pages.
 *
 * The order here is the order used by the sitemap, the footer, and the related-pages index, so
 * it runs from broad to narrow: category pages, then format-specific, then statement type, then
 * destination software, then issuer-named. Pages we most want crawled are therefore linked
 * earliest from every page on the site.
 */

export const seoPages: readonly SeoPage[] = [
  bankStatementConverter,
  bankStatementToExcel,
  bankStatementToCsv,
  convertBankStatementToExcel,
  convertBankStatementToCsv,
  pdfBankStatementToExcel,
  pdfBankStatementToCsv,
  convertPdfTransactionsToExcel,
  convertPdfTransactionsToCsv,
  creditCardStatementToExcel,
  creditCardStatementToCsv,
  businessBankStatementToExcel,
  bankStatementTransactionExtractor,
  pdfBankTransactionExtractor,
  extractTransactionsFromPdf,
  bankStatementSpreadsheetForAccountants,
  bankStatementToQuickbooksCsv,
  bankStatementToXeroCsv,
  bankStatementToGoogleSheets,
  chaseStatementToExcel,
  bankOfAmericaStatementToExcel,
  wellsFargoStatementToExcel,
  capitalOneStatementToExcel,
  citiStatementToExcel,
  americanExpressStatementToExcel,
  discoverStatementToExcel,
];

const bySlug = new Map(seoPages.map((page) => [page.slug, page]));

export function seoPage(slug: string): SeoPage | undefined {
  return bySlug.get(slug);
}

export function seoSlugs(): string[] {
  return seoPages.map((page) => page.slug);
}

/**
 * Pages linked from the footer.
 *
 * Every landing page appears here, which is what guarantees none of them is orphaned and that
 * any one is at most two clicks from any other. Grouping is by the kind of search that lands
 * on them rather than by an internal taxonomy.
 */
export const footerGroups = [
  {
    heading: "Convert to Excel",
    slugs: [
      "bank-statement-to-excel",
      "convert-bank-statement-to-excel",
      "pdf-bank-statement-to-excel",
      "convert-pdf-transactions-to-excel",
      "credit-card-statement-to-excel",
      "business-bank-statement-to-excel",
      "bank-statement-converter",
    ],
  },
  {
    heading: "Convert to CSV",
    slugs: [
      "bank-statement-to-csv",
      "convert-bank-statement-to-csv",
      "pdf-bank-statement-to-csv",
      "convert-pdf-transactions-to-csv",
      "credit-card-statement-to-csv",
      "bank-statement-spreadsheet-for-accountants",
    ],
  },
  {
    heading: "Extract and import",
    slugs: [
      "extract-transactions-from-pdf",
      "bank-statement-transaction-extractor",
      "pdf-bank-transaction-extractor",
      "bank-statement-to-quickbooks-csv",
      "bank-statement-to-xero-csv",
      "bank-statement-to-google-sheets",
    ],
  },
  {
    heading: "By bank or issuer",
    slugs: [
      "chase-statement-to-excel",
      "bank-of-america-statement-to-excel",
      "wells-fargo-statement-to-excel",
      "capital-one-statement-to-excel",
      "citi-statement-to-excel",
      "american-express-statement-to-excel",
      "discover-statement-to-excel",
    ],
  },
] as const;

export type { SeoPage } from "./types";
