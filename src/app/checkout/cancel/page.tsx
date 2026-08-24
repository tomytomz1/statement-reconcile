import type { Metadata } from "next";

import { routes, siteConfig } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, Heading, Lede } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * Rendered per request rather than at build time, so the strict nonce-based CSP that applies
 * to every `/checkout` route can be attached to this page too.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Checkout cancelled",
  description: "Your checkout was cancelled and nothing was charged.",
  path: routes.checkoutCancel,
  noindex: true,
});

/**
 * The cancel page.
 *
 * A customer who backed out of checkout has not changed their mind about the statement, only
 * about the payment, so the useful thing to say is that their conversion is still here and
 * nothing was taken — not to re-pitch the product.
 */
export default function CheckoutCancelPage() {
  return (
    <Container width="narrow">
      <div className="mb-8">
        <Heading level={1}>Checkout cancelled</Heading>
        <Lede className="mt-3">
          Nothing was charged. Your converted statement is still in this browser.
        </Lede>
      </div>

      <Card>
        <p className="text-ink-700 text-sm leading-relaxed">
          The conversion you ran has not gone anywhere — it is held in this browser and expires by
          itself within the hour. Go back to it and the {siteConfig.price.display} payment step will
          be exactly where you left it.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={routes.app}>Back to my conversion</ButtonLink>
          <ButtonLink href={routes.faq} variant="secondary">
            Questions before paying
          </ButtonLink>
        </div>
      </Card>
    </Container>
  );
}
