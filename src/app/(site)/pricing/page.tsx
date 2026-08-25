import type { Metadata } from "next";
import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
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
import { faqByQuestion, faqForSchema, type FaqEntry } from "@/content/faq";
import { FaqList } from "@/components/site/faq-list";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = `Pricing — ${siteConfig.price.display} per conversion pack, no subscription`;
const DESCRIPTION = `${siteConfig.brandName} costs ${siteConfig.price.display} once for a verified conversion pack: one or more statements, up to ${siteConfig.limits.maxPages} total pages. Excel, CSV, and verification reports are included, and you are only charged after every kept file has been verified.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.pricing,
});

const PRICING_QUESTIONS = [
  "Is $19 a subscription?",
  "Both file formats for one price?",
  "Can I get a refund?",
  "I paid and lost the download. What now?",
  "Do I need an account?",
] as const;

/**
 * Pricing page.
 *
 * One price, so the page is not a plan comparison. What it has to do instead is remove the
 * questions that stop someone paying a one-off charge to a company they have not heard of:
 * what exactly is a "statement", when does the money actually leave, what happens if it goes
 * wrong, and is anything going to charge me again next month.
 */
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
          <Eyebrow>Pricing</Eyebrow>
          <Heading level={1} className="mt-3">
            The {siteConfig.productName} is {siteConfig.price.display} once.
          </Heading>
          <Lede className="mt-4">
            No subscription, no seats, no credits, no free tier that expires into one. You pay when
            a statement has been converted and verified, and not before.
          </Lede>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container width="narrow">
          <Card>
            <div className="text-center">
              <p className="text-accent-700 mb-3 text-sm font-bold">{siteConfig.productName}</p>
              <p className="text-ink-950 text-6xl font-bold tracking-tight">
                {siteConfig.price.display}
              </p>
              <p className="text-ink-600 mt-2 text-sm">
                one or more statements · up to {siteConfig.limits.maxPages} total pages · Excel,
                CSV, and reports
              </p>
            </div>

            <Divider className="my-7" />

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <Heading level={4}>Included</Heading>
                <CheckList
                  className="mt-3"
                  tone="neutral"
                  items={[
                    "Excel workbook with transactions, summary, verification, and source references",
                    "CSV file with a fixed column order",
                    "Per-statement verification PDF and pack-manifest.json",
                    "30-day entitlement; re-upload the same files after the local copy expires",
                    "Full refund within 30 days if the output is wrong",
                  ]}
                />
              </div>
              <div>
                <Heading level={4}>Not included, and never will be</Heading>
                <CheckList
                  className="mt-3"
                  tone="neutral"
                  items={[
                    "A recurring charge — there is no subscription to cancel",
                    "A stored card — nothing is kept on file",
                    "An account, a password, or an email requirement",
                    "Upsells after payment",
                  ]}
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <ButtonLink href={routes.app} size="lg">
                {siteConfig.primaryCta}
              </ButtonLink>
              <p className="text-ink-500 mt-3 text-xs">
                Card details are handled by Stripe and never reach our servers.
              </p>
            </div>
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="statement-definition">
        <Container width="narrow">
          <Heading id="statement-definition">What counts as a conversion pack</Heading>
          <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
            <p>
              One payment covers one or more PDF statements, up to {siteConfig.limits.maxPages}{" "}
              total pages combined and {siteConfig.limits.maxFileSizeMb} MB per file. Each file is
              extracted and verified on its own. Failed or ambiguous files are not silently omitted;
              you remove them before checkout, and only the verified subset is sold.
            </p>
            <p>
              A 40-page statement with two thousand rows costs the same {siteConfig.price.display}{" "}
              as a two-page one with twelve, and you may include additional statements in the same
              pack until the combined page cap is reached.
            </p>
            <p>
              A document containing several accounts is refused rather than charged twice: it has no
              single opening and closing balance, so there is nothing to check the extraction
              against. Download each account separately.
            </p>
          </div>
        </Container>
      </Section>

      <Section labelledBy="when-charged">
        <Container width="narrow">
          <Heading id="when-charged">When the money actually leaves</Heading>
          <ol className="mt-6 space-y-4">
            {[
              {
                title: "Choosing a file: free",
                detail: "Your browser reads it. Nothing is uploaded and nothing is charged.",
              },
              {
                title: "Extraction and verification: free",
                detail:
                  "The transactions are extracted and the arithmetic is checked against your statement's own balances. Still nothing charged.",
              },
              {
                title: "Seeing the verdict and the preview: free",
                detail:
                  "The equation, both sides of it, the difference, and the first ten rows of your table. This is where you decide.",
              },
              {
                title: `Unlocking the download: ${siteConfig.price.display}`,
                detail:
                  "One payment through Stripe Checkout. Excel, CSV, verification reports, and the pack manifest are available immediately afterwards.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="tabular bg-accent-100 text-accent-800 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-ink-900 font-semibold">{step.title}</p>
                  <p className="text-ink-600 mt-1 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <Card className="border-verified-200 bg-verified-50/50 mt-8">
            <p className="text-ink-800 text-sm leading-relaxed">
              <span className="font-semibold">
                If the statement does not balance, there is no step four.
              </span>{" "}
              The payment button is not rendered at all, and the server refuses to create a checkout
              session for a result that failed verification. This is not a policy we apply by hand;
              it is how the code is built.
            </p>
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="pricing-faq">
        <Container width="narrow">
          <Heading id="pricing-faq">Pricing questions</Heading>
          <div className="mt-8">
            <FaqList entries={entries} />
          </div>
          <p className="text-ink-600 mt-6 text-sm">
            See also the{" "}
            <Link
              href={routes.refundPolicy}
              className="text-accent-700 font-semibold underline-offset-4 hover:underline"
            >
              refund policy
            </Link>{" "}
            and the{" "}
            <Link
              href={routes.faq}
              className="text-accent-700 font-semibold underline-offset-4 hover:underline"
            >
              full FAQ
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
