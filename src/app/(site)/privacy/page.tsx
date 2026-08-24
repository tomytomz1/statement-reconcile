import type { Metadata } from "next";

import { routes } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { LegalDocumentPage } from "@/components/site/legal-document";
import { privacyPolicy } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { jsonLdGraph, webPageSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = pageMetadata({
  title: privacyPolicy.title,
  description: privacyPolicy.metaDescription,
  path: routes.privacy,
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageSchema({
            path: routes.privacy,
            name: privacyPolicy.title,
            description: privacyPolicy.metaDescription,
            breadcrumb: [
              { name: "Home", path: routes.home },
              { name: privacyPolicy.h1, path: routes.privacy },
            ],
          }),
        ])}
      />
      <LegalDocumentPage document={privacyPolicy} />
    </>
  );
}
