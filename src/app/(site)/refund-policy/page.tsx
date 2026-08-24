import type { Metadata } from "next";

import { routes } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { LegalDocumentPage } from "@/components/site/legal-document";
import { refundPolicy } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: refundPolicy.title,
  description: refundPolicy.metaDescription,
  path: routes.refundPolicy,
});

export default function RefundPolicyPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.refundPolicy,
            name: refundPolicy.title,
            description: refundPolicy.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: refundPolicy.h1, path: routes.refundPolicy },
            ],
          }),
        ])}
      />
      <LegalDocumentPage document={refundPolicy} />
    </>
  );
}
