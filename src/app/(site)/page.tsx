import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

import { CopyVariantTracker } from "@/components/site/copy-variant-tracker";
import { FaqList } from "@/components/site/faq-list";
import { HeroUpload } from "@/components/site/hero-upload";
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
import {
  COPY_HEADLINES,
  COPY_VARIANT_HEADER,
  isCopyVariant,
  type CopyVariant,
} from "@/lib/analytics/copy-variant";
import { HOMEPAGE_TITLE, pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, howToSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = HOMEPAGE_TITLE;
const DESCRIPTION =
  "Convert PDF bank and credit-card statements to Excel and CSV. Preview source-linked transactions, page coverage, and exact balance checks before deciding whether to continue.";

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
    title: "Decide after it checks out",
    detail:
      "If the statements verify, the complete conversion pack and secure checkout become available. Ambiguity blocks checkout.",
  },
] as const;

export default async function HomePage() {
  const requestedVariant = (await headers()).get(COPY_VARIANT_HEADER);
  const variant: CopyVariant = isCopyVariant(requestedVariant) ? requestedVariant : "a";
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

      <CopyVariantTracker variant={variant} />
      <Hero variant={variant} />
      <ConfidenceStrip />
      <ProblemAgitation />
      <ReasonWhy />
      <Mechanism />
      <VerificationProof />
      <AiObjection />
      <HowItWorks />
      <TrustDetails />
      <Deliverables />
      <Faq entries={entries} />
      <FinalCta />
    </>
  );
}

function Hero({ variant }: { variant: CopyVariant }) {
  return (
    <Section className="pt-12 pb-14 sm:pt-20 sm:pb-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-16">
          <div>
            <Eyebrow>Bank Statement Converter</Eyebrow>
            <Heading level={1} className="mt-4 max-w-3xl">
              {COPY_HEADLINES[variant]}
            </Heading>
            <Lede className="mt-5 max-w-2xl">
              Your statement is already finished. You should not have to retype it—or spend the next
              hour checking whether a converter missed a row, reversed a debit, or quietly skipped a
              page.
            </Lede>

            <p className="text-ink-600 mt-5 max-w-2xl text-sm leading-relaxed">
              Choose one or more PDF bank or credit-card statements. Statement Reconcile rebuilds
              the transaction table, traces every accepted row back to its source, checks document
              coverage and every applicable balance, and stops when the evidence does not hold. You
              see the converted rows and verification results before deciding whether to take the
              files home.
            </p>

            <div className="mt-7 lg:hidden">
              <HeroUpload />
            </div>

            <CheckList
              className="mt-7 max-w-xl"
              tone="neutral"
              items={[
                "No retyping, prompt writing, or line-by-line checking",
                "Excel, CSV, verification PDFs, and pack manifest included",
                "Your original PDF never leaves this device",
                "No account, email address, or subscription",
              ]}
            />

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href={routes.app}
                className="text-accent-700 text-sm font-semibold underline-offset-4 hover:underline"
              >
                {siteConfig.primaryCta} →
              </Link>
              <Link
                href="#verification-proof"
                className="text-ink-600 text-sm font-semibold underline-offset-4 hover:underline"
              >
                See the proof first
              </Link>
            </div>
            <p className="text-ink-800 mt-4 text-sm font-semibold">
              Preview the real conversion and verification results before deciding whether to
              continue.
            </p>
          </div>

          <div className="hidden lg:block">
            <HeroUpload />
          </div>
        </div>
      </Container>
    </Section>
  );
}

