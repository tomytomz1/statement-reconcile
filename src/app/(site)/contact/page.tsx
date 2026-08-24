import type { Metadata } from "next";

import { routes, siteConfig } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { LegalDocumentPage } from "@/components/site/legal-document";
import { Card, Container, Section } from "@/components/ui/primitives";
import { contactPage } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: contactPage.title,
  description: contactPage.metaDescription,
  path: routes.contact,
});

/**
 * Contact.
 *
 * Email rather than a form, deliberately. A contact form on this site would be a text field
 * that posts to our server, which is exactly the thing we tell people we do not do — and
 * somebody would eventually paste a statement into it. Email keeps the message in the
 * customer's own client and out of our infrastructure.
 */
const ROUTES = [
  {
    heading: "Support",
    email: siteConfig.contact.supportEmail,
    detail:
      "Refunds, a download that did not work, a statement layout we could not read, or anything about a payment.",
  },
  {
    heading: "Privacy",
    email: siteConfig.contact.privacyEmail,
    detail:
      "Questions about data handling, or a request under GDPR, the CCPA, or an equivalent law.",
  },
  {
    heading: "Security",
    email: siteConfig.contact.securityEmail,
    detail:
      "Responsible disclosure. We will not pursue good-faith research; the scope is set out in the security page.",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.contact,
            name: contactPage.title,
            description: contactPage.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: contactPage.h1, path: routes.contact },
            ],
          }),
        ])}
      />

      <LegalDocumentPage document={contactPage} />

      <Section className="pt-0">
        <Container width="narrow">
          <div className="grid gap-4 sm:grid-cols-3">
            {ROUTES.map((route) => (
              <Card key={route.heading} className="p-5">
                <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                  {route.heading}
                </p>
                <a
                  href={`mailto:${route.email}`}
                  className="text-accent-700 mt-2 block text-sm font-semibold break-words underline-offset-2 hover:underline"
                >
                  {route.email}
                </a>
                <p className="text-ink-600 mt-2 text-sm leading-relaxed">{route.detail}</p>
              </Card>
            ))}
          </div>
          <p className="text-ink-500 mt-6 text-sm">
            First response target: {siteConfig.contact.responseTarget}.
          </p>
        </Container>
      </Section>
    </>
  );
}
