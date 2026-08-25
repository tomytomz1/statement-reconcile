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
      "Select supported PDF bank or credit-card statements, up to " +
      siteConfig.limits.maxPages +
      " pages total. The original PDFs remain on your device.",
  },
  {
    title: "Review the conversion",
    detail:
      "Inspect your actual transactions, source references, page coverage, and applicable arithmetic checks.",
  },
  {
    title: "Decide after it passes",
    detail:
      "If the pack verifies, checkout opens. Pay " +
      siteConfig.price.display +
      " once and download the complete conversion pack. If the required checks fail, there is nothing to buy.",
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
      <VerificationProof />
      <ProblemSection />
      <CatchUpSection />
      <Mechanism />
      <HowItWorks />
      <AiObjection />
      <Avatars />
      <Pricing />
      <Privacy />
      <SupportedFiles />
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
            <Eyebrow>{siteConfig.ownedCategory}</Eyebrow>
            <Heading level={1} className="mt-4 max-w-3xl">
              {COPY_HEADLINES[variant]}
            </Heading>
            {/*
             * On a phone the upload card comes before the supporting paragraph. With the lede
             * first, the picker sat just over a full screen down — past the point where a
             * visitor who already understands the offer has to scroll to act on it. The
             * desktop layout keeps the card in the right-hand column, where it is beside the
             * lede rather than after it.
             */}
            <div className="mt-7 lg:hidden">
              <HeroUpload />
            </div>

            <Lede className="mt-7 max-w-2xl">
              Turn months of bank and credit-card statements into clean transaction files without
              retyping them or checking hundreds of converted rows by hand. {siteConfig.brandName}{" "}
              traces accepted transactions back to the statement and checks the applicable numbers
              before checkout.
            </Lede>

            <CheckList
              className="mt-7 max-w-xl"
              tone="neutral"
              items={[
                "No retyping, prompt writing, or line-by-line checking",
                "Excel, CSV, verification PDFs, and pack manifest included",
                "Your original PDF stays on this device",
                "No account, email address, or subscription",
              ]}
            />

            <div className="mt-7 hidden lg:block">
              <ButtonLink href={routes.app} size="lg">
                {siteConfig.primaryCta}
              </ButtonLink>
            </div>
            <p className="text-ink-800 mt-4 text-sm font-semibold">{siteConfig.priceLine}</p>
            <p className="text-ink-600 mt-2 text-sm">
              If the required verification checks don&rsquo;t pass, checkout doesn&rsquo;t open.{" "}
              <Link
                href="#verification-proof"
                className="text-accent-700 font-semibold underline-offset-4 hover:underline"
              >
                See the proof first
              </Link>
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
            ["No signup", "nothing to create or cancel"],
            ["PDF stays local", "the original document is not uploaded"],
            ["Verified before payment", "failed verification blocks checkout"],
            ["Excel + CSV", "both included in the conversion pack"],
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
            <Eyebrow>Proof, not an accuracy claim</Eyebrow>
            <Heading id="verification-proof" className="mt-3">
              Don&rsquo;t trust &ldquo;99.9% accurate.&rdquo; See whether your own statement checks
              out.
            </Heading>
            <Lede className="mt-4">
              A polished spreadsheet can still contain a missing row, reversed sign or bad amount.{" "}
              {siteConfig.brandName} shows the evidence attached to your actual conversion before
              asking you to buy it.
            </Lede>
            <p className="text-ink-600 mt-5 text-sm leading-relaxed">
              Select any transaction in the real preview to see the original statement page and
              source line beside it. If a date, sign, amount, page, or balance cannot be resolved
              safely, the result does not pass and checkout does not open.
            </p>
            <ButtonLink href={routes.app} size="lg" className="mt-7">
              Verify My Own Statements
            </ButtonLink>
          </div>

          <VerificationPanel />
        </div>
        <p className="text-ink-500 mx-auto mt-8 max-w-4xl text-center text-xs leading-relaxed">
          &ldquo;Verified&rdquo; means the extraction, provenance, completeness, and arithmetic
          checks shown in the report passed. It does not authenticate the original statement or
          provide accounting, audit, tax, or financial advice.
        </p>
      </Container>
    </Section>
  );
}

