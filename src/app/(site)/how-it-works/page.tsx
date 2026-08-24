import type { Metadata } from "next";
import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
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
import { pageMetadata } from "@/lib/seo/metadata";
import { howToSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = "How it works — extraction and reconciliation, step by step";
const DESCRIPTION =
  "A detailed walk-through of how a PDF statement becomes a verified spreadsheet: text extraction in the browser, column reconstruction, the four reconciliation methods, and what happens when a statement fails.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.howItWorks,
});

const STEPS = [
  {
    title: "Your browser opens the PDF",
    detail:
      "The file is read locally with pdf.js. Only the positioned text runs are sent onward; the PDF itself never leaves your device.",
  },
  {
    title: "Lines and columns are reconstructed",
    detail:
      "Text items are grouped into visual lines by vertical position, then clustered into columns by horizontal position and width.",
  },
  {
    title: "The layout is identified",
    detail:
      "Candidate interpretations are generated — separate debit and credit columns, a single signed amount, section-grouped amounts — and each is tested.",
  },
  {
    title: "The arithmetic is checked",
    detail:
      "Every extracted row is re-added with exact decimals and compared against the balances and subtotals printed on the statement.",
  },
  {
    title: "You review, then decide",
    detail: `The equation, both numbers, the difference, and a ten-row sample are shown. The ${siteConfig.price.display} payment step appears only if the check passed.`,
  },
] as const;

/**
 * How it works.
 *
 * This page exists because the product's central claim — that the numbers were checked — is
 * only worth something if the customer can understand what was checked and how. So it explains
 * the mechanism in enough detail to be falsifiable, including the parts that are unglamorous:
 * why layout detection is ambiguous, and why we let reconciliation break the tie.
 */
