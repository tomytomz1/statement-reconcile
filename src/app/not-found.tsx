import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { ButtonLink } from "@/components/ui/button";
import { Container, Heading, Lede } from "@/components/ui/primitives";
import { seoPage } from "@/content/seo";

/**
 * 404.
 *
 * A dead end on a site whose pages are almost all entry points from search is worth handling
 * properly: the useful response is the three destinations that cover nearly every reason
 * someone arrives here, not an apology.
 */
export default function NotFound() {
  const suggestions = [
    "bank-statement-converter",
    "bank-statement-to-excel",
    "bank-statement-to-csv",
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center py-20">
        <Container width="narrow">
          <p className="tabular text-accent-700 text-sm font-semibold">404</p>
          <Heading level={1} className="mt-3">
            That page does not exist
          </Heading>
          <Lede className="mt-4">
            The link may be out of date, or the address may have a typo. Everything{" "}
            {siteConfig.brandName} does starts from one page.
          </Lede>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={routes.app} size="lg">
              {siteConfig.primaryCta}
            </ButtonLink>
            <Link
              href={routes.home}
              className="text-accent-700 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Back to the homepage
            </Link>
          </div>

          <div className="border-ink-200 mt-12 border-t pt-8">
            <p className="text-ink-500 text-xs font-semibold tracking-[0.1em] uppercase">
              Popular pages
            </p>
            <ul className="mt-4 space-y-2">
              {suggestions.map((slug) => {
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
              <li>
                <Link
                  href={routes.faq}
                  className="text-accent-700 text-sm font-medium underline-offset-4 hover:underline"
                >
                  Frequently asked questions
                </Link>
              </li>
            </ul>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
