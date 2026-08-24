import type { Metadata } from "next";
import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
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
import { faqByQuestion, faqForSchema, homepageFaqQuestions, type FaqEntry } from "@/content/faq";
import { seoPage } from "@/content/seo";
import { HOMEPAGE_TITLE, pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, howToSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

/**
 * Homepage.
 *
 * The H1 is the category and the outcome — what someone searching for this product types —
 * and the differentiator is the sentence directly beneath it. Putting the differentiator in
 * the H1 would be a positioning mistake and a ranking one: nobody searches for "see whether
 * the numbers balance", but plenty of people search for "convert bank statement to Excel".
 */

const TITLE = HOMEPAGE_TITLE;
const DESCRIPTION = `Convert PDF bank and credit-card statements to Excel and CSV. Preview the transactions and confirm the statement balances before paying ${siteConfig.price.display}. No account, nothing stored.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.home,
});

const STEPS = [
  {
    title: "Choose your PDF statement",
    detail:
      "Your browser opens the file and reads its text layer. The PDF is never uploaded to us.",
  },
  {
    title: "We rebuild the transaction table",
    detail:
      "Column positions, wrapped descriptions, date order, and debit or credit direction are all recovered from the page itself.",
  },
  {
    title: "We check the arithmetic",
    detail:
      "Every extracted row is re-added with exact decimal arithmetic and compared against the balances and subtotals your bank printed.",
  },
  {
    title: "You see the result, then decide",
    detail: `The equation, both numbers, the difference, and a sample of your table are shown before the ${siteConfig.price.display} payment step appears.`,
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
            name: "Convert a PDF bank statement to Excel and CSV",
            description:
              "Read a PDF statement in the browser, extract its transactions, verify the totals against the printed balances, and download Excel and CSV files.",
            steps: STEPS,
          }),
          faqSchema(faqForSchema(entries)),
        ])}
      />

      <Hero />
      <ReconciliationExplainer />
      <HowItWorks />
      <WhatYouGet />
      <Honesty />
      <Privacy />
      <Pricing />
      <Faq entries={entries} />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <Section className="pt-14 pb-10 sm:pt-20 sm:pb-14">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div>
            <Eyebrow>{siteConfig.primaryCategory}</Eyebrow>
            <Heading level={1} className="mt-3">
              Convert Bank Statements to Excel &amp; CSV
            </Heading>
            <p className="text-ink-800 mt-4 text-xl leading-snug font-medium">
              {siteConfig.differentiator}
            </p>
            <Lede className="mt-4 max-w-2xl">
              Upload a PDF bank or credit-card statement and get a clean transaction table as an
              Excel workbook and a CSV file. Before you are asked to pay, every row we extracted is
              added up and checked against the balances printed on your statement.
            </Lede>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href={routes.app} size="lg">
                {siteConfig.primaryCta}
              </ButtonLink>
              <Link
                href={routes.howItWorks}
                className="text-accent-700 text-sm font-semibold underline-offset-4 hover:underline"
              >
                {siteConfig.secondaryCta} →
              </Link>
            </div>

            <p className="text-ink-600 mt-4 text-sm font-medium">{siteConfig.offerLine}</p>

            <div className="mt-8 flex flex-wrap gap-2">
              <Badge tone="verified">Balance check before payment</Badge>
              <Badge tone="neutral">PDF never uploaded</Badge>
              <Badge tone="neutral">No subscription</Badge>
              <Badge tone="neutral">Excel + CSV included</Badge>
            </div>
          </div>

          <VerdictMock />
        </div>
      </Container>
    </Section>
  );
}

/**
 * A static illustration of the verdict panel.
 *
 * Deliberately not a screenshot: a screenshot would either contain real statement data or an
 * obviously fake one, and it would go stale the first time the panel changes. This is built
 * from the same tokens as the real component, with figures that are visibly a worked example.
 */
function VerdictMock() {
  return (
    <Card className="border-l-verified-600 border-l-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <p className="text-ink-950 text-base font-bold">This statement balances</p>
        <Badge tone="verified">Verified</Badge>
      </div>

      <div className="bg-ink-50 mt-4 rounded-lg p-3">
        <p className="text-ink-500 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          Check applied
        </p>
        <p className="tabular text-ink-900 mt-1.5 text-sm font-medium">
          Opening balance + credits − debits = closing balance
        </p>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        {[
          ["Opening balance", "4,182.55"],
          ["Credits", "+ 6,930.00"],
          ["Debits", "− 7,411.28"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-600">{label}</dt>
            <dd className="tabular text-ink-900 font-medium">{value}</dd>
          </div>
        ))}
        <div className="border-ink-200 flex justify-between gap-4 border-t pt-2.5">
          <dt className="text-ink-900 font-semibold">Calculated closing</dt>
          <dd className="tabular text-ink-950 font-semibold">3,701.27</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Printed on statement</dt>
          <dd className="tabular text-ink-900 font-medium">3,701.27</dd>
        </div>
        <div className="bg-verified-50 flex justify-between gap-4 rounded-md px-3 py-2">
          <dt className="text-verified-900 font-semibold">Difference</dt>
          <dd className="tabular text-verified-700 font-bold">0.00</dd>
        </div>
      </dl>

      <p className="text-ink-500 mt-4 text-xs leading-relaxed">
        Worked example. Your own figures, and every check we ran, are shown before the payment step.
      </p>
    </Card>
  );
}

function ReconciliationExplainer() {
  return (
    <Section tone="raised" labelledBy="why-it-matters">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Why this is different</Eyebrow>
            <Heading id="why-it-matters" className="mt-3">
              A converter that cannot check itself is selling you the risk
            </Heading>
            <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
              <p>
                A PDF statement is a table that has been flattened into a page description. There
                are no cells and no headers in the file — only text placed at coordinates. Turning
                it back into a table means reconstructing the columns from those positions, and that
                is where converters go wrong.
              </p>
              <p>
                A description that wraps onto a second line becomes a phantom transaction. A debit
                column and a credit column get swapped. <span className="tabular">03/04</span> is
                read as the third of April when it meant the fourth of March. None of these mistakes
                look like mistakes once they are sitting in a spreadsheet.
              </p>
              <p>
                <strong className="text-ink-900 font-semibold">
                  Checking the arithmetic catches all of them at once.
                </strong>{" "}
                A dropped row, a misread amount, a duplicated line — each one breaks the total. So
                we re-add every row we extracted and compare it with what your bank printed, and we
                show you that comparison before asking for money.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <Heading level={4}>Checked by our own arithmetic, not by a model</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">
                The verification is ordinary exact-decimal arithmetic in code we wrote, run
                separately from whatever read the page. Nothing that produced the numbers gets a say
                in whether they are right, and nothing can be persuaded to agree.
              </p>
            </Card>
            <Card className="p-5">
              <Heading level={4}>Exact decimals, never floating point</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">
                Every amount is handled as an exact decimal from the moment it is read to the moment
                it is written. Money arithmetic done in binary floating point accumulates error, and
                an error of a cent is enough to make a real discrepancy invisible or invent a fake
                one.
              </p>
            </Card>
            <Card className="p-5">
              <Heading level={4}>Four ways to balance a statement</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">
                Opening and closing balances, a running-balance column checked row by row, the
                category subtotals credit cards print, or stated totals for debits and credits.
                Whichever your statement supports is the one used, and the panel names it.
              </p>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section labelledBy="how">
      <Container>
        <Eyebrow>How it works</Eyebrow>
        <Heading id="how" className="mt-3">
          Four steps, and you decide at the last one
        </Heading>

        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-card border-ink-200 relative border bg-white p-6"
            >
              <span className="tabular text-accent-700 text-sm font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Heading level={4} className="mt-3">
                {step.title}
              </Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{step.detail}</p>
            </li>
          ))}
        </ol>

        <p className="text-ink-600 mt-8 text-sm">
          <Link
            href={routes.howItWorks}
            className="text-accent-700 font-semibold underline-offset-4 hover:underline"
          >
            Read the detailed walk-through
          </Link>{" "}
          — including what each reconciliation method checks and why a statement can fail.
        </p>
      </Container>
    </Section>
  );
}

function WhatYouGet() {
  return (
    <Section tone="raised" labelledBy="output">
      <Container>
        <Eyebrow>What you download</Eyebrow>
        <Heading id="output" className="mt-3">
          Both formats, one payment
        </Heading>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <Heading level={3}>Excel workbook (.xlsx)</Heading>
            <CheckList
              className="mt-4"
              items={[
                "Transaction sheet with a frozen header row and an autofilter already applied",
                "Amounts written as real numbers with a number format matching the statement currency",
                "A Statement Summary sheet recording the period, balances, totals, and every check that ran",
                "No formulas, no macros, no external links — nothing that executes when you open it",
              ]}
            />
          </Card>
          <Card>
            <Heading level={3}>CSV file</Heading>
            <CheckList
              className="mt-4"
              items={[
                "Fixed column order: Date, Posted Date, Description, Debit, Credit, Amount, Balance",
                "ISO dates (YYYY-MM-DD), so nothing is ambiguous on import",
                "UTF-8 with a byte-order mark, so Excel on Windows opens it correctly",
                "RFC 4180 quoting, and leading =, +, − or @ in text neutralised so a spreadsheet cannot run it",
              ]}
            />
          </Card>
        </div>
      </Container>
    </Section>
  );
}

/**
 * The limitations section.
 *
 * On the homepage, above the pricing. Stating the four things the product refuses to do —
 * before asking for money — is what makes the reconciliation claim credible. A page that only
 * lists strengths reads as marketing; this one is checkable.
 */
function Honesty() {
  return (
    <Section labelledBy="limits">
      <Container>
        <Eyebrow>Where this tool stops</Eyebrow>
        <Heading id="limits" className="mt-3">
          What it will not do
        </Heading>
        <Lede className="mt-4 max-w-2xl">
          Every one of these is a refusal rather than a gap. Each is a case where a converter could
          produce something plausible and wrong, and where we would rather hand you nothing.
        </Lede>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            {
              title: "Scanned or photographed statements",
              detail:
                "There is no text in an image of text. We do not run OCR, because a misread digit from OCR is indistinguishable from a correct one until it costs you.",
            },
            {
              title: "Password-protected PDFs",
              detail:
                "Unlock the file in your PDF reader and save a copy without the password. We will not ask you for it.",
            },
            {
              title: "Documents with several accounts",
              detail:
                "There is no single opening and closing balance to check against, so the extraction cannot be verified — and an unverified conversion is not what we sell.",
            },
            {
              title: "Statements with nothing to check against",
              detail:
                "If the document prints no balances and no subtotals, the arithmetic cannot be confirmed. We say so rather than charging you for a guess.",
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <Heading level={4}>{item.title}</Heading>
              <p className="text-ink-600 mt-2 text-sm leading-relaxed">{item.detail}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Privacy() {
  return (
    <Section tone="ink" labelledBy="privacy">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-accent-300 text-xs font-semibold tracking-[0.12em] uppercase">
              Data handling
            </p>
            <h2
              id="privacy"
              className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              We designed the risk out rather than promising to manage it
            </h2>
            <p className="text-ink-300 mt-5 text-[0.975rem] leading-relaxed">
              There is no account, so there are no credentials to steal. There is no stored
              statement, so there is nothing for a breach to expose. The PDF is read on your device
              and never uploaded at all.
            </p>
            <Link
              href={routes.security}
              className="text-accent-300 mt-6 inline-block text-sm font-semibold underline-offset-4 hover:underline"
            >
              Read the security architecture →
            </Link>
          </div>

          <ul className="space-y-4">
            {[
              [
                "The PDF stays on your device",
                "Your browser extracts the text; the file is never sent to us.",
              ],
              [
                "Nothing is stored server-side",
                "No database, no object storage, no file writes. The text exists for the length of one request.",
              ],
              [
                "The result is sealed and held by you",
                "Between the preview and the download, the converted statement lives encrypted in your browser and expires within the hour.",
              ],
              [
                "Statement data is never logged",
                "Logs carry event names, counts, and error codes. No descriptions, amounts, balances, or filenames.",
              ],
            ].map(([title, detail]) => (
              <li key={title} className="rounded-card border-ink-800 bg-ink-900/60 border p-5">
                <p className="font-semibold text-white">{title}</p>
                <p className="text-ink-300 mt-1.5 text-sm leading-relaxed">{detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

function Pricing() {
  return (
    <Section labelledBy="price">
      <Container width="narrow">
        <div className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <Heading id="price" className="mt-3">
            One conversion pack, one payment
          </Heading>
        </div>

        <Card className="mt-10 text-center">
          <p className="text-ink-950 text-5xl font-bold tracking-tight">
            {siteConfig.price.display}
          </p>
          <p className="text-ink-600 mt-2 text-sm">
            per pack · up to {siteConfig.limits.maxPages} total pages
          </p>
          <Divider className="my-6" />
          <CheckList
            className="mx-auto max-w-md text-left"
            items={[
              "Excel workbook and CSV file both included",
              "Re-download for 30 days from the same browser",
              "No account, no subscription, no stored card",
              "Charged only after you have seen the statement balance",
              "Full refund within 30 days if the file is wrong",
            ]}
          />
          <ButtonLink href={routes.app} size="lg" className="mt-8">
            {siteConfig.primaryCta}
          </ButtonLink>
          <p className="text-ink-500 mt-4 text-xs">
            <Link href={routes.pricing} className="hover:text-ink-700 underline underline-offset-2">
              Full pricing detail
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
        <Eyebrow>Questions</Eyebrow>
        <Heading id="faq" className="mt-3">
          What people ask before converting
        </Heading>
        <div className="mt-8">
          <FaqList entries={entries} />
        </div>
        <p className="text-ink-600 mt-6 text-sm">
          <Link
            href={routes.faq}
            className="text-accent-700 font-semibold underline-offset-4 hover:underline"
          >
            All questions and answers
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
        <Heading id="start" level={2}>
          Convert a statement and see for yourself
        </Heading>
        <Lede className="mx-auto mt-4 max-w-xl">
          It costs nothing to find out whether your statement can be read and verified. The price
          only appears once it has been.
        </Lede>
        <ButtonLink href={routes.app} size="lg" className="mt-8">
          {siteConfig.primaryCta}
        </ButtonLink>

        <div className="border-ink-200 mt-12 border-t pt-8">
          <p className="text-ink-500 text-xs font-semibold tracking-[0.1em] uppercase">
            Looking for something specific
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {featured.map((slug) => {
              const page = seoPage(slug);
              if (!page) return null;
              return (
                <li key={slug}>
                  <Link
                    href={`/${slug}`}
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
