import { americanExpressStatementToExcel } from "./american-express-statement-to-excel";
import { bankFeedHistoryMissing } from "./bank-feed-history-missing";
import { bankOfAmericaStatementToExcel } from "./bank-of-america-statement-to-excel";
import { bankStatementConverter } from "./bank-statement-converter";
import { bankStatementConverterForBookkeepers } from "./bank-statement-converter-for-bookkeepers";
import { bankStatementToCsv } from "./bank-statement-to-csv";
import { bankStatementToExcel } from "./bank-statement-to-excel";
import { bankStatementToGoogleSheets } from "./bank-statement-to-google-sheets";
import { bankStatementToQuickbooksCsv } from "./bank-statement-to-quickbooks-csv";
import { bankStatementToXeroCsv } from "./bank-statement-to-xero-csv";
import { businessBankStatementToExcel } from "./business-bank-statement-to-excel";
import { capitalOneStatementToExcel } from "./capital-one-statement-to-excel";
import { catchUpBookkeepingBankStatements } from "./catch-up-bookkeeping-bank-statements";
import { chaseStatementToExcel } from "./chase-statement-to-excel";
import { citiStatementToExcel } from "./citi-statement-to-excel";
import { closedBankAccountStatementsToCsv } from "./closed-bank-account-statements-to-csv";
import { creditCardStatementToCsv } from "./credit-card-statement-to-csv";
import { creditCardStatementToExcel } from "./credit-card-statement-to-excel";
import { discoverStatementToExcel } from "./discover-statement-to-excel";
import { extractTransactionsFromPdf } from "./extract-transactions-from-pdf";
import type { SeoPage } from "./types";
import { wellsFargoStatementToExcel } from "./wells-fargo-statement-to-excel";

/**
 * The registry of conversion landing pages.
 *
 * The order here is the order used by the sitemap, the footer, and the related-pages index, so
 * it runs from broad to narrow: category pages, then format-specific, then statement type, then
 * use case, then destination software, then issuer-named. Pages we most want crawled are
 * therefore linked earliest from every page on the site.
 *
 * One page per distinct intent. An earlier version carried five URLs competing for "bank
 * statement to Excel" and four for the CSV equivalent, differentiated only by word order.
 * Search engines resolve that phrasing to the same intent, so the pages competed with each
 * other rather than with anyone else. The retired slugs are 301'd in `next.config.ts`.
 */

export const seoPages: readonly SeoPage[] = [
  bankStatementConverter,
  bankStatementToExcel,
  bankStatementToCsv,
  creditCardStatementToExcel,
  creditCardStatementToCsv,
  businessBankStatementToExcel,
  extractTransactionsFromPdf,
  bankStatementConverterForBookkeepers,
  catchUpBookkeepingBankStatements,
  closedBankAccountStatementsToCsv,
  bankFeedHistoryMissing,
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
 *
 * The "By bank or issuer" heading is load-bearing: `scripts/audit-seo.ts` reads it to decide
 * which pages must carry an independence notice.
 */
export const footerGroups = [
  {
    heading: "Convert a statement",
    slugs: [
      "bank-statement-converter",
      "bank-statement-to-excel",
      "bank-statement-to-csv",
      "credit-card-statement-to-excel",
      "credit-card-statement-to-csv",
      "business-bank-statement-to-excel",
      "extract-transactions-from-pdf",
    ],
  },
  {
    heading: "Catch-up and cleanup",
    slugs: [
      "bank-statement-converter-for-bookkeepers",
      "catch-up-bookkeeping-bank-statements",
      "closed-bank-account-statements-to-csv",
      "bank-feed-history-missing",
    ],
  },
  {
    heading: "Import into software",
    slugs: [
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
