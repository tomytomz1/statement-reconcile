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
const PRICE_DISPLAY = `$${PRICE_USD}`;
const MAX_PAGES = numberFromEnv(process.env.NEXT_PUBLIC_MAX_PAGES, 50);
const MAX_FILE_SIZE_MB = numberFromEnv(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB, 20);

export const siteConfig = {
  /** Public brand. */
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Statement Reconcile",
  /** Short descriptor used next to the brand in navigation and metadata. */
  brandDescriptor: "Bank Statement Converter",
  /** Registered operating entity shown in legal documents and the public footer. */
  legalBusinessName:
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME?.trim() || "Statement Reconcile LLC",
  /** Governing law and venue shown in the terms. */
  legalJurisdiction: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION?.trim() || "Michigan",
  /** Canonical production URL. */
  url: canonicalUrl,
  domain: hostFromUrl(canonicalUrl),

  /** Primary SEO category the homepage competes in. */
  primaryCategory: "Bank Statement Converter",
  /** Primary outcome the customer wants. */
  primaryOutcome: "Convert Bank Statements to Excel & CSV",
  /** Trust differentiator. Never the homepage H1. */
  differentiator: "Trace accepted rows to their source and see whether the numbers balance.",
  /**
   * Primary call to action label used across the funnel.
   *
   * "Verify" rather than "check": the visitor is being offered a free verification whose
   * result they inspect before any charge, and "check my statements" describes neither the
   * value nor the exchange.
   */
  primaryCta: "Verify My Statements Free",
  /**
   * The header button. Same promise, minus "Free", because the word has to survive a 360px
   * viewport next to the wordmark and the price line already carries it everywhere else.
   */
  navCta: "Verify My Statements",
  secondaryCta: "See how it works",

  /** Public name of the one-time paid bundle. */
  productName: "Verified Conversion Pack",

  /** Commercial offer. */
  price: {
    amountUsd: PRICE_USD,
    amountCents: Math.round(PRICE_USD * 100),
    currency: "USD",
    display: PRICE_DISPLAY,
  },
  offerLine: `One or more statements · Up to ${MAX_PAGES} total pages · No account`,
  /**
   * The commercial bargain, stated before the visitor selects a file.
   *
   * V1 withheld the amount until a pack had passed, on the theory that the verification
   * result sold the price. It also meant someone had to hand a bank statement to an unknown
   * tool to discover what it cost. Stating the terms up front is the better trade, and the
   * number is interpolated from `price.display` so it can never drift from what Stripe
   * charges.
   */
  priceLine: `Free verification · ${PRICE_DISPLAY} only if your pack passes · No subscription`,
  verifiedCta: "Get My Verified Excel + CSV",
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
