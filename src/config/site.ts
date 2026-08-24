/**
 * Single source of truth for brand, domain, commercial offer, and public metadata.
 *
 * Nothing in the application should hardcode the brand name, price, domain, or page
 * limits. Changing the offer or brand should be a change to this file only.
 */

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Canonical production origin, without a trailing slash. */
export const canonicalUrl = stripTrailingSlash(rawSiteUrl || "https://statementreconcile.com");

const PRICE_USD = numberFromEnv(process.env.NEXT_PUBLIC_PRICE_USD, 19);
const MAX_PAGES = numberFromEnv(process.env.NEXT_PUBLIC_MAX_PAGES, 50);
const MAX_FILE_SIZE_MB = numberFromEnv(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB, 20);

export const siteConfig = {
  /** Public brand. */
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Statement Reconcile",
  /** Short descriptor used next to the brand in navigation and metadata. */
  brandDescriptor: "Bank Statement Converter",
  /** Legal entity placeholder — replace with the registered business name before launch. */
  legalBusinessName:
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME?.trim() || "Statement Reconcile (sole proprietor)",
  /**
   * Governing law and venue for the terms. Left as an explicit placeholder rather than a guess:
   * naming a jurisdiction we have not actually registered in would make the terms misleading.
   * `pnpm doctor` reports this as an outstanding launch task until it is set.
   */
  legalJurisdiction:
    process.env.NEXT_PUBLIC_LEGAL_JURISDICTION?.trim() ||
    "the jurisdiction of the operator's registered place of business (to be confirmed before launch)",
  /** Canonical production URL. */
  url: canonicalUrl,
  domain: hostFromUrl(canonicalUrl),

  /** Primary SEO category the homepage competes in. */
  primaryCategory: "Bank Statement Converter",
  /** Primary outcome the customer wants. */
  primaryOutcome: "Convert Bank Statements to Excel & CSV",
  /** Trust differentiator. Never the homepage H1. */
  differentiator: "See whether the numbers balance before you pay.",
  /** Primary call to action label used across the funnel. */
  primaryCta: "Convert My Bank Statement",
  secondaryCta: "See how it works",

  /** Commercial offer. */
  price: {
    amountUsd: PRICE_USD,
    amountCents: Math.round(PRICE_USD * 100),
    currency: "USD",
    display: `$${PRICE_USD}`,
  },
  offerLine: `$${PRICE_USD} once · One or more statements · Up to ${MAX_PAGES} total pages · No account`,
  verifiedCta: `Download verified Excel + CSV + reports — $${PRICE_USD}`,
  ownedCategory: "Verified Bank Statement Conversion",

  /** Hard product limits, mirrored by server-side validation. */
  limits: {
    maxPages: MAX_PAGES,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    maxFileSizeBytes: MAX_FILE_SIZE_MB * 1024 * 1024,
    /** How long an encrypted local job survives in the browser. */
    localJobTtlMinutes: 60,
  },

  /** Contact + support surface. Uses the production domain so it stays consistent. */
  contact: {
    supportEmail:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || `support@${hostFromUrl(canonicalUrl)}`,
    securityEmail:
      process.env.NEXT_PUBLIC_SECURITY_EMAIL?.trim() || `security@${hostFromUrl(canonicalUrl)}`,
    privacyEmail:
      process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || `privacy@${hostFromUrl(canonicalUrl)}`,
    /** Target first response time we are willing to state publicly. */
    responseTarget: "2 business days",
  },

  /** Social / sharing metadata. */
  social: {
    ogImagePath: "/opengraph-image",
    twitterCard: "summary_large_image",
    /** Left empty until real accounts exist — we do not invent profiles. */
    twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim() || "",
  },

  /** Analytics identifiers, resolved from the environment so no IDs are hardcoded. */
  analytics: {
    provider: (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.trim() || "none") as AnalyticsProvider,
    key: process.env.NEXT_PUBLIC_ANALYTICS_KEY?.trim() || "",
    host: process.env.NEXT_PUBLIC_ANALYTICS_HOST?.trim() || "",
  },

  /** Product/schema version stamped onto exports and payment metadata. */
  productVersion: process.env.NEXT_PUBLIC_PRODUCT_VERSION?.trim() || "1.0.0",
} as const;

export type AnalyticsProvider = "none" | "plausible" | "vercel";

export const routes = {
  home: "/",
  app: "/app",
  result: (jobId: string) => `/app/result/${jobId}`,
  pricing: "/pricing",
  howItWorks: "/how-it-works",
  security: "/security",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",
  faq: "/faq",
  contact: "/contact",
  checkoutSuccess: "/checkout/success",
  checkoutCancel: "/checkout/cancel",
} as const;

/** Route prefixes that must never be indexed because they can contain a live job. */
export const noindexPrefixes = ["/app", "/checkout"] as const;

export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) return `${canonicalUrl}/${path}`;
  return `${canonicalUrl}${path === "/" ? "" : path}`;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function hostFromUrl(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return "statementreconcile.com";
  }
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
