import type { NextConfig } from "next";

/**
 * Next configuration.
 *
 * Security headers are set in middleware rather than here, because the Content-Security-Policy
 * differs per route and carries a per-request nonce on the processing routes. What stays here
 * are the build-level decisions: source maps off in production, no framework fingerprint
 * header, and a hard failure on type or lint errors so a broken build cannot ship.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Removes the `X-Powered-By: Next.js` response header. Free, and there is no reason to
  // advertise the framework version to a scanner.
  poweredByHeader: false,

  // A production source map would let anyone read the parsing and reconciliation logic in
  // full. It is not a secret, but it is not something to serve to every visitor either.
  productionBrowserSourceMaps: false,

  // Trailing-slash and canonical URL handling has to be unambiguous or the canonical tags and
  // the sitemap will disagree with what the server actually serves.
  trailingSlash: false,

  // Linting is not part of `next build` in this version; `pnpm verify` and CI run it as its
  // own step, and both treat a warning as a failure.
  typescript: {
    ignoreBuildErrors: false,
  },

  outputFileTracingIncludes: {
    // ExcelJS resolves some of its own assets at runtime; tracing them explicitly avoids a
    // cold-start failure on a serverless function that only shows up after a paid export.
    "/api/export": ["./node_modules/exceljs/**"],
  },

  async redirects() {
    return RETIRED_SLUG_REDIRECTS.map(([source, destination]) => ({
      source: `/${source}`,
      destination: `/${destination}`,
      permanent: true,
    }));
  },
};

/**
 * Landing pages retired when duplicate search intents were consolidated.
 *
 * Each of these was a separate page competing for the same query family as its destination —
 * "convert bank statement to excel" and "pdf bank statement to excel" are the same intent
 * expressed differently, and running both meant the two pages split their own signals rather
 * than competing with anyone else.
 *
 * Every destination is a live page and never itself a source, which is what keeps each of
 * these to a single hop. `tests/unit/redirects.test.ts` enforces both properties, because
 * `dynamicParams = false` on the landing route means a slug 404s the moment its data file is
 * deleted — a missing entry here is a dead URL rather than a warning.
 */
const RETIRED_SLUG_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  // "bank statement to Excel" — five URLs collapsed to one.
  ["convert-bank-statement-to-excel", "bank-statement-to-excel"],
  ["pdf-bank-statement-to-excel", "bank-statement-to-excel"],
  ["convert-pdf-transactions-to-excel", "bank-statement-to-excel"],
  // "bank statement to CSV" — the mirror of the above.
  ["convert-bank-statement-to-csv", "bank-statement-to-csv"],
  ["pdf-bank-statement-to-csv", "bank-statement-to-csv"],
  ["convert-pdf-transactions-to-csv", "bank-statement-to-csv"],
  // "transaction extractor" — the same phrase with the qualifiers reordered.
  ["bank-statement-transaction-extractor", "extract-transactions-from-pdf"],
  ["pdf-bank-transaction-extractor", "extract-transactions-from-pdf"],
  // Renamed to match how the audience describes itself.
  ["bank-statement-spreadsheet-for-accountants", "bank-statement-converter-for-bookkeepers"],
];

export { RETIRED_SLUG_REDIRECTS };

export default nextConfig;
