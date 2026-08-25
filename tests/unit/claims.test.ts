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
