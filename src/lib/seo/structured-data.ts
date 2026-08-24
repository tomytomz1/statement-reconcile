import { absoluteUrl, routes, siteConfig } from "@/config/site";

/**
 * JSON-LD builders.
 *
 * Structured data is only emitted for things that are genuinely on the page. Marking up an
 * FAQ that is not rendered, or an aggregate rating that does not exist, is a manual-action
 * risk and it is also just false — so there is no rating, review, or offer-count markup
 * anywhere in this file, because the product has none of those things yet.
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
 * `SoftwareApplication` with a single fixed-price offer, which is exactly what this is. No
 * `aggregateRating` — inventing one would be markup fraud.
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
    offers: {
      "@type": "Offer",
      price: String(siteConfig.price.amountUsd),
      priceCurrency: siteConfig.price.currency,
      url: absoluteUrl(routes.pricing),
      availability: "https://schema.org/InStock",
      category: "One-time purchase",
    },
    featureList: [
      "Deterministic reconciliation before payment",
      "Excel (.xlsx) and CSV output",
      "Statements read in the browser; the PDF is never uploaded",
      "No account required",
    ],
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
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: siteConfig.price.currency,
      value: String(siteConfig.price.amountUsd),
    },
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
