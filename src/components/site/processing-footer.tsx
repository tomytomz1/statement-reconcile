import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { Container } from "@/components/ui/primitives";

/**
 * The footer for routes that can hold live statement data.
 *
 * `/app` and `/checkout/*` used to render the full marketing `SiteFooter`, which carried the
 * entire SEO conversion directory. Two problems with that. It put a large marketing
 * navigation surface on the page at the moment a customer has a bank statement open, which
 * is the opposite of the focused handling those routes are meant to convey. And because the
 * directory sits far below the fold, the only mention of the price on `/app` before file
 * selection was down there — which meant a body-level test for the price passed while a
 * customer looking at the uploader could not see it.
 *
 * What is left is what someone mid-conversion might actually need: who we are, what happens
 * to the file, and the trust and policy pages. No conversion directory, no cross-selling.
 */

const TRUST_LINKS = [
  { href: routes.security, label: "Security" },
  { href: routes.privacy, label: "Privacy" },
  { href: routes.terms, label: "Terms" },
  { href: routes.refundPolicy, label: "Refunds" },
  { href: routes.contact, label: "Contact" },
] as const;

export function ProcessingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="no-print border-ink-200 mt-auto border-t bg-white" data-testid="app-footer">
      <Container className="py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-ink-950 text-sm font-bold">{siteConfig.brandName}</p>
            <p className="text-ink-600 mt-2 text-sm leading-relaxed">
              Your original PDF is read in this browser and never uploaded. Nothing about your
              statement is stored on our side.
            </p>
          </div>

          <nav aria-label="Trust and policies">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {TRUST_LINKS.map((link) => (
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
          </nav>
        </div>

        <p className="border-ink-200 text-ink-500 mt-6 border-t pt-5 text-xs leading-relaxed">
          © {year} {siteConfig.legalBusinessName}. Converted output is a mechanical reproduction of
          your statement and is not accounting, tax, or financial advice.
        </p>
      </Container>
    </footer>
  );
}
