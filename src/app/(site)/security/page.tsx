import type { Metadata } from "next";

import { routes } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { LegalDocumentPage } from "@/components/site/legal-document";
import { securityPolicy } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: securityPolicy.title,
  description: securityPolicy.metaDescription,
  path: routes.security,
});

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.security,
            name: securityPolicy.title,
            description: securityPolicy.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: securityPolicy.h1, path: routes.security },
            ],
          }),
        ])}
      />
      <LegalDocumentPage document={securityPolicy} />
    </>
  );
}
