import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { routes, siteConfig } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { ButtonLink } from "@/components/ui/button";
import {
  Badge,
  Card,
  CheckList,
  Container,
  Eyebrow,
  Heading,
  Lede,
  Section,
} from "@/components/ui/primitives";
import { seoPage, seoSlugs } from "@/content/seo";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, howToSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

/**
 * The conversion landing page template.
 *
 * Every one of these pages is fully statically generated from its own content file, and
 * `dynamicParams = false` means a URL that is not in the registry is a 404 rather than an
 * empty page rendered on demand. That matters for a programmatic content set: the fastest way
 * to get one deindexed is to let it answer 200 for arbitrary paths.
 *
 * The layout is the same everywhere on purpose. The copy differs — every field below comes
 * from the page's own file, and the SEO audit fails the build if two pages share a title, a
 * description, or their body prose — but a customer who lands on two of these should recognise
 * the second one immediately.
 */

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return seoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = seoPage(slug);
  if (!page) return {};
  return pageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: `/${page.slug}`,
  });
}

export default async function ConversionLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = seoPage(slug);
  if (!page) notFound();

  const formats = page.outputFormats
    .map((format) => (format === "xlsx" ? "Excel (.xlsx)" : "CSV"))
    .join(" and ");

  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: `/${page.slug}`,
            name: page.title,
            description: page.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: page.h1, path: `/${page.slug}` },
            ],
          }),
          howToSchema({
            name: page.h1,
            description: page.metaDescription,
            steps: page.steps,
          }),
          faqSchema(page.faqs),
        ])}
      />

      <Section className="pt-10 pb-8 sm:pt-16 sm:pb-12">
        <Container>
          <nav aria-label="Breadcrumb" className="text-ink-500 mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href={routes.home}
                  className="hover:text-ink-700 underline-offset-2 hover:underline"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink-700" aria-current="page">
                {page.h1}
              </li>
            </ol>
          </nav>

          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <Eyebrow>{page.eyebrow}</Eyebrow>
              <Heading level={1} className="mt-3">
                {page.h1}
              </Heading>
              <div className="mt-5 space-y-4">
                {page.intro.map((paragraph) => (
                  <Lede key={paragraph}>{paragraph}</Lede>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ButtonLink href={routes.app} size="lg">
                  {siteConfig.primaryCta}
                </ButtonLink>
                <span className="text-ink-600 text-sm font-medium">
                  Verify the result before checkout
                </span>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <Badge tone="verified">Verified before payment</Badge>
                <Badge tone="neutral">{formats}</Badge>
                <Badge tone="neutral">PDF never uploaded</Badge>
              </div>
            </div>

            <Card>
              <Heading level={4}>What you get</Heading>
              <CheckList className="mt-4" items={page.outputDetails} />
              <p className="border-ink-200 text-ink-500 mt-5 border-t pt-4 text-xs leading-relaxed">
                One or more statements up to {siteConfig.limits.maxPages} total pages. Both formats
                and verification reports are included. The exact charge appears only after the pack
                passes verification.
              </p>
            </Card>
          </div>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="reconciliation">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>The check</Eyebrow>
              <Heading id="reconciliation" className="mt-3">
                {page.reconciliation.heading}
              </Heading>
              <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
                {page.reconciliation.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <Card className="border-l-verified-600 self-start border-l-4">
              <p className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase">
                Equation used
              </p>
              <p className="tabular text-ink-950 mt-2.5 text-base font-semibold">
                {page.reconciliation.equation}
              </p>
              <p className="text-ink-600 mt-4 text-sm leading-relaxed">
                Computed with exact decimal arithmetic in our own code, separately from whatever
                read the page. You see both sides of this equation, and the difference between them,
                before the payment step appears.
              </p>
            </Card>
          </div>
        </Container>
      </Section>

      <Section labelledBy="steps">
        <Container>
          <Eyebrow>Step by step</Eyebrow>
          <Heading id="steps" className="mt-3">
            How this conversion runs
          </Heading>
          <ol className="mt-8 grid gap-5 md:grid-cols-2">
            {page.steps.map((step, index) => (
              <Card key={step.title} as="li" className="p-5">
                <span className="tabular text-accent-700 text-sm font-bold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Heading level={4} className="mt-2">
                  {step.title}
                </Heading>
                <p className="text-ink-600 mt-2 text-sm leading-relaxed">{step.detail}</p>
              </Card>
            ))}
          </ol>
        </Container>
      </Section>

      {page.sections.map((section, index) => (
        <Section
          key={section.heading}
          tone={index % 2 === 0 ? "raised" : "default"}
          labelledBy={`section-${index}`}
        >
          <Container width="narrow">
            <Heading id={`section-${index}`}>{section.heading}</Heading>
            <div className="text-ink-700 mt-5 space-y-4 text-[0.975rem] leading-relaxed">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.bullets && section.bullets.length > 0 ? (
              <CheckList className="mt-6" items={section.bullets} tone="neutral" />
            ) : null}
          </Container>
        </Section>
      ))}

      <Section labelledBy="scope">
        <Container>
          <Eyebrow>Scope</Eyebrow>
          <Heading id="scope" className="mt-3">
            What this handles, and what it refuses
          </Heading>
          <Lede className="mt-4 max-w-2xl">
            The refusals are the important half. Each one is a case where a converter could produce
            something plausible and wrong.
          </Lede>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <Heading level={4}>Handled</Heading>
              <CheckList className="mt-4" items={page.supported} />
            </Card>
            <Card className="border-refused-200">
              <Heading level={4}>Not handled</Heading>
              <ul className="mt-4 space-y-2.5">
                {page.unsupported.map((item) => (
                  <li key={item} className="text-ink-700 flex gap-3 text-sm leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="bg-refused-700 mt-[0.35rem] size-1.5 shrink-0 rounded-full"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="mt-6">
            <Heading level={4}>Formatting problems that come up with these statements</Heading>
            <CheckList className="mt-4" items={page.commonIssues} tone="neutral" />
          </Card>
        </Container>
      </Section>

      <Section tone="raised" labelledBy="page-faq">
        <Container width="narrow">
          <Heading id="page-faq">Questions about this conversion</Heading>
          <div className="divide-ink-200 rounded-card border-ink-200 mt-8 divide-y overflow-hidden border bg-white">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="text-ink-900 hover:bg-ink-50 flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 font-semibold">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden="true"
                    className="text-ink-400 mt-1 shrink-0 transition-transform group-open:rotate-45"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="text-ink-700 px-5 pb-5 text-[0.9375rem] leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </Section>

      <Section labelledBy="related">
        <Container>
          <Heading id="related">Related conversions</Heading>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {page.related.map((link) => (
              <Card key={link.href} as="li" className="p-5">
                <Link
                  href={link.href}
                  className="text-accent-700 font-semibold underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
                <p className="text-ink-600 mt-1.5 text-sm leading-relaxed">{link.context}</p>
              </Card>
            ))}
          </ul>

          <div className="rounded-card bg-ink-950 mt-12 px-6 py-10 text-center sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Find out whether your statement can be verified
            </h2>
            <p className="text-ink-300 mx-auto mt-3 max-w-xl text-[0.975rem] leading-relaxed">
              Choose your PDFs and inspect the result. The billing step only appears once the
              extracted transactions have been checked against your statement.
            </p>
            <ButtonLink href={routes.app} size="lg" className="mt-7">
              {siteConfig.primaryCta}
            </ButtonLink>
          </div>

          {page.independenceNotice ? (
            <p className="border-ink-200 text-ink-500 mt-8 rounded-lg border bg-white px-5 py-4 text-xs leading-relaxed">
              {page.independenceNotice}
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
