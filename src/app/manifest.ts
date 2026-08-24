import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.brandName} — ${siteConfig.primaryOutcome}`,
    short_name: siteConfig.brandName,
    description: `Convert PDF bank and credit-card statements to Excel and CSV. ${siteConfig.differentiator}`,
    // The converter route, so an installed shortcut lands on the tool rather than the pitch.
    start_url: "/app",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#1d63d8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    categories: ["finance", "productivity", "utilities"],
    lang: "en",
  };
}
