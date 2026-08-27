import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { PendingFilesProvider } from "@/components/converter/pending-files";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/site/json-ld";
import { PageAnalytics } from "@/components/site/page-analytics";
import {
  jsonLdGraph,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo/structured-data";
import { rootMetadata } from "@/lib/seo/metadata";

import "./globals.css";

/**
 * Root layout.
 *
 * The font is self-hosted through `next/font`, so no request goes to a third-party domain
 * at runtime and the Content-Security-Policy does not need to allow one. The site-wide
 * JSON-LD graph lives here rather than being repeated per page, and pages contribute only
 * their own nodes.
 */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = rootMetadata;

export const viewport = {
  themeColor: "#1d63d8",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only-focusable bg-accent-700 absolute top-4 left-4 z-50 rounded-md px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to main content
        </a>
        <PendingFilesProvider>{children}</PendingFilesProvider>
        <PageAnalytics />
        <JsonLd
          data={jsonLdGraph([organizationSchema(), websiteSchema(), softwareApplicationSchema()])}
        />
        <Analytics />
        <span className="hidden" aria-hidden="true" data-version={siteConfig.productVersion} />
      </body>
    </html>
  );
}
