import Link from "next/link";

import { routes, siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

import { MobileNav } from "./mobile-nav";
import { Wordmark } from "./wordmark";

/**
 * Site header.
 *
 * The navigation is short on purpose. Every extra destination on a single-purpose landing
 * page is another way to leave without converting, so the only links present are the ones a
 * sceptical buyer actually needs before paying: what it does, how it works, who it is for,
 * what it costs, and what happens to their data. SEO pages stay in the footer.
 */

const NAV = [
  { href: routes.app, label: "Convert" },
  { href: routes.howItWorks, label: "How it works" },
  { href: "/bank-statement-converter-for-bookkeepers", label: "For bookkeepers" },
  { href: routes.pricing, label: "Pricing" },
  { href: routes.security, label: "Security" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-ink-200/80 sticky top-0 z-40 border-b bg-white/90 backdrop-blur-sm">
      <Container className="relative flex h-16 items-center justify-between gap-4">
        <Link
          href={routes.home}
          className="text-ink-950 flex items-center gap-2.5 rounded-md"
          aria-label={`${siteConfig.brandName} home`}
        >
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink-600 hover:bg-ink-50 hover:text-ink-900 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <ButtonLink href={routes.app} size="sm" className="whitespace-nowrap">
            <span className="hidden sm:inline">{siteConfig.navCta}</span>
            <span className="sm:hidden">Verify free</span>
          </ButtonLink>
          <MobileNav items={NAV} />
        </div>
      </Container>
    </header>
  );
}
