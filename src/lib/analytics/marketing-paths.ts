/**
 * Fail closed: only verified public routes may send OPTIONAL marketing analytics.
 * This must never permit converter, checkout, API, or any future sensitive routes.
 * Tests assert parity with the SEO landing-page registry so new marketing pages
 * are deliberately approved before they enter analytics reporting.
 */
const PUBLIC_MARKETING_PATHS = new Set([
  "/",
  "/contact",
  "/faq",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/refund-policy",
  "/security",
  "/terms",
  "/american-express-statement-to-excel",
  "/bank-feed-history-missing",
  "/bank-of-america-statement-to-excel",
  "/bank-statement-converter",
  "/bank-statement-converter-for-bookkeepers",
  "/bank-statement-to-csv",
  "/bank-statement-to-excel",
  "/bank-statement-to-google-sheets",
  "/bank-statement-to-quickbooks-csv",
  "/bank-statement-to-xero-csv",
  "/business-bank-statement-to-excel",
  "/capital-one-statement-to-excel",
  "/catch-up-bookkeeping-bank-statements",
  "/chase-statement-to-excel",
  "/citi-statement-to-excel",
  "/closed-bank-account-statements-to-csv",
  "/credit-card-statement-to-csv",
  "/credit-card-statement-to-excel",
  "/discover-statement-to-excel",
  "/extract-transactions-from-pdf",
  "/wells-fargo-statement-to-excel",
]);

export function isPublicMarketingPath(pathname: string): boolean {
  return PUBLIC_MARKETING_PATHS.has(pathname);
}
