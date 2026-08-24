import type { Metadata } from "next";

import { routes, siteConfig } from "@/config/site";
import { ConverterApp } from "@/components/converter/converter-app";
import { Container, Heading, Lede } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * The conversion route.
 *
 * `noindex` is not a preference here, it is a requirement: this URL can hold a live preview of
 * somebody's bank statement, and a search engine cache of it would undo every other guarantee
 * the product makes.
 */
export const metadata: Metadata = pageMetadata({
  title: "Convert a bank statement",
  description: `Convert your PDF bank or credit-card statement to Excel and CSV. ${siteConfig.differentiator}`,
  path: routes.app,
  noindex: true,
});

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = typeof params.session_id === "string" ? params.session_id : undefined;

  return (
    <Container width="narrow">
      <div className="mb-8">
        <Heading level={1}>Convert your bank statement</Heading>
        <Lede className="mt-3">
          Choose your PDF. You will see the extracted transactions and whether the statement
          balances before anything is charged.
        </Lede>
      </div>

      <ConverterApp {...(session ? { initialSession: session } : {})} />
    </Container>
  );
}
