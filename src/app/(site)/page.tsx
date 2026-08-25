import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { ButtonLink } from "@/components/ui/button";
import {
  Badge,
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
import { faqByQuestion, faqForSchema, homepageFaqQuestions, type FaqEntry } from "@/content/faq";
import { seoPage } from "@/content/seo";
import { HOMEPAGE_TITLE, pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, howToSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = HOMEPAGE_TITLE;
const DESCRIPTION =
  "Convert PDF bank and credit-card statements to Excel and CSV. Preview source-linked transactions and exact balance checks before paying " +
  siteConfig.price.display +
  ". No account, nothing stored.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.home,
  absoluteTitle: true,
});

const STEPS = [
  {
    title: "Choose your statements",
    detail:
      "Select one or more PDF statements, up to " +
      siteConfig.limits.maxPages +
      " pages total. The files stay on your device.",
  },
  {
    title: "Review the evidence",
    detail:
      "Inspect the transaction preview, open any row at its source, and see every balance check that passed or failed.",
  },
  {
    title: "Pay only if it checks out",
    detail:
      "If the statements verify, pay " +
      siteConfig.price.display +
      " once and download both Excel and CSV. Ambiguity blocks checkout.",
  },
] as const;

export default function HomePage() {
  const entries = homepageFaqQuestions
    .map((question) => faqByQuestion(question))
    .filter((entry): entry is FaqEntry => Boolean(entry));

  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({ path: routes.home, name: TITLE, description: DESCRIPTION }),
          howToSchema({
            name: "Convert and verify PDF bank statements",
            description:
              "Read PDF statements locally, rebuild and verify their transactions, then download Excel and CSV files.",
            steps: STEPS,
          }),
          faqSchema(faqForSchema(entries)),
        ])}
      />

      <Hero />
      <ConfidenceStrip />
      <VerificationProof />
      <HowItWorks />
      <TrustDetails />
      <Pricing />
      <Faq entries={entries} />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <Section className="pt-12 pb-14 sm:pt-20 sm:pb-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-16">
          <div>
            <Eyebrow>Verified statement conversion</Eyebrow>
            <Heading level={1} className="mt-4 max-w-3xl">
              A bank statement converter that shows its work.
            </Heading>
            <Lede className="mt-5 max-w-2xl">
              Turn PDF bank and credit-card statements into clean Excel and CSV files. Every
              transaction stays linked to its source, every balance is checked, and checkout stays
              locked if the result is ambiguous.
            </Lede>

            <CheckList
              className="mt-7 max-w-xl"
              items={[
                "See the result and verification report before paying",
                siteConfig.price.display +
                  " once for up to " +
                  siteConfig.limits.maxPages +
                  " pages",
                "Your raw PDF never leaves your browser",
                "No account, email address, or subscription",
              ]}
            />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href={routes.app} size="lg">
                Start a conversion
              </ButtonLink>
              <Link
                href={routes.howItWorks}
                className="text-accent-700 text-sm font-semibold underline-offset-4 hover:underline"
              >
                See how verification works →
              </Link>
            </div>
          </div>

          <UploadCard />
        </div>
      </Container>
    </Section>
  );
}

