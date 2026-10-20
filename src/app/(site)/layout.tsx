import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/footer";
import { Ga4MarketingConsent } from "@/components/site/ga4-marketing-consent";
import { SiteHeader } from "@/components/site/header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Ga4MarketingConsent />
    </>
  );
}
