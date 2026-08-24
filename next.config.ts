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
};

export default nextConfig;