function UploadCard() {
  return (
    <Card className="border-accent-200 bg-accent-50/50 p-5 sm:p-6">
      <div className="rounded-card border-accent-200 border bg-white p-6 text-center">
        <div className="bg-accent-100 text-accent-700 mx-auto flex size-12 items-center justify-center rounded-full text-xl font-bold">
          ↑
        </div>
        <Heading level={3} className="mt-4">
          Start with your PDF statements
        </Heading>
        <p className="text-ink-600 mt-2 text-sm leading-relaxed">
          Choose one file or a batch. Nothing is uploaded until your browser has removed the PDF
          itself.
        </p>
        <ButtonLink href={routes.app} size="lg" className="mt-6 w-full justify-center">
          Choose PDF statements
        </ButtonLink>
        <p className="text-ink-500 mt-3 text-xs">
          PDF only · up to {siteConfig.limits.maxPages} pages total
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          ["Local", "PDF reading"],
          ["Exact", "money math"],
          ["Private", "by design"],
        ].map(([value, label]) => (
          <div key={value}>
            <p className="text-ink-950 text-sm font-bold">{value}</p>
            <p className="text-ink-500 mt-0.5 text-[0.6875rem]">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ConfidenceStrip() {
  return (
    <div className="border-ink-200 border-y bg-white">
      <Container>
        <dl className="divide-ink-200 grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            [siteConfig.price.display, "one payment, not a subscription"],
            ["$0", "to extract, check, and preview"],
            ["0 files", "stored on our servers"],
          ].map(([value, label]) => (
            <div key={label} className="px-5 py-5 text-center">
              <dt className="text-ink-950 text-lg font-bold">{value}</dt>
              <dd className="text-ink-500 mt-1 text-xs">{label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}

function VerificationProof() {
  return (
    <Section tone="raised" labelledBy="verification-proof">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div>
            <Eyebrow>Proof, not promises</Eyebrow>
            <Heading id="verification-proof" className="mt-3">
              Not just converted. Verified.
            </Heading>
            <Lede className="mt-4">
              A spreadsheet can look tidy and still be wrong. Statement Reconcile gives you a
              compact audit trail before payment, so you can see what was read, where it came from,
              and whether the arithmetic holds.
            </Lede>
            <p className="text-ink-600 mt-5 text-sm leading-relaxed">
              Select any transaction in the real preview to see the original statement page and
              source line beside it. If a date, sign, amount, page, or balance cannot be resolved
              safely, the result does not pass and checkout does not open.
            </p>
          </div>

          <VerificationPanel />
        </div>
      </Container>
    </Section>
  );
}

function VerificationPanel() {
  const checks = [
    ["Document completeness", "8 / 8 pages"],
    ["Source-linked transactions", "147 / 147 rows"],
    ["Running-balance checks", "147 / 147 passed"],
    ["Closing-balance difference", "$0.00"],
  ];

  return (
    <Card className="overflow-hidden p-0" aria-label="Worked example verification report">
      <div className="border-ink-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <p className="text-ink-950 font-bold">Verification report</p>
          <p className="text-ink-500 mt-0.5 text-xs">Worked example · checking.pdf</p>
        </div>
        <Badge tone="verified">Verification passed</Badge>
      </div>

      <dl className="divide-ink-200 divide-y px-5 sm:px-6">
        {checks.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3.5 text-sm">
            <dt className="text-ink-600">{label}</dt>
            <dd className="text-verified-700 tabular font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-ink-200 bg-ink-50 border-t p-5 sm:p-6">
        <div className="border-ink-200 rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-ink-500 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
                Transaction 84 · source linked
              </p>
              <p className="text-ink-950 mt-1.5 text-sm font-semibold">
                ACH PAYMENT — LAKESHORE UTILITIES
              </p>
            </div>
            <p className="text-ink-950 tabular text-sm font-bold">− $128.47</p>
          </div>
          <div className="border-accent-200 bg-accent-50 mt-4 rounded-md border px-3 py-2.5">
            <p className="text-accent-800 text-xs font-semibold">
              Page 6 · original statement line
            </p>
            <p className="text-ink-700 tabular mt-1 text-xs">
              05/18 ACH PMT LAKESHORE UTILITIES 128.47 3,150.73
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HowItWorks() {
  return (
    <Section labelledBy="how-it-works">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <Heading id="how-it-works" className="mt-3">
            Evidence first. Payment last.
          </Heading>
          <Lede className="mt-4">
            The whole workflow is designed to let you judge the result before taking any risk.
          </Lede>
        </div>

        <ol className="mt-10 grid gap-5 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-card border-ink-200 border bg-white p-6">
              <span className="bg-accent-50 text-accent-700 flex size-8 items-center justify-center rounded-full text-sm font-bold">
                {index + 1}
              </span>
              <Heading level={4} className="mt-4">
                {step.title}
              </Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{step.detail}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

function TrustDetails() {
  return (
    <Section tone="raised" labelledBy="trust-details">
      <Container>
        <div className="text-center">
          <Eyebrow>Built for financial documents</Eyebrow>
          <Heading id="trust-details" className="mt-3">
            Clear boundaries make the result trustworthy
          </Heading>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "The raw PDF stays local",
              detail:
                "Your browser reads the document. We receive only the text required for conversion, never the original file, and store neither.",
            },
            {
              title: "Ambiguity stops the sale",
              detail:
                "Missing pages, uncertain debit or credit signs, unresolved amounts, or failed balance checks prevent checkout instead of producing a plausible guess.",
            },
            {
              title: "Your evidence travels with you",
              detail:
                "The Excel workbook, CSV file, and verification report preserve the cleaned transactions and the checks used to validate them.",
            },
          ].map((item) => (
            <Card key={item.title} className="p-6">
              <Heading level={4}>{item.title}</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{item.detail}</p>
            </Card>
          ))}
        </div>

        <p className="text-ink-600 mt-8 text-center text-sm">
          Scanned images, password-protected PDFs, and statements with no usable balance evidence
          are rejected rather than guessed.{" "}
          <Link
            href={routes.security}
            className="text-accent-700 font-semibold underline-offset-4 hover:underline"
          >
            Read the security architecture →
          </Link>
        </p>
      </Container>
    </Section>
  );
}

function Pricing() {
  return (
    <Section labelledBy="pricing">
      <Container width="narrow">
        <div className="text-center">
          <Eyebrow>Simple pricing</Eyebrow>
          <Heading id="pricing" className="mt-3">
            One pack. Everything included.
          </Heading>
          <Lede className="mx-auto mt-4 max-w-xl">
            Check the conversion for free. Pay once only when it is verified and worth downloading.
          </Lede>
        </div>

        <Card className="mt-9">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong className="text-ink-950 text-5xl font-bold tracking-tight">
                {siteConfig.price.display}
              </strong>
              <p className="text-ink-600 mt-2 text-sm">
                once · up to {siteConfig.limits.maxPages} total pages
              </p>
            </div>
            <ButtonLink href={routes.app} size="lg">
              Check my statements
            </ButtonLink>
          </div>
          <Divider className="my-6" />
          <CheckList
            items={[
              "Multiple statements in one conversion pack",
              "Excel workbook, CSV file, and verification report",
              "Preview before payment and no charge for a failed check",
              "30-day download entitlement and 30-day refund policy",
              "No account, recurring fee, or stored card",
            ]}
          />
          <p className="text-ink-500 mt-6 text-xs">
            <Link href={routes.pricing} className="hover:text-ink-700 underline underline-offset-2">
              Full pricing details
            </Link>{" "}
            ·{" "}
            <Link
              href={routes.refundPolicy}
              className="hover:text-ink-700 underline underline-offset-2"
            >
              Refund policy
            </Link>
          </p>
        </Card>
      </Container>
    </Section>
  );
}

function Faq({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <Section tone="raised" labelledBy="faq">
      <Container width="narrow">
        <Eyebrow>Common questions</Eyebrow>
        <Heading id="faq" className="mt-3">
          Before you convert
        </Heading>
        <div className="mt-8">
          <FaqList entries={entries} />
        </div>
        <p className="text-ink-600 mt-6 text-sm">
          <Link
            href={routes.faq}
            className="text-accent-700 font-semibold underline-offset-4 hover:underline"
          >
            Read every question and answer →
          </Link>
        </p>
      </Container>
    </Section>
  );
}

function FinalCta() {
  const featured = [
    "bank-statement-to-excel",
    "bank-statement-to-csv",
    "credit-card-statement-to-excel",
  ];

  return (
    <Section labelledBy="start">
      <Container width="narrow" className="text-center">
        <Eyebrow>No signup required</Eyebrow>
        <Heading id="start" className="mt-3">
          See whether your statements check out
        </Heading>
        <Lede className="mx-auto mt-4 max-w-xl">
          It costs nothing to extract, review, and verify them. Pay only when the evidence earns
          your confidence.
        </Lede>
        <ButtonLink href={routes.app} size="lg" className="mt-8">
          Start a conversion
        </ButtonLink>

        <div className="border-ink-200 mt-12 border-t pt-8">
          <p className="text-ink-500 text-xs font-semibold tracking-[0.1em] uppercase">
            More conversion options
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {featured.map((slug) => {
              const page = seoPage(slug);
              if (!page) return null;
              return (
                <li key={slug}>
                  <Link
                    href={"/" + slug}
                    className="text-accent-700 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {page.h1}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
