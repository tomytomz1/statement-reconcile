import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

/**
 * The social sharing image.
 *
 * Generated rather than designed as a static file so it stays correct when the brand name or
 * the offer changes, and so there is no binary asset in the repository that can drift out of
 * sync with the copy. It renders the same claim the homepage leads with, because a share card
 * that says something different from the page it links to is a wasted impression.
 */

export const alt = `${siteConfig.brandName} — ${siteConfig.primaryOutcome}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(150deg, #131924 0%, #1e2634 55%, #1d478a 100%)",
        padding: "72px 80px",
        fontFamily: "sans-serif",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#2579eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Drawn rather than typed as "✓": a glyph would need a font download, and a
                build must not depend on a network request. */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13 10 18 19 6"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
          {siteConfig.brandName}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            maxWidth: 940,
          }}
        >
          Convert Bank Statements to Excel &amp; CSV
        </div>
        <div style={{ fontSize: 34, color: "#93d0fd", fontWeight: 600, maxWidth: 900 }}>
          {siteConfig.differentiator}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 26,
          color: "#b1bac8",
        }}
      >
        <span>Up to {siteConfig.limits.maxPages} pages</span>
        <span>·</span>
        <span>No account</span>
        <span>·</span>
        <span>{siteConfig.domain}</span>
      </div>
    </div>,
    size,
  );
}