function VerificationPanel() {
  const checks = [
    ["Document coverage", "8 / 8 pages"],
    ["Source-linked transactions", "147 / 147"],
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
                Converted transaction · source linked
              </p>
              <p className="text-ink-950 mt-1.5 text-sm font-semibold">
                05/18 ACH PAYMENT — LAKESHORE UTILITIES
              </p>
            </div>
            <p className="text-ink-950 tabular text-sm font-bold">− $128.47</p>
          </div>
          <div className="border-accent-200 bg-accent-50 mt-4 rounded-md border px-3 py-2.5">
            <p className="text-accent-800 text-xs font-semibold">Page 6 · original statement line</p>
            <p className="text-ink-700 tabular mt-1 text-xs">
              05/18 ACH PMT LAKESHORE UTILITIES 128.47 3,150.73
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProblemSection() {
  return (
    <Section labelledBy="the-real-cost">
      <Container width="narrow">
        <Eyebrow>The work nobody wants</Eyebrow>
        <Heading id="the-real-cost" className="mt-3">
          The converter isn&rsquo;t the expensive part. Checking its work is.
        </Heading>
        <div className="text-ink-700 mt-6 space-y-4 text-[0.975rem] leading-relaxed">
          <p>
            Your client already gave you the data. It is trapped in a PDF. Manually retyping the
            statement wastes the same attention you need for the work that follows, and one dropped
            digit turns a finished statement into an afternoon of hunting.
          </p>
          <p>
            But an ordinary converter can create a second problem: now you have hundreds of
            clean-looking rows you still need to verify. A skipped page, duplicated transaction, or
            reversed debit looks perfectly ordinary once it reaches a tidy spreadsheet.
          </p>
          <p className="text-ink-950 font-semibold">
            {siteConfig.brandName} is designed to remove both jobs.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {[
            ["Don't retype it", "Turn statement transactions into structured rows."],
            ["Don't blindly trust it", "Accepted rows remain connected to their source."],
            [
              "Don't buy uncertainty",
              "Unresolved material issues stop the process before checkout.",
            ],
          ].map(([title, detail]) => (
            <Card key={title} className="p-6">
              <Heading level={4}>{title}</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{detail}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CatchUpSection() {
  return (
    <Section tone="raised" labelledBy="catch-up">
      <Container width="narrow">
        <Eyebrow>Built for the ugly jobs</Eyebrow>
        <Heading id="catch-up" className="mt-3">
          Your client sent twelve months of PDFs. You still need the books finished.
        </Heading>
        <div className="text-ink-700 mt-6 space-y-4 text-[0.975rem] leading-relaxed">
          <p>
            Historical bookkeeping gets difficult when bank feeds do not go back far enough, an
            account is closed, or the only records available are monthly PDF statements.
          </p>
          <p>
            Instead of reconstructing the transaction history manually, convert the statements,
            inspect the verification and move on to the bookkeeping work that actually requires your
            judgment.
          </p>
        </div>

        <ul className="text-ink-700 mt-7 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {[
            "Catch-up bookkeeping",
            "Closed or migrated bank accounts",
            "Historical QuickBooks reconstruction",
            "Tax preparation",
            "Cleanup engagements",
            "Missing bank-feed history",
            "Credit-card history",
            "Spreadsheet analysis",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent-700" aria-hidden="true">
                ·
              </span>
              {item}
            </li>
          ))}
        </ul>

        <ButtonLink href={routes.app} size="lg" className="mt-8">
          Verify a Catch-Up Pack
        </ButtonLink>
      </Container>
    </Section>
  );
}

function Mechanism() {
  const checks = [
    {
      title: "Document Coverage",
      detail:
        "Checks expected statement boundaries and page coverage before the conversion is accepted.",
    },
    {
      title: "Row-to-Source Tracing",
      detail:
        "Keeps every accepted transaction connected to the statement evidence from which it was derived.",
    },
    {
      title: "Balance Reconstruction",
      detail:
        "Uses exact decimal arithmetic to recompute applicable opening, closing, subtotal and running-balance checks.",
    },
    {
      title: "Fail-Closed Verification",
      detail:
        "If a material page, amount, sign, source reference or required balance remains unresolved, the result does not pass.",
    },
  ] as const;

  return (
    <Section labelledBy="source-to-sheet">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>How the proof works</Eyebrow>
          <Heading id="source-to-sheet" className="mt-3">
            Source-to-Sheet Verification
          </Heading>
          <Lede className="mt-4">
            {siteConfig.brandName} does not ask the extraction system to grade its own work. After
            the statement is read, separate checks determine whether the resulting transaction set
            has enough evidence to be sold.
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
          products cannot perform similar checks. &ldquo;Verified&rdquo; refers only to the
          extraction and checks {siteConfig.brandName} performs. It does not authenticate the bank
          statement, verify the bank&rsquo;s own records, replace accounting reconciliation, or
          provide tax, audit, legal or financial advice.
        </p>
      </Container>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section tone="raised" labelledBy="how-it-works">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>Three steps</Eyebrow>
          <Heading id="how-it-works" className="mt-3">
            Evidence first. Payment last.
          </Heading>
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

        <ButtonLink href={routes.app} size="lg" className="mt-9">
          {siteConfig.primaryCta}
        </ButtonLink>
      </Container>
    </Section>
  );
}

/**
 * The general-AI comparison.
 *
 * Rendered as a real table with a row header column, so a screen reader announces which
 * capability each cell belongs to, and wrapped in its own horizontal scroll container so a
 * narrow viewport scrolls the table rather than the page (§78).
 */
function AiObjection() {
  const rows: ReadonlyArray<readonly [string, string, string]> = [
    ["Prompting required", "Usually", "No"],
    ["Output schema", "Prompt-dependent", "Fixed"],
    ["Source-linked accepted rows", "Not inherently", "Yes"],
    ["Document coverage checks", "Manual unless engineered", "Built in"],
    ["Applicable balance arithmetic", "User must request or check", "Deterministic"],
    ["Unresolved ambiguity", "May require correction dialogue", "Blocks successful result"],
    ["Preview before payment", "Not applicable", "Yes"],
    ["Excel + CSV package", "Requires workflow", "Included"],
    ["Subscription required", "Depends on service", `No ${siteConfig.brandName} subscription`],
  ];

  return (
    <Section labelledBy="ai-objection">
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>Purpose-built vs general-purpose</Eyebrow>
          <Heading id="ai-objection" className="mt-3">
            AI can extract rows. Who checks the rows?
          </Heading>
          <Lede className="mt-4">
            A general AI assistant can be useful for extracting tables from financial documents.{" "}
            {siteConfig.brandName} is narrower. It is designed around a fixed conversion and
            verification workflow instead of asking you to prompt, reformat and manually validate
            the result.
          </Lede>
        </div>

        {/*
         * tabIndex makes the scroll container focusable so it can be scrolled with the
         * keyboard; without it a keyboard-only visitor cannot reach the right-hand column on
         * a narrow viewport. The role and label are what stop a bare focusable div from
         * being an unannounced tab stop.
         */}
        <div
          className="mt-9 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Capability comparison"
        >
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <caption className="sr-only">
              Capability comparison between a general AI workflow and {siteConfig.brandName}
            </caption>
            <thead>
              <tr className="border-ink-200 border-b">
                <th scope="col" className="text-ink-950 py-3 pr-4 font-bold">
                  Capability
                </th>
                <th scope="col" className="text-ink-950 py-3 pr-4 font-bold">
                  General AI workflow
                </th>
                <th scope="col" className="text-accent-800 py-3 font-bold">
                  {siteConfig.brandName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([capability, general, ours]) => (
                <tr key={capability} className="border-ink-200 border-b last:border-0">
                  <th scope="row" className="text-ink-800 py-3 pr-4 font-semibold">
                    {capability}
                  </th>
                  <td className="text-ink-600 py-3 pr-4">{general}</td>
                  <td className="text-ink-950 bg-accent-50/40 py-3 pl-3 font-semibold">{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-ink-600 mt-6 max-w-3xl text-sm leading-relaxed">
          Use a general AI assistant when you want flexibility. Use {siteConfig.brandName} when you
          want a repeatable statement-conversion workflow with verification attached.
        </p>
      </Container>
    </Section>
  );
}

function Avatars() {
  return (
    <Section tone="raised" labelledBy="avatars">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Heading id="avatars">
            Made for catch-up work, cleanup work and the statements nobody exported properly.
          </Heading>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Bookkeepers",
              "Convert historical client statements before coding and reconciliation.",
            ],
            [
              "Accountants",
              "Keep structured transaction data and the corresponding verification record.",
            ],
            [
              "Tax preparers",
              "Reconstruct transaction history from statements supplied late in the engagement.",
            ],
            [
              "Business owners",
              "Turn old statements into spreadsheets without rebuilding them manually.",
            ],
          ].map(([title, detail]) => (
            <Card key={title} className="p-6">
              <Heading level={4}>{title}</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{detail}</p>
            </Card>
          ))}
        </div>

        <div className="mt-9 text-center">
          <ButtonLink href={routes.app} size="lg">
            Start Free Verification
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}

function Pricing() {
  return (
    <Section labelledBy="pricing">
      <Container width="narrow">
        <div className="text-center">
          <Eyebrow>One job. One payment.</Eyebrow>
          <Heading id="pricing" className="mt-3">
            Free to verify. {siteConfig.price.display} only when your pack passes.
          </Heading>
        </div>

        <Card className="mt-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong className="text-ink-950 text-2xl font-bold tracking-tight">
                {siteConfig.productName}
              </strong>
              <p className="text-ink-600 mt-2 text-sm">
                One or more supported statements · up to {siteConfig.limits.maxPages} total pages
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-ink-950 text-4xl font-bold tracking-tight">
                {siteConfig.price.display}
              </p>
              <p className="text-ink-500 mt-1 text-sm font-semibold">one-time</p>
            </div>
          </div>
          <Divider className="my-6" />
          <CheckList
            tone="neutral"
            items={[
              "Excel workbook and CSV file",
              "Verification report for each accepted statement",
              "Source references and pack manifest",
              "30-day download access",
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
          <p className="text-ink-500 mt-5 text-xs">
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

function Privacy() {
  return (
    <Section tone="raised" labelledBy="privacy">
      <Container width="narrow">
        <Eyebrow>Sensitive document. Small data footprint.</Eyebrow>
        <Heading id="privacy" className="mt-3">
          Your PDF is never uploaded to {siteConfig.brandName}.
        </Heading>
        <div className="text-ink-700 mt-6 space-y-4 text-[0.975rem] leading-relaxed">
          <p>
            The browser opens the PDF locally and extracts the positioned text required for
            conversion. The original document itself does not travel to {siteConfig.brandName}.
          </p>
          <p>
            The extracted text required for parsing is processed for that request and is not
            retained as a stored statement archive. There is no {siteConfig.brandName} account or
            document library.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            [
              "The raw PDF stays local",
              "Your browser reads the document. We receive only positioned text required for conversion, never the original file. Statement content is excluded from analytics, URLs, logs, and Stripe metadata.",
            ],
            [
              "Ambiguity stops the sale",
              "Missing pages, uncertain debit or credit signs, unresolved amounts, or failed balance checks prevent checkout instead of producing a plausible guess.",
            ],
            [
              "Card details never reach us",
              "Payment is entered on Stripe's own hosted page. There is no stored card and no recurring charge.",
            ],
          ].map(([title, detail]) => (
            <Card key={title} className="p-6">
              <Heading level={4}>{title}</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{detail}</p>
            </Card>
          ))}
        </div>

        <p className="text-ink-600 mt-8 text-sm">
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

function SupportedFiles() {
  return (
    <Section labelledBy="supported">
      <Container width="narrow">
        <Heading id="supported">What works today</Heading>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <Heading level={4}>Supported</Heading>
            <CheckList
              className="mt-4"
              tone="neutral"
              items={[
                "Text-based PDF bank statements",
                "Text-based PDF credit-card statements",
                "Statements with usable transaction tables",
                `Multiple statements up to ${siteConfig.limits.maxPages} total pages`,
              ]}
            />
          </Card>
          <Card className="p-6">
            <Heading level={4}>Not yet supported</Heading>
            <ul className="text-ink-600 mt-4 space-y-2 text-sm leading-relaxed">
              {[
                "Photographed or image-only scanned statements",
                "Password-protected PDFs",
                "Documents without sufficient balance evidence",
                "Unsupported multi-account documents",
                "Documents exceeding system limits",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-ink-400" aria-hidden="true">
                    ×
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <p className="text-ink-700 mt-7 text-sm leading-relaxed">
          <strong className="text-ink-950">Downloaded from online banking? Good.</strong> If you can
          select the text inside the PDF, it is much more likely to work.
        </p>
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
        <p className="text-ink-800 mt-4 text-sm font-semibold">{siteConfig.priceLine}</p>

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
