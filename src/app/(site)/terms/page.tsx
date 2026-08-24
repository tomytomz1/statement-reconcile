import type { Metadata } from "next";

import { routes } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { LegalDocumentPage } from "@/components/site/legal-document";
import { termsOfService } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: termsOfService.title,
  description: termsOfService.metaDescription,
  path: routes.terms,
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.terms,
            name: termsOfService.title,
            description: termsOfService.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: termsOfService.h1, path: routes.terms },
            ],
          }),
        ])}
      />
      <LegalDocumentPage document={termsOfService} />
    </>
  );
}
