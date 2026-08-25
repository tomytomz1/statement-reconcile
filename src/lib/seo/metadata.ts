import type { Metadata } from "next";

import { absoluteUrl, canonicalUrl, siteConfig } from "@/config/site";

/**
 * Metadata construction.
 *
 * Every page gets a self-referencing canonical URL and a unique title and description. The
 * two things this module exists to make impossible are a page without a canonical and a
 * page that accidentally inherits another page's description, both of which are the usual
 * cause of a programmatic content set competing with itself in search results.
 */

export type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Set for any route that can contain a live conversion. */
  noindex?: boolean;
  /**
   * When true, the title is used as-is and is not wrapped by the root
   * `%s | Brand` template. Used by the homepage so the public title is exactly
   * `Bank Statement Converter to Excel & CSV | Statement Reconcile`.
   */
  absoluteTitle?: boolean;
  /** Overrides the default social image. */
  ogImagePath?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function pageMetadata(input: PageMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const image = input.ogImagePath ?? siteConfig.social.ogImagePath;
  const titleIsComplete = input.absoluteTitle || hasBrandSuffix(input.title);

  const metadata: Metadata = {
    title: titleIsComplete ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: input.type ?? "website",
      url,
      siteName: siteConfig.brandName,
      title: input.title,
      description: input.description,
      locale: "en_US",
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [absoluteUrl(image)],
      ...(siteConfig.social.twitterHandle
        ? { site: siteConfig.social.twitterHandle, creator: siteConfig.social.twitterHandle }
        : {}),
    },
  };

  if (input.noindex) {
    // `nocache` and `noarchive` matter as much as `noindex` here: a cached copy of a page
    // that once displayed a preview would defeat the point of storing nothing.
    metadata.robots = {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true, "max-snippet": -1 },
    };
  }

  return metadata;
}

function hasBrandSuffix(title: string): boolean {
  return title.endsWith(`| ${siteConfig.brandName}`) || title.endsWith(`— ${siteConfig.brandName}`);
}

/** Base metadata applied at the root layout and inherited by every page. */
export const rootMetadata: Metadata = {
  metadataBase: new URL(canonicalUrl),
  title: {
    default: `${siteConfig.brandName} — ${siteConfig.primaryOutcome}`,
    template: `%s | ${siteConfig.brandName}`,
  },
  description: `Convert PDF bank and credit-card statements to Excel and CSV. ${siteConfig.differentiator} No account required.`,
  applicationName: siteConfig.brandName,
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "finance",
  // Icons are picked up from the `app/` file conventions (`favicon.ico`, `icon.svg`,
  // `apple-icon.tsx`), so declaring them here would only create a second source of truth.
  manifest: "/manifest.webmanifest",
};

/**
 * Homepage `<title>`. Kept as a named constant so the SEO audit can verify uniqueness
 * against landing pages without importing the homepage module.
 */
export const HOMEPAGE_TITLE = `${siteConfig.primaryOutcome} | ${siteConfig.brandName}`;

/** Titles longer than this get truncated in results; the SEO audit warns above it. */
export const TITLE_SOFT_LIMIT = 62;
export const DESCRIPTION_SOFT_LIMIT = 165;
