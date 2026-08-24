/**
 * Content model for the conversion landing pages.
 *
 * Every money page is a data file rather than a JSX blob so the copy can be reviewed and
 * edited without touching components, and so an automated audit can verify that titles,
 * descriptions, and internal links are unique across the whole set.
 *
 * Each page must earn its own URL: the sections below are required, and the SEO audit
 * script fails the build if two pages share a title, a description, or their body copy.
 */

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoSection = {
  heading: string;
  /** Paragraphs of plain prose. No marketing claims that are not true of the product. */
  body: string[];
  bullets?: string[];
};

export type SeoStep = {
  title: string;
  detail: string;
};

export type SeoRelatedLink = {
  href: string;
  label: string;
  /** Why this link is relevant, shown as supporting text so the link is useful, not filler. */
  context: string;
};

export type SeoPage = {
  /** URL path segment, without a leading slash. */
  slug: string;
  /** The search this page is written for. Recorded in docs/SEO_CONTENT_MAP.md. */
  targetQuery: string;
  /** What the searcher is trying to accomplish. */
  searchIntent: string;
  /** <title>. Must be unique across all pages. */
  title: string;
  /** <meta name="description">. Must be unique across all pages. */
  metaDescription: string;
  /** Small label above the H1. */
  eyebrow: string;
  /** The single H1. */
  h1: string;
  /** One or two sentences under the H1. */
  intro: string[];
  /** Output format this page promises. Used to keep copy honest about enabled features. */
  outputFormats: Array<"csv" | "xlsx">;
  /** What the downloaded file actually contains. */
  outputDetails: string[];
  /** How reconciliation applies to this specific statement type. */
  reconciliation: {
    heading: string;
    body: string[];
    equation: string;
  };
  /** The numbered process, specific to this page's task. */
  steps: SeoStep[];
  /** Distinct long-form sections. At least two per page. */
  sections: SeoSection[];
  /** Formatting problems that are common for this query. */
  commonIssues: string[];
  /** Cases the product handles and cases it does not. */
  supported: string[];
  unsupported: string[];
  /** Page-specific FAQs. At least three, none duplicated across pages. */
  faqs: SeoFaq[];
  /** Internal links out, with context. */
  related: SeoRelatedLink[];
  /** Non-affiliation notice for pages that name a bank or card issuer. */
  independenceNotice?: string;
  /** Ideas recorded for future content expansion; not rendered. */
  futureExpansion: string[];
};
