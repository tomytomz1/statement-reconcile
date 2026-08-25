import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * JSON-LD builders.
 *
 * Structured data is only emitted for things that are genuinely on the page. Marking up an
 * FAQ that is not rendered, or an aggregate rating that does not exist, is a manual-action
 * risk and it is also just false — so there is no rating or review markup anywhere in this
 * file, because the product has neither.
 *
 * The `Offer` on the software node is the one piece of commercial markup, and it exists
 * because the price is stated on the public pages now. It reads from `siteConfig.price`, so
 * the markup and the Stripe charge cannot diverge.
 */

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

export function organizationSchema(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: siteConfig.brandName,
    url: siteConfig.url,
    description: `${siteConfig.primaryOutcome}. ${siteConfig.differentiator}`,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.contact.supportEmail,
        availableLanguage: ["en"],
      },
    ],
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.brandName,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  };
}

/**
 * The product itself.
 *
 * Product capabilities that are visibly described on the public site. Commercial terms are
 * intentionally omitted until the verified-result paywall.
 */
export function softwareApplicationSchema(): Record<string, unknown> {
  return {
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/#software`,
    name: siteConfig.brandName,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "Bank statement converter",
    operatingSystem: "Any modern web browser",
    url: siteConfig.url,
    description: `Converts PDF bank and credit-card statements into Excel and CSV files, and verifies that the extracted transactions balance against the statement before payment.`,
    publisher: { "@id": ORGANIZATION_ID },
    featureList: [
      "Deterministic reconciliation before payment",
      "Excel (.xlsx) and CSV output",
      "Statements read in the browser; the PDF is never uploaded",
      "No account required",
    ],
    /**
     * The offer is marked up because the price is now stated on the public pages, and
     * structured data has to match what a visitor can see. It reads from `siteConfig.price`,
     * the same value `createCheckoutSession` bills, so the markup cannot advertise one
     * amount while Stripe charges another.
     *
     * Still no `aggregateRating` and no `review`: the product has neither, and inventing
     * them is the kind of fake proof this site refuses to ship.
     */
    offers: {
      "@type": "Offer",
      price: String(siteConfig.price.amountUsd),
      priceCurrency: siteConfig.price.currency,
      name: siteConfig.productName,
      description: `One-time payment for a verified conversion pack of up to ${siteConfig.limits.maxPages} total pages. Charged only after the conversion passes verification.`,
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/pricing"),
    },
  };
}

export function webPageSchema(input: {
  path: string;
  name: string;
  description: string;
  breadcrumb?: Array<{ name: string; path: string }>;
}): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  return {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    ...(input.breadcrumb ? { breadcrumb: breadcrumbSchema(input.breadcrumb) } : {}),
  };
}

export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Only ever called with questions and answers that are visibly rendered on the page. */
export function faqSchema(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
): Record<string, unknown> | null {
  if (faqs.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function howToSchema(input: {
  name: string;
  description: string;
  steps: ReadonlyArray<{ title: string; detail: string }>;
}): Record<string, unknown> {
  return {
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    totalTime: "PT2M",
    step: input.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.detail,
    })),
  };
}

/**
 * Combine graph nodes into a single `@graph` document.
 *
 * One script tag per page is easier to validate than several, and it lets nodes reference
 * each other by `@id` instead of repeating the organization on every page.
 */
export function jsonLdGraph(
  nodes: Array<Record<string, unknown> | null | undefined>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter((node): node is Record<string, unknown> => Boolean(node)),
  };
}
