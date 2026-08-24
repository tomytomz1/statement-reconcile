import type { Metadata } from "next";

import { routes } from "@/config/site";
import { CheckoutReturn } from "@/components/converter/checkout-return";
import { Container, Heading, Lede } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Your files are ready",
  description: "Download the Excel workbook and CSV file for your converted statement.",
  path: routes.checkoutSuccess,
  noindex: true,
});

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;

  return (
    <Container width="narrow">
      <div className="mb-8">
        <Heading level={1}>Thank you — here are your files</Heading>
        <Lede className="mt-3">
          Both formats are included in the one payment. Download them now; nothing about this
          conversion is kept on our side.
        </Lede>
      </div>

      <CheckoutReturn sessionId={sessionId} />
    </Container>
  );
}
