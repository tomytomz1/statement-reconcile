import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CheckList,
  Container,
  Eyebrow,
  Heading,
  Lede,
  Section,
} from "@/components/ui/primitives";
import { routes, siteConfig } from "@/config/site";
import { faqByQuestion, faqForSchema, type FaqEntry } from "@/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = "Pricing and billing — verify before checkout";
const DESCRIPTION = `See how ${siteConfig.brandName} handles one-time billing, verification before checkout, included files, and refund protection without an account or subscription.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.pricing,
});

const PRICING_QUESTIONS = [
  "Is this a subscription?",
  "When do I see the charge?",
  "Both file formats for one payment?",
  "Can I get a refund?",
  "Do I need an account?",
] as const;

export default function PricingPage() {
  const entries = PRICING_QUESTIONS.map((question) => faqByQuestion(question)).filter(
    (entry): entry is FaqEntry => Boolean(entry),
  );

  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.pricing,
            name: TITLE,
            description: DESCRIPTION,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: "Pricing", path: routes.pricing },
            ],
          }),
          faqSchema(faqForSchema(entries)),
        ])}
      />

      <Section className="pt-12 pb-8 sm:pt-16">
        <Container width="narrow">
          <Eyebrow>Pricing and billing</Eyebrow>
          <Heading level={1} className="mt-3">
            Verify first. See the complete result. Decide at the billing screen.
          </Heading>
          <Lede className="mt-4">
            The exact one-time charge appears only after your conversion pack passes. Until then,
            you are evaluating your own rows, source links, document coverage, and applicable
            balance checks—not a promise about what the tool might produce.
          </Lede>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container width="narrow">
          <Card>
            <p className="text-accent-700 text-sm font-bold">{siteConfig.productName}</p>
            <Heading level={3} className="mt-2">
              One verified pack. One payment. No account or subscription.
            </Heading>
            <p className="text-ink-600 mt-3 text-sm leading-relaxed">
              A pack may contain one or more independently verified PDF statements, up to{" "}
              {siteConfig.limits.maxPages} total pages. The exact charge is shown before Stripe
              Checkout opens.
            </p>
            <CheckList
              className="mt-6"
              tone="neutral"
              items={[
                "Excel workbook with transactions, summary, verification, and source references",
                "CSV file with a fixed column order for review or mapping",
                "A verification PDF for every accepted statement",
                "pack-manifest.json binding the delivered files to the verified result",
                "30-day download entitlement and refund protection",
              ]}
            />
            <ButtonLink href={routes.app} size="lg" className="mt-7">
              {siteConfig.primaryCta}
            </ButtonLink>
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="promise">
        <Container width="narrow">
          <Eyebrow>Proof-Before-Payment Promise</Eyebrow>
          <Heading id="promise" className="mt-3">
            The commercial decision comes after the evidence.
          </Heading>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              [
                "Personalized proof",
                "Inspect real rows, page coverage, source mapping, applicable balance checks, and unresolved ambiguities.",
              ],
              [
                "Checkout lock",
                "An incomplete, ambiguous, unsupported, or rejected pack cannot reach billing.",
              ],
              [
                "30-day protection",
                "If paid files are incorrect or unusable, ask within 30 days for a full refund.",
              ],
            ].map(([title, detail], index) => (
              <Card key={title} as="li" className="p-5">
                <span className="text-accent-700 text-sm font-bold">0{index + 1}</span>
                <Heading level={4} className="mt-3">
                  {title}
                </Heading>
                <p className="text-ink-600 mt-2 text-sm leading-relaxed">{detail}</p>
              </Card>
            ))}
          </ol>
        </Container>
      </Section>

      <Section labelledBy="billing-faq">
        <Container width="narrow">
          <Heading id="billing-faq">Billing questions</Heading>
          <div className="mt-8">
            <FaqList entries={entries} />
          </div>
          <p className="text-ink-600 mt-6 text-sm">
            Read the{" "}
            <Link href={routes.refundPolicy} className="text-accent-700 font-semibold underline">
              refund policy
            </Link>{" "}
            or the{" "}
            <Link href={routes.faq} className="text-accent-700 font-semibold underline">
              full FAQ
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
