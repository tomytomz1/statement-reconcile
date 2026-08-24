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
];

function collectPublicCopy(): string[] {
  const roots = [
    join(process.cwd(), "src", "content"),
    join(process.cwd(), "src", "app", "(site)"),
    join(process.cwd(), "src", "config", "site.ts"),
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
  return files.map((file) => readFileSync(file, "utf8"));
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

  it("states the $19 pack as one or more statements and a combined page cap", () => {
    expect(siteConfig.offerLine).toMatch(/one or more statements/i);
    expect(siteConfig.offerLine).toMatch(/total pages/i);
    expect(siteConfig.verifiedCta).toMatch(/verified Excel \+ CSV \+ reports/i);
    expect(siteConfig.ownedCategory).toBe("Verified Bank Statement Conversion");
  });

  it("explains that verified means extraction checks, in FAQ or terms", () => {
    const faqText = faqs.map((entry) => entry.answer.join(" ")).join(" ");
    const legal = `${termsOfService.plainEnglish.join(" ")} ${privacyPolicy.plainEnglish.join(" ")}`;
    const haystack = `${faqText} ${legal}`.toLowerCase();
    expect(haystack.includes("authentic") || haystack.includes("audit")).toBe(true);
  });
});
