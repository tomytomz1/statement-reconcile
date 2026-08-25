import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { PricingViewTracker } from "@/components/site/pricing-view-tracker";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CheckList,
  Container,
  Divider,
  Eyebrow,
  Heading,
  Lede,
  Section,
} from "@/components/ui/primitives";
import { routes, siteConfig } from "@/config/site";
import { faqByQuestion, faqForSchema, type FaqEntry } from "@/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = `Bank Statement Conversion Pricing | ${siteConfig.brandName}`;
const DESCRIPTION = `Verify your PDF bank-statement conversion free. Pay ${siteConfig.price.display} one time only after the required verification checks pass. Excel, CSV and verification reports included.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.pricing,
  absoluteTitle: true,
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
      <PricingViewTracker />

      <Section className="pt-12 pb-8 sm:pt-16">
        <Container width="narrow">
          <Eyebrow>One job. One payment.</Eyebrow>
          <Heading level={1} className="mt-3">
            Free to verify. {siteConfig.price.display} only when your conversion passes.
          </Heading>
          <Lede className="mt-4">
            Choose your statements and inspect the converted rows, source references and
            verification results before making a purchase. If the required checks fail, checkout
            never opens.
          </Lede>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container width="narrow">
          <Card>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-accent-700 text-sm font-bold">{siteConfig.productName}</p>
                <p className="text-ink-600 mt-2 text-sm">
                  One or more supported statements · up to {siteConfig.limits.maxPages} total pages
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-ink-950 text-5xl font-bold tracking-tight">
                  {siteConfig.price.display}
                </p>
                <p className="text-ink-500 mt-1 text-sm font-semibold">one-time</p>
              </div>
            </div>

            <Divider className="my-6" />

            <CheckList
              tone="neutral"
              items={[
                "Excel workbook with transactions, summary, verification, and source references",
                "CSV file with a fixed column order for review or mapping",
                "A verification PDF for every accepted statement",
                "pack-manifest.json binding the delivered files to the verified result",
                "30-day paid entitlement — download straight away, because the converted result is held only in your browser and expires within the hour",
                "30-day refund protection",
              ]}
            />

            <div className="border-ink-200 mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm font-semibold">
              <span className="text-ink-800">No signup</span>
              <span className="text-ink-800">No subscription</span>
              <span className="text-ink-800">No stored card</span>
              <span className="text-ink-800">No charge for failed verification</span>
            </div>

            <ButtonLink href={routes.app} size="lg" className="mt-7">
              {siteConfig.primaryCta}
            </ButtonLink>
            <p className="text-ink-600 mt-4 text-sm leading-relaxed">
              You inspect the real conversion first. Checkout becomes available only after the
              required verification checks pass.
            </p>
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="why-after">
        <Container width="narrow">
          <Heading id="why-after">Why pay after verification?</Heading>
          <p className="text-ink-700 mt-4 text-[0.975rem] leading-relaxed">
            Because you should not have to buy a conversion to find out whether the conversion
            worked. {siteConfig.brandName} runs the required checks first. You decide whether to buy
            the output after seeing the result.
          </p>

          <Heading id="what-if-fails" level={3} className="mt-10">
            What if my statement fails?
          </Heading>
          <p className="text-ink-700 mt-4 text-[0.975rem] leading-relaxed">
            Nothing is charged. The application explains what prevented the statement from passing,
            and checkout remains unavailable. There is no refund to request because there is no
            payment to reverse.
          </p>

          <Heading id="subscription" level={3} className="mt-10">
            Is this a subscription?
          </Heading>
          <p className="text-ink-700 mt-4 text-[0.975rem] leading-relaxed">
            No. One verified pack equals one payment. Nothing renews, no card is stored, and there
            is no account to cancel.
          </p>
        </Container>
      </Section>

      <Section labelledBy="episodic">
        <Container width="narrow">
          <Eyebrow>Why there is no monthly plan</Eyebrow>
          <Heading id="episodic" className="mt-3">
            Statement conversion is often occasional. Your bill should be too.
          </Heading>
          <p className="text-ink-700 mt-5 text-[0.975rem] leading-relaxed">
            A catch-up client may arrive with a year of statements today, and you may not need
            another conversion for weeks. {siteConfig.brandName} charges for the verified job rather
            than requiring you to keep another monthly software subscription active between jobs.
          </p>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="promise">
        <Container width="narrow">
          <Eyebrow>Proof-Before-Payment Guarantee</Eyebrow>
          <Heading id="promise" className="mt-3">
            If the required verification checks do not pass, checkout does not open.
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
                "If a paid file is incorrect, incomplete or unusable, request a full refund within 30 days.",
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
