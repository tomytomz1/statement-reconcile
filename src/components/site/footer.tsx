import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/primitives";
import { footerGroups, seoPage } from "@/content/seo";

/**
 * Site footer.
 *
 * As well as the usual legal links, the footer is the internal-linking backbone: every
 * conversion landing page is linked from here, so no page is orphaned and any page is at
 * most two clicks from any other. The labels are the pages' own H1s rather than invented
 * anchor text, which keeps the link text honest about what is on the other side.
 */

const PRODUCT_LINKS = [
  { href: routes.app, label: siteConfig.primaryCta },
  { href: routes.howItWorks, label: "How it works" },
  { href: routes.pricing, label: "Pricing" },
  { href: routes.faq, label: "FAQ" },
] as const;

const TRUST_LINKS = [
  { href: routes.security, label: "Security" },
  { href: routes.privacy, label: "Privacy" },
  { href: routes.terms, label: "Terms" },
  { href: routes.refundPolicy, label: "Refunds" },
  { href: routes.contact, label: "Contact" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="no-print border-ink-200 mt-auto border-t bg-white"
      data-testid="marketing-footer"
    >
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-ink-950 text-sm font-bold">{siteConfig.brandName}</p>
            <p className="text-ink-600 mt-3 max-w-xs text-sm leading-relaxed">
              {siteConfig.primaryOutcome}. {siteConfig.differentiator}
            </p>
            <p className="text-ink-700 mt-4 text-sm font-medium">{siteConfig.priceLine}</p>
            <p className="text-ink-500 mt-1.5 text-sm">{siteConfig.offerLine}</p>
          </div>

          <FooterColumn heading="Product" links={PRODUCT_LINKS} />
          <FooterColumn heading="Trust" links={TRUST_LINKS} />
        </div>

        {/*
         * The conversion directory gets its own full-width row rather than a quarter of the
         * row above. Squeezed into a narrow column, almost every label wrapped onto a second
         * line, which made this block taller than the rest of the footer put together while
         * the brand column sat half empty. One column per group gives each label the width to
         * sit on one line and reads as a directory rather than the main event.
         */}
        <div className="border-ink-200 mt-12 border-t pt-10">
          <p className="text-ink-500 text-xs font-semibold tracking-[0.1em] uppercase">
            Conversions
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.heading}>
                <p className="text-ink-700 text-xs font-semibold">{group.heading}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {group.slugs.map((slug) => {
                    const page = seoPage(slug);
                    if (!page) return null;
                    return (
                      <li key={slug}>
                        <Link
                          href={`/${slug}`}
                          className="text-ink-600 hover:text-accent-700 text-[0.8125rem] leading-snug underline-offset-2 hover:underline"
                        >
                          {page.h1}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-ink-200 text-ink-500 mt-12 flex flex-col gap-4 border-t pt-6 text-xs leading-relaxed sm:flex-row sm:items-start sm:justify-between">
          <p>
            © {year} {siteConfig.legalBusinessName}. Version {siteConfig.productVersion}.
          </p>
          <p className="max-w-xl sm:text-right">
            Bank and card issuer names are used only to describe the statements this tool can read.{" "}
            {siteConfig.brandName} is independent and is not affiliated with, endorsed by, or
            sponsored by any financial institution or software vendor. Converted output is a
            mechanical reproduction of your statement and is not accounting, tax, or financial
            advice.
          </p>
        </div>
        <p className="text-ink-600 mt-4 text-xs">
          Built by{" "}
          <a
            href="https://beltran.digital/"
            target="_blank"
            rel="noopener"
            className="hover:text-accent-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Beltrán Digital
          </a>
        </p>
      </Container>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-ink-500 text-xs font-semibold tracking-[0.1em] uppercase">{heading}</p>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-ink-600 hover:text-accent-700 text-sm underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
