import type { Metadata } from "next";
import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Container, Eyebrow, Heading, Lede, Section } from "@/components/ui/primitives";
import { faqCategories, faqForSchema, faqs } from "@/content/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema, jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

const TITLE = "Frequently asked questions";
const DESCRIPTION = `Answers about converting PDF bank statements to Excel and CSV: how the balance check works, what happens to your data, what ${siteConfig.price.display} covers, and the statements this tool refuses.`;

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: routes.faq,
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.faq,
            name: TITLE,
            description: DESCRIPTION,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: "FAQ", path: routes.faq },
            ],
          }),
          faqSchema(faqForSchema(faqs)),
        ])}
      />

      <Section className="pt-12 pb-8 sm:pt-16">
        <Container width="narrow">
          <Eyebrow>FAQ</Eyebrow>
          <Heading level={1} className="mt-3">
            Frequently asked questions
          </Heading>
          <Lede className="mt-4">
            Including the ones with unflattering answers. If something you need to know is missing,{" "}
            <Link
              href={routes.contact}
              className="text-accent-700 font-medium underline underline-offset-2"
            >
              ask
            </Link>{" "}
            and the answer will end up on this page.
          </Lede>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container width="narrow">
          <div className="space-y-12">
            {faqCategories.map((category) => {
              const entries = faqs.filter((entry) => entry.category === category);
              if (entries.length === 0) return null;
              const id = category.toLowerCase().replace(/[^a-z]+/g, "-");
              return (
                <div key={category}>
                  <Heading level={3} id={id}>
                    {category}
                  </Heading>
                  <div className="mt-5">
                    <FaqList entries={entries} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-card bg-ink-950 mt-14 px-6 py-10 text-center sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Still deciding? Convert one and see.
            </h2>
            <p className="text-ink-300 mx-auto mt-3 max-w-lg text-[0.975rem] leading-relaxed">
              You will know whether your statement can be read and verified before any payment step
              appears.
            </p>
            <ButtonLink href={routes.app} size="lg" className="mt-7">
              {siteConfig.primaryCta}
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
