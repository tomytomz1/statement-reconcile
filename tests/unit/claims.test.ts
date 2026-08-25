import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { faqs } from "@/content/faq";
import { privacyPolicy, termsOfService } from "@/content/legal";

/**
 * Public copy must not overclaim. "Verified" means documented extraction checks, not
 * authenticity, fraud detection, an audit opinion, or 100% accuracy.
 */

const FORBIDDEN = [
  /100%\s*accurate/i,
  /bank-grade/i,
  /soc\s*2 certified/i,
  /hipaa[- ]compliant/i,
  /pci[\s-]*dss certified/i,
  /provides an audit opinion/i,
  /guaranteed authentic/i,
  /unique in (the )?market/i,
  /only (tool|converter) that/i,
  /accounting[- ]ready/i,
  /ready to import/i,
];

function collectPublicCopyWithPaths(): Array<[string, string]> {
  const roots = [
    join(process.cwd(), "src", "content"),
    join(process.cwd(), "src", "app", "(site)"),
    join(process.cwd(), "src", "config", "site.ts"),
    // The public chrome — header, footer, hero, processing shell — renders on every
    // pre-verification surface, so it is bound by the same claims rules as the copy it
    // wraps. `src/components/converter` is excluded because it is downstream of a pass and
    // is covered by the funnel e2e test instead.
    join(process.cwd(), "src", "components", "site"),
  ];
  const files: string[] = [];
  function walk(dir: string): void {
    const stats = statSync(dir);
    if (stats.isFile()) {
      files.push(dir);
      return;
    }
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|md)$/.test(entry.name)) files.push(path);
    }
  }
  for (const root of roots) walk(root);
  return files.map((file) => [file, readFileSync(file, "utf8")] as [string, string]);
}

function collectPublicCopy(): string[] {
  return collectPublicCopyWithPaths().map(([, text]) => text);
}

describe("claims policy", () => {
  it("does not use prohibited accuracy or authenticity claims in public copy", () => {
    const blobs = collectPublicCopy();
    for (const text of blobs) {
      for (const pattern of FORBIDDEN) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it("preserves pack scope in the offer line and states the bargain in the price line", () => {
    expect(siteConfig.offerLine).toMatch(/one or more statements/i);
    expect(siteConfig.offerLine).toMatch(/total pages/i);
    expect(siteConfig.verifiedCta).toMatch(/verified Excel \+ CSV/i);
    expect(siteConfig.ownedCategory).toBe("Verified Bank Statement Conversion");

    // The visitor should know the terms before handing over a bank statement: what it costs,
    // that verifying costs nothing, and that nothing recurs.
    expect(siteConfig.priceLine).toContain(siteConfig.price.display);
    expect(siteConfig.priceLine).toMatch(/free/i);
    expect(siteConfig.priceLine).toMatch(/no subscription/i);
  });

  /**
   * Copy that says the amount is revealed after verification.
   *
   * This was true in V1 and is now false: the price is stated before a file is chosen. The
   * phrasings below were found across the landing-page template, the FAQ, both legal
   * documents, and an SEO data file, so a single rendered string was never the problem —
   * the template propagated one of them to all 21 landers.
   *
   * It remains accurate to say checkout opens only after verification. What is banned is
   * claiming the amount is withheld until then.
   */
  it("does not claim the price is revealed only after verification", () => {
    const stale = [
      /exact charge/i,
      /exact one-time charge/i,
      /exact price/i,
      /charge appears/i,
      /price is disclosed/i,
      /payment disclosed/i,
      /charge shown after verification/i,
      /price shown after verification/i,
      /disclosed after verification/i,
      /revealed after verification/i,
      /shown only when/i,
      /charge is shown only/i,
    ];
    for (const [path, text] of collectPublicCopyWithPaths()) {
      for (const pattern of stale) {
        expect(text, `${path} still promises the price only after verification`).not.toMatch(
          pattern,
        );
      }
    }
  });

  /**
   * Recovery language that describes a promise narrower than the implemented one.
   *
   * Recovery works from the local sealed result for about an hour, and after that from the
   * recovery link plus the same original PDFs — on any device. Copy saying it works "only
   * while your browser still holds" the result understates that, which matters because a
   * customer reading it would reasonably conclude their money was gone.
   */
  it("does not describe recovery as browser-only", () => {
    const browserOnly = [
      /only while (your|that) browser/i,
      /as long as (your|that) browser still holds/i,
      /provided your browser still holds/i,
      /but only while your browser/i,
    ];
    for (const [path, text] of collectPublicCopyWithPaths()) {
      for (const pattern of browserOnly) {
        expect(text, `${path} still describes recovery as browser-only`).not.toMatch(pattern);
      }
    }
  });

  /**
   * The 20 MB limit is enforced in the browser and only there, because the original PDF
   * bytes never reach the server. Copy claiming a server-side byte check is false.
   */
  it("does not claim the server enforces the original PDF byte size", () => {
    const serverSideBytes = [
      /enforced server-side as well as in the browser[^.]*20 ?MB/i,
      /server-side[^.]{0,60}20 ?MB per file/i,
      /20 ?MB per file[^.]{0,60}server-side/i,
    ];
    for (const [path, text] of collectPublicCopyWithPaths()) {
      for (const pattern of serverSideBytes) {
        expect(text, `${path} claims a server-side 20 MB check that cannot exist`).not.toMatch(
          pattern,
        );
      }
    }
  });

  /**
   * The price is public now, so the rule is no longer "never say it" — it is "never say it
   * twice". A literal amount typed into a component is a number that can drift away from the
   * one Stripe actually charges, and the customer would have no way to tell which is real.
   * Every rendered price has to come from `siteConfig.price`, which is also what
   * `createCheckoutSession` bills.
   */
  it("never hardcodes the amount outside the single source of truth", () => {
    const amount = new RegExp(`\\$\\s*${siteConfig.price.amountUsd}\\b`);
    for (const [path, text] of collectPublicCopyWithPaths()) {
      if (path.endsWith(join("src", "config", "site.ts"))) continue;
      expect(text, `${path} hardcodes the price instead of reading siteConfig.price`).not.toMatch(
        amount,
      );
    }
  });

  it("explains that verified means extraction checks, in FAQ or terms", () => {
    const faqText = faqs.map((entry) => entry.answer.join(" ")).join(" ");
    const legal = `${termsOfService.plainEnglish.join(" ")} ${privacyPolicy.plainEnglish.join(" ")}`;
    const haystack = `${faqText} ${legal}`.toLowerCase();
    expect(haystack.includes("authentic") || haystack.includes("audit")).toBe(true);
  });
});