function ConfidenceStrip() {
  return (
    <div className="border-ink-200 border-y bg-white">
      <Container>
        <dl className="divide-ink-200 grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            ["Source linked", "accepted rows trace to the PDF"],
            ["Coverage checked", "missing evidence stops the process"],
            ["No signup", "or email address required"],
            ["Original PDF", "stays on this device"],
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

function ProblemAgitation() {
  return (
    <Section labelledBy="unchecked-spreadsheet">
      <Container width="narrow">
        <Eyebrow>The hidden work</Eyebrow>
        <Heading id="unchecked-spreadsheet" className="mt-3">
          Your PDF is not the problem. The unchecked spreadsheet is.
        </Heading>
        <div className="text-ink-700 mt-6 space-y-4 text-[0.975rem] leading-relaxed">
          <p>
            The statement already contains the dates, descriptions, amounts, and balances you need.
            Manual retyping wastes the same attention you need for the work that follows—and one
            dropped digit can turn a finished statement into an afternoon of hunting.
          </p>
          <p>
            A converter can save the typing and still hand the risk back to you. A skipped page,
            duplicated transaction, or reversed debit looks perfectly ordinary once it reaches a
            clean spreadsheet. Unless the conversion shows where each row came from and whether the
            statement math still holds, checking the converter becomes your new job.
          </p>
          <p className="text-ink-950 font-semibold">
            The useful result is not merely a spreadsheet. It is a spreadsheet accompanied by the
            evidence needed to inspect it.
          </p>
        </div>
      </Container>
    </Section>
  );
}

function ReasonWhy() {
  return (
    <Section tone="raised" labelledBy="reason-why">
      <Container width="narrow">
        <Eyebrow>Why this exists</Eyebrow>
        <Heading id="reason-why" className="mt-3">
          Why we built verification into the conversion
        </Heading>
        <Lede className="mt-4">
          Statement Reconcile was built around an uncomfortable fact: polished output is not proof
          of correct output.
        </Lede>
        <p className="text-ink-700 mt-5 text-[0.975rem] leading-relaxed">
          The workflow does not ask the extraction system to grade its own work. It rebuilds the
          transaction table, preserves source references, checks document coverage, and then runs
          deterministic decimal arithmetic against the evidence printed in the statement. If the
          evidence is incomplete or the numbers do not close, the process stops before checkout.
        </p>
      </Container>
    </Section>
  );
}

function Mechanism() {
  const checks = [
    {
      title: "Document Coverage",
      detail:
        "Confirms the expected pages and statement boundaries are present before rows are accepted.",
    },
    {
      title: "Row-to-Source Tracing",
      detail:
        "Keeps every accepted transaction connected to the page and source text it came from.",
    },
    {
      title: "Balance Reconstruction",
      detail:
        "Recomputes applicable opening, closing, subtotal, and running-balance checks with exact decimals.",
    },
    {
      title: "Fail-Closed Verification",
      detail:
        "Blocks checkout when a material amount, sign, page, source, or balance remains unresolved.",
    },
  ] as const;

  return (
    <Section labelledBy="source-to-sheet">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The mechanism</Eyebrow>
          <Heading id="source-to-sheet" className="mt-3">
            Introducing Source-to-Sheet Verification
          </Heading>
          <Lede className="mt-4">
            Four checks turn a converted table into an inspectable verification record before a
            download is offered.
          </Lede>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {checks.map((check, index) => (
            <Card key={check.title} className="p-6">
              <span className="text-accent-700 text-sm font-bold">0{index + 1}</span>
              <Heading level={4} className="mt-3">
                {check.title}
              </Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{check.detail}</p>
            </Card>
          ))}
        </div>
        <p className="text-ink-500 mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed">
          Source-to-Sheet Verification is our name for this workflow. It is not a claim that other
          products cannot perform similar checks.
        </p>
      </Container>
    </Section>
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
              A clean spreadsheet can still be wrong. This one shows its work.
            </Heading>
            <Lede className="mt-4">
              A spreadsheet can look tidy and still be wrong. Statement Reconcile gives you a
              compact verification record before payment, so you can see what was read, where it
              came from, and whether the arithmetic holds.
            </Lede>
            <p className="text-ink-600 mt-5 text-sm leading-relaxed">
              Select any transaction in the real preview to see the original statement page and
              source line beside it. If a date, sign, amount, page, or balance cannot be resolved
              safely, the result does not pass and checkout does not open.
            </p>
          </div>

          <VerificationPanel />
        </div>
        <p className="text-ink-500 mx-auto mt-8 max-w-4xl text-center text-xs leading-relaxed">
          “Verified” means the extraction, provenance, completeness, and arithmetic checks shown in
          the report passed. It does not authenticate the original statement or provide accounting,
          audit, tax, or financial advice.
        </p>
      </Container>
    </Section>
  );
}

function AiObjection() {
  const columns = [
    {
      title: "A general AI workflow",
      items: [
        "You write and refine the prompt",
        "The output structure can vary between attempts",
        "You check every page, row, sign, and total",
        "You request corrections and reformat the result",
      ],
    },
    {
      title: "Statement Reconcile",
      items: [
        "One fixed statement-conversion workflow",
        "Accepted rows stay linked to their source",
        "Completeness and applicable arithmetic are checked deterministically",
        "Unresolved ambiguity blocks checkout; exports stay consistent",
      ],
    },
  ] as const;

  return (
    <Section labelledBy="ai-objection">
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>Why not general AI?</Eyebrow>
          <Heading id="ai-objection" className="mt-3">
            A chatbot can give you rows. Who checks the rows?
          </Heading>
          <Lede className="mt-4">
            A general AI assistant may extract a statement. Statement Reconcile removes the prompt
            writing, formatting decisions, correction loop, and manual verification from the job.
          </Lede>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {columns.map((column, columnIndex) => (
            <Card
              key={column.title}
              className={columnIndex === 1 ? "border-accent-200 bg-accent-50/30" : undefined}
            >
              <Heading level={3}>{column.title}</Heading>
              <CheckList className="mt-5" tone="neutral" items={column.items} />
            </Card>
          ))}
        </div>
        <p className="text-ink-600 mt-6 max-w-3xl text-sm leading-relaxed">
          General AI can be useful. This purpose-built workflow is for the moment when you need a
          finished, inspectable conversion—and evidence that it survived the stated checks.
        </p>
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
          <Eyebrow>Brutally clear boundaries</Eyebrow>
          <Heading id="trust-details" className="mt-3">
            Before you give any converter a financial document, ask these questions.
          </Heading>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "The raw PDF stays local",
              detail:
                "Your browser reads the document. We receive only positioned text required for conversion, never the original file. Statement content is excluded from analytics, URLs, logs, and Stripe metadata.",
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
          are rejected rather than guessed. No account or email address is required.{" "}
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

function Deliverables() {
  return (
    <Section labelledBy="deliverables">
      <Container width="narrow">
        <div className="text-center">
          <Eyebrow>Proof before payment</Eyebrow>
          <Heading id="deliverables" className="mt-3">
            When the evidence holds, take the complete conversion pack with you.
          </Heading>
          <Lede className="mx-auto mt-4 max-w-xl">
            Review your actual rows and verification results first. The exact one-time charge is
            shown only when a verified pack is ready for secure checkout.
          </Lede>
        </div>

        <Card className="mt-9">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong className="text-ink-950 text-2xl font-bold tracking-tight">
                {siteConfig.productName}
              </strong>
              <p className="text-ink-600 mt-2 text-sm">
                one or more statements · up to {siteConfig.limits.maxPages} total pages
              </p>
            </div>
            <ButtonLink href={routes.app} size="lg">
              {siteConfig.primaryCta}
            </ButtonLink>
          </div>
          <Divider className="my-6" />
          <CheckList
            tone="neutral"
            items={[
              "Multiple statements in one conversion pack",
              "Excel workbook and CSV file",
              "Verification PDF for each statement and pack manifest",
              "Actual-row preview before the billing screen appears",
              "30-day download entitlement and 30-day refund policy",
              "No account, recurring fee, or stored card",
            ]}
          />
          <div className="border-ink-200 mt-7 border-t pt-7">
            <Heading level={4}>The Proof-Before-Payment Promise</Heading>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                [
                  "Personalized proof",
                  "See actual rows, page coverage, source mapping, applicable balance checks, and ambiguities before the commercial decision.",
                ],
                [
                  "Checkout lock",
                  "An incomplete, ambiguous, or rejected pack cannot be purchased.",
                ],
                [
                  "30-day protection",
                  "If the paid files are incorrect or unusable, receive a full refund of the one-time payment.",
                ],
              ].map(([title, detail], index) => (
                <li key={title} className="text-ink-600 text-sm leading-relaxed">
                  <span className="text-accent-700 block font-bold">
                    {index + 1}. {title}
                  </span>
                  <span className="mt-1 block">{detail}</span>
                </li>
              ))}
            </ol>
          </div>
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
          Choose your PDFs and inspect the real conversion before the billing screen can appear.
        </Lede>
        <ButtonLink href={routes.app} size="lg" className="mt-8">
          {siteConfig.primaryCta}
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
