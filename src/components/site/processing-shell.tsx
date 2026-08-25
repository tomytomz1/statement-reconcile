import Link from "next/link";
import type { ReactNode } from "react";

import { routes, siteConfig } from "@/config/site";
import { ProcessingFooter } from "@/components/site/processing-footer";
import { Wordmark } from "@/components/site/wordmark";
import { Container } from "@/components/ui/primitives";

/**
 * Chrome for the routes that can hold live statement data.
 *
 * Shared by `/app` and `/checkout/*` so the two halves of one flow look like one flow. It is
 * intentionally sparser than the marketing chrome: while a statement is on screen there is
 * nothing to sell and nowhere else the customer should be encouraged to go. That applies to
 * the footer too, which is why these routes use `ProcessingFooter` rather than the marketing
 * `SiteFooter` and its SEO conversion directory.
 */
export function ProcessingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-ink-200 border-b bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            href={routes.home}
            className="rounded-md"
            aria-label={`${siteConfig.brandName} home`}
          >
            <Wordmark />
          </Link>
          <p className="text-ink-500 hidden text-sm sm:block">
            verify first · no account · original PDF stays local
          </p>
        </Container>
      </header>
      <main id="main" className="flex-1 py-10 sm:py-14">
        {children}
      </main>
      <ProcessingFooter />
    </>
  );
}
