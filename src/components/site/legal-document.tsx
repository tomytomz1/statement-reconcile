import { siteConfig } from "@/config/site";
import type { LegalBlock, LegalDocument } from "@/content/legal/types";
import { Card, Container, Divider, Eyebrow, Heading, Section } from "@/components/ui/primitives";
import { formatIsoDate } from "@/lib/money/display";

/**
 * Renderer for the policy documents.
 *
 * One renderer for all of them, so a clause anchor behaves identically on every page and the
 * table of contents cannot drift out of step with the headings it links to.
 *
 * Contact addresses are substituted here from configuration rather than being written into the
 * content files. A policy that names a support address which no longer receives mail is worse
 * than no policy, and hardcoding one in five documents guarantees that eventually happens.
 */

const PLACEHOLDERS: Record<string, string> = {
  "{{supportEmail}}": siteConfig.contact.supportEmail,
  "{{privacyEmail}}": siteConfig.contact.privacyEmail,
  "{{securityEmail}}": siteConfig.contact.securityEmail,
  "[[JURISDICTION]]": siteConfig.legalJurisdiction,
};

function substitute(text: string): string {
  let output = text;
  for (const [token, value] of Object.entries(PLACEHOLDERS)) {
    output = output.split(token).join(value);
  }
  return output;
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <>
      <Section className="pt-12 pb-6 sm:pt-16">
        <Container width="narrow">
          <Eyebrow>{siteConfig.brandName}</Eyebrow>
          <Heading level={1} className="mt-3">
            {document.h1}
          </Heading>
          <p className="text-ink-500 mt-4 text-sm">
            Last updated{" "}
            <time dateTime={document.lastUpdated}>{formatIsoDate(document.lastUpdated)}</time>
          </p>
          <div className="text-ink-600 mt-5 space-y-3 text-lg leading-relaxed">
            {document.summary.map((paragraph) => (
              <p key={paragraph}>{substitute(paragraph)}</p>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="py-0">
        <Container width="narrow">
          <Card className="border-accent-200 bg-accent-50/60">
            <p className="text-accent-800 text-xs font-semibold tracking-[0.08em] uppercase">
              In plain English
            </p>
            <div className="text-ink-800 mt-3 space-y-3 text-[0.9375rem] leading-relaxed">
              {document.plainEnglish.map((paragraph) => (
                <p key={paragraph}>{substitute(paragraph)}</p>
              ))}
            </div>
          </Card>
        </Container>
      </Section>

      <Section>
        <Container width="narrow">
          <nav
            aria-labelledby="contents"
            className="rounded-card border-ink-200 border bg-white p-5"
          >
            <p
              id="contents"
              className="text-ink-500 text-xs font-semibold tracking-[0.08em] uppercase"
            >
              Contents
            </p>
            <ol className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {document.sections.map((section, index) => (
                <li key={section.id} className="text-sm">
                  <a
                    href={`#${section.id}`}
                    className="text-ink-600 hover:text-accent-700 underline-offset-2 hover:underline"
                  >
                    <span className="tabular text-ink-400 mr-2">{index + 1}.</span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 space-y-12">
            {document.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-ink-950 text-xl font-bold tracking-tight">
                  <span className="tabular text-ink-400 mr-2">{index + 1}.</span>
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Divider className="mt-14" />
          <p className="text-ink-500 mt-6 text-sm leading-relaxed">
            Questions about this document can go to{" "}
            <a
              href={`mailto:${siteConfig.contact.supportEmail}`}
              className="text-accent-700 font-medium underline underline-offset-2"
            >
              {siteConfig.contact.supportEmail}
            </a>
            . Please do not include a statement, an account number, or any transaction data in your
            message — we do not need it and do not want it.
          </p>
        </Container>
      </Section>
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-ink-700 text-[0.9375rem] leading-[1.75]">{substitute(block.text)}</p>
      );

    case "bullets":
      return (
        <ul className="space-y-2">
          {block.items.map((item) => (
            <li key={item} className="text-ink-700 flex gap-3 text-[0.9375rem] leading-[1.7]">
              <span
                aria-hidden="true"
                className="bg-ink-400 mt-[0.45rem] size-1.5 shrink-0 rounded-full"
              />
              <span>{substitute(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "numbered":
      return (
        <ol className="space-y-2">
          {block.items.map((item, index) => (
            <li key={item} className="text-ink-700 flex gap-3 text-[0.9375rem] leading-[1.7]">
              <span className="tabular text-ink-400 mt-px shrink-0 text-sm font-semibold">
                {index + 1}.
              </span>
              <span>{substitute(item)}</span>
            </li>
          ))}
        </ol>
      );

    case "callout": {
      const tones = {
        verified: "border-verified-200 bg-verified-50 text-verified-900",
        caution: "border-caution-200 bg-caution-50 text-caution-900",
        neutral: "border-ink-200 bg-ink-50 text-ink-800",
      } as const;
      return (
        <p
          className={`rounded-lg border px-4 py-3 text-[0.9375rem] leading-[1.7] ${tones[block.tone]}`}
        >
          {substitute(block.text)}
        </p>
      );
    }

    case "definitions":
      return (
        <dl className="space-y-3">
          {block.items.map((item) => (
            <div key={item.term} className="bg-ink-50 rounded-lg px-4 py-3">
              <dt className="text-ink-900 text-sm font-semibold">{substitute(item.term)}</dt>
              <dd className="text-ink-700 mt-1 text-[0.9375rem] leading-[1.7]">
                {substitute(item.definition)}
              </dd>
            </div>
          ))}
        </dl>
      );

    default:
      return null;
  }
}