export default function HowItWorksPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.howItWorks,
            name: TITLE,
            description: DESCRIPTION,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: "How it works", path: routes.howItWorks },
            ],
          }),
          howToSchema({
            name: "How a PDF bank statement is converted and verified",
            description: DESCRIPTION,
            steps: STEPS,
          }),
        ])}
      />

      <Section className="pt-12 pb-8 sm:pt-16">
        <Container width="narrow">
          <Eyebrow>How it works</Eyebrow>
          <Heading level={1} className="mt-3">
            How a PDF statement becomes a verified spreadsheet
          </Heading>
          <Lede className="mt-4">
            The interesting part of this product is not the conversion — plenty of tools produce a
            spreadsheet. It is the check that runs afterwards, and this page explains exactly what
            that check does.
          </Lede>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container width="narrow">
          <ol className="space-y-4">
            {STEPS.map((step, index) => (
              <Card key={step.title} as="li" className="flex gap-5">
                <span className="tabular bg-accent-100 text-accent-800 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <div>
                  <Heading level={4}>{step.title}</Heading>
                  <p className="text-ink-600 mt-1.5 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </Card>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="problem">
        <Container width="narrow">
          <Heading id="problem">Why a PDF statement is hard to read</Heading>
          <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
            <p>
              A PDF does not contain a table. It contains instructions to draw glyphs at
              coordinates. When your bank generated the statement, the table structure was thrown
              away — the columns you see are an artefact of where the text happens to sit on the
              page.
            </p>
            <p>
              Recovering the table means inferring it back. Which vertical positions constitute one
              row. Which horizontal band is the description and which is the balance. Whether a
              short line is a wrapped continuation of the row above or a transaction of its own.
              Whether the two right-hand columns are debit and credit, or amount and running
              balance.
            </p>
            <p>
              Each of those inferences can be wrong in a way that produces a perfectly plausible
              spreadsheet. That is the actual problem: not that conversion is difficult, but that
              incorrect conversion is invisible.
            </p>
          </div>

          <Card className="mt-8">
            <Heading level={4}>The four mistakes that matter</Heading>
            <CheckList
              className="mt-4"
              tone="neutral"
              items={[
                "A wrapped description read as an extra transaction, inflating the row count",
                "Debit and credit columns transposed, flipping the sign of every amount",
                "A date like 03/04 read in the wrong day-month order, scrambling the ordering",
                "A misread decimal separator turning 1.234,56 into 1.23 or 123,456",
              ]}
            />
          </Card>
        </Container>
      </Section>

      <Section labelledBy="methods">
        <Container>
          <Eyebrow>Reconciliation</Eyebrow>
          <Heading id="methods" className="mt-3">
            The four ways a statement can be balanced
          </Heading>
          <Lede className="mt-4 max-w-2xl">
            Whichever your statement supports is the one used, and the panel names it so you know
            which claim is being made. Statements that support more than one are checked against all
            of them.
          </Lede>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[
              {
                name: "Opening and closing balance",
                equation: "Opening balance + credits − debits = closing balance",
                detail:
                  "The strongest check available on a current or savings account. Every extracted row contributes, so any dropped, duplicated, or misread transaction changes the result.",
              },
              {
                name: "Running balance chain",
                equation: "Each row's balance − previous row's balance = that row's amount",
                detail:
                  "When the statement prints a balance beside every transaction, each row can be checked individually. This does not just detect an error, it localises it to a specific row.",
              },
              {
                name: "Credit card category totals",
                equation:
                  "Previous balance + purchases + fees + interest − payments − credits = new balance",
                detail:
                  "Card statements print subtotals per category. Each extracted transaction is attributed to a category and the subtotals are reproduced independently.",
              },
              {
                name: "Stated totals",
                equation:
                  "Sum of debits = stated total debits; sum of credits = stated total credits",
                detail:
                  "Some statements print total debits and total credits without usable balances. Reproducing both totals exactly is weaker than a balance chain but still catches every arithmetic error.",
              },
            ].map((method) => (
              <Card key={method.name}>
                <Heading level={4}>{method.name}</Heading>
                <p className="tabular bg-ink-50 text-ink-900 mt-3 rounded-md px-3 py-2 text-sm font-medium">
                  {method.equation}
                </p>
                <p className="text-ink-600 mt-3 text-sm leading-relaxed">{method.detail}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <Heading level={4}>Reconciliation also breaks the tie on layout</Heading>
            <p className="text-ink-700 mt-3 text-sm leading-relaxed">
              When a page could plausibly be read two ways — say, the last two numeric columns are
              either &ldquo;debit, credit&rdquo; or &ldquo;amount, balance&rdquo; — both readings
              are built and both are checked. A reading that balances against the statement&rsquo;s
              own figures is almost certainly the right one; a reading that does not is discarded.
              If no reading balances, none is offered for sale.
            </p>
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="structural">
        <Container width="narrow">
          <Heading id="structural">Checks that are not about arithmetic</Heading>
          <p className="text-ink-700 mt-5 text-[0.975rem] leading-relaxed">
            A statement can add up and still be wrong. These run alongside the balance check, and
            some of them can fail a statement on their own.
          </p>
          <CheckList
            className="mt-6"
            items={[
              "Duplicate detection: identical date, description, and amount appearing more than once where the statement shows it once",
              "Sign coherence: a row that is both a debit and a credit, or an amount whose direction cannot be established",
              "Date continuity: transaction dates falling outside the statement period, or ordering that contradicts the running balance",
              "Impossible dates: 31 February and similar, which indicate a misread rather than an unusual statement",
              "Multiple accounts: more than one account number in the document, which makes a single balance check meaningless",
            ]}
          />
        </Container>
      </Section>

      <Section labelledBy="failure">
        <Container width="narrow">
          <Heading id="failure">What happens when a statement fails</Heading>
          <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
            <p>
              You are shown what we read, which check was applied, the two numbers that did not
              agree, and the difference between them. Then the process stops. The payment step is
              not rendered, and the server will refuse to create a checkout session for a result
              that failed verification even if the request is made directly.
            </p>
            <p>
              We show you the failed extraction on purpose. It is your statement, you are entitled
              to see what a tool made of it, and the discrepancy is often informative — a difference
              exactly equal to one transaction usually means a row was missed, and a difference of a
              round amount often means a fee line was read as a heading.
            </p>
            <p>
              Nothing is charged, so there is nothing to refund. If you think the statement should
              have been readable,{" "}
              <Link
                href={routes.contact}
                className="text-accent-700 font-medium underline underline-offset-2"
              >
                tell us about the layout
              </Link>{" "}
              — the bank and the shape of the table, never the statement itself.
            </p>
          </div>

          <div className="mt-10 text-center">
            <ButtonLink href={routes.app} size="lg">
              {siteConfig.primaryCta}
            </ButtonLink>
            <p className="text-ink-600 mt-3 text-sm">
              Finding out whether your statement can be verified costs nothing.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
