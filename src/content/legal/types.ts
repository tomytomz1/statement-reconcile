/**
 * Content model for the legal and policy pages.
 *
 * Policies are data files rather than JSX for two reasons. First, one renderer, one table of
 * contents, and one anchor scheme then serve every document, so a link to a clause keeps
 * working and every page behaves the same way. Second, the wording can be audited on its own:
 * a reviewer reads the claims as plain strings without having to read markup around them, and
 * a script can check headings, anchors, titles, and descriptions across the whole set.
 *
 * Every claim in these documents must be true of the shipped product. If the product changes,
 * the file changes with it.
 */

export type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "callout"; tone: "verified" | "caution" | "neutral"; text: string }
  | { kind: "definitions"; items: Array<{ term: string; definition: string }> };

export type LegalSection = {
  id: string; // stable kebab-case anchor
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  slug: string;
  title: string; // <title>, unique
  metaDescription: string; // unique, 140-165 chars
  h1: string;
  /** ISO date, YYYY-MM-DD. */
  lastUpdated: string;
  /** One or two sentences under the H1. */
  summary: string[];
  /** A short plain-English "what this means" box shown before the formal text. */
  plainEnglish: string[];
  sections: LegalSection[];
};
