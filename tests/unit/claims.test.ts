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

/**
 * Surfaces that make retention, recovery, and enforcement claims without being marketing
 * copy: the converter UI downstream of payment, the job store's own documentation, and the
 * acceptance documents. These are where the false delete-on-download and browser-only
 * recovery statements actually lived, so a guard that only scanned `src/content` would have
 * passed while the claims were still wrong.
 */
function collectAcceptanceSurfaces(): Array<[string, string]> {
  const targets = [
    join(process.cwd(), "src", "lib", "client", "job-store.ts"),
    join(process.cwd(), "src", "components", "converter"),
    join(process.cwd(), "docs", "ARCHITECTURE.md"),
    join(process.cwd(), "docs", "DATA_FLOW.md"),
    join(process.cwd(), "docs", "PRIVACY_ARCHITECTURE.md"),
    join(process.cwd(), "docs", "REFUNDS.md"),
    join(process.cwd(), "docs", "ENVIRONMENT.md"),
    join(process.cwd(), "docs", "v2-phase1-closure-audit.md"),
  ];
  const files: string[] = [];
  function walk(target: string): void {
    const stats = statSync(target);
    if (stats.isFile()) {
      files.push(target);
      return;
    }
    for (const entry of readdirSync(target, { withFileTypes: true })) {
      const path = join(target, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|md)$/.test(entry.name)) files.push(path);
    }
  }
  for (const target of targets) walk(target);
  return files.map((file) => [file, readFileSync(file, "utf8")] as [string, string]);
}

/** Everything a claim guard should see: public copy plus the surfaces above. */
function collectAllClaimSurfaces(): Array<[string, string]> {
  return [...collectPublicCopyWithPaths(), ...collectAcceptanceSurfaces()];
}

/**
 * Recovery after the local result expires needs the saved recovery link and the same
 * original PDFs. Copy saying the result is simply gone once the browser is, or that recovery
 * works only from the original browser, understates the implemented promise.
 */
const BROWSER_ONLY_RECOVERY = [
  /only while (your|that) browser/i,
  /as long as (your|that) browser still holds/i,
  /provided your browser still holds/i,
  /but only while your browser/i,
  /if the browser data is gone, so is the result/i,
];

/**
 * Downloading does not delete the local job. The pack is four separate files, and a customer
 * who took the CSV should still be able to take the workbook.
 */
const DELETE_ON_DOWNLOAD = [
  /delete-on-download/i,
  /deleted as soon as the download/i,
  /deleted (immediately )?after (the )?download/i,
  /removed once the download completes/i,
];

/**
 * A Stripe receipt number or card-statement descriptor cannot be entered into the
 * application — we hold no record to match either against. Support may legitimately ask for
 * them to find a payment in Stripe and refund, so these patterns target the false framing
 * (using one to recover or restore a download) rather than the reference itself.
 */
const RECEIPT_AS_RECOVERY = [
  /(receipt|descriptor)[^.]{0,60}\bto (recover|restore|re-?download|unlock)\b/i,
  /enter (your |the )?(stripe )?(receipt|payment reference|descriptor)/i,
  /(receipt|payment reference)[^.]{0,40}\brestores?\b[^.]{0,40}\bdownload\b/i,
];

/**
 * Claims about purchase history that would need Stripe evidence to make.
 *
 * The pack manifest is now ordered by content digest. That changed the pack digest for any
 * multi-file pack, so a purchase made before the change would fail recovery: the customer
 * re-uploads the same PDFs, everything verifies, and the digest no longer matches what
 * Stripe recorded.
 *
 * The closure audit previously asserted that no such purchase existed. Nothing supported
 * that — the pack digest lives in Stripe session metadata, so answering the question means
 * querying Stripe, which was never done. A6 forbids the claim without that evidence, and
 * the reason is practical rather than pedantic: believing it means a customer who hits the
 * mismatch is told their files are unrecoverable instead of being re-issued or refunded.
 */
const UNEVIDENCED_PURCHASE_HISTORY = [
  /no purchases? (has |have )?(ever )?been made/i,
  /no purchases? exists?\b/i,
  /there (were|are|have been) no purchases/i,
  /no (existing )?purchases? (were|was|are|is) affected/i,
  /nothing existing is invalidated/i,
  /nothing existing was invalidated/i,
  /no (customer|customers) (were|was|are|is) affected/i,
];

/** The 20 MB original-PDF limit is browser-only; the bytes never reach the server. */
const SERVER_SIDE_BYTES = [
  /enforced server-side as well as in the browser[^.]*20 ?MB/i,
  /server-side[^.]{0,60}20 ?MB per file/i,
  /20 ?MB per file[^.]{0,60}server-side/i,
  /server (enforces|checks|validates)[^.]{0,40}20 ?MB/i,
];

/** Converted files and the recovery link are shown locally; neither is sent by email. */
const FILE_DELIVERY_BY_EMAIL = [
  /\b(?:we|stripe)\s+(?:will\s+)?(?:email|send)[^.]{0,60}\b(?:converted files?|downloads?|recovery link)\b/i,
  /\b(?:converted files?|recovery link)\s+(?:will\s+be|are|is)\s+(?:emailed|sent by email)\b/i,
];

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
  it("does not describe recovery as browser-only or as lost with the browser", () => {
    for (const [path, text] of collectAllClaimSurfaces()) {
      for (const pattern of BROWSER_ONLY_RECOVERY) {
        expect(text, `${path} understates recovery as browser-only`).not.toMatch(pattern);
      }
    }
  });

  it("does not claim the local job is deleted on download", () => {
    for (const [path, text] of collectAllClaimSurfaces()) {
      for (const pattern of DELETE_ON_DOWNLOAD) {
        expect(text, `${path} claims a delete-on-download that does not happen`).not.toMatch(
          pattern,
        );
      }
    }
  });

  it("does not claim a receipt or card reference can be used to recover in the app", () => {
    for (const [path, text] of collectAllClaimSurfaces()) {
      for (const pattern of RECEIPT_AS_RECOVERY) {
        expect(text, `${path} implies a receipt reference is usable for recovery`).not.toMatch(
          pattern,
        );
      }
    }
  });

  /**
   * Scoped to the closure audit specifically.
   *
   * `docs/v2-phase1-final-acceptance.md` is deliberately excluded: it is the contract that
   * *instructs* this wording be removed, so it quotes the prohibited phrases as
   * requirements. Scanning it would fail the guard on the document asking for the guard.
   */
  it("does not claim an absence of affected purchases without Stripe evidence", () => {
    const auditPath = join(process.cwd(), "docs", "v2-phase1-closure-audit.md");
    const audit = readFileSync(auditPath, "utf8");

    for (const pattern of UNEVIDENCED_PURCHASE_HISTORY) {
      expect(
        audit,
        "the closure audit asserts something about purchase history that needs Stripe evidence",
      ).not.toMatch(pattern);
    }

    // The correction is not merely the absence of the old sentence: the document has to say
    // the question is open, or a future edit could quietly drop both.
    expect(audit).toMatch(/unknown/i);
    expect(audit).toMatch(/no Stripe evidence was obtained/i);
  });

  it("the purchase-history guard matches the statement it is meant to catch", () => {
    const knownBad =
      "No purchase has been made against the old ordering, so nothing existing is invalidated.";
    expect(
      UNEVIDENCED_PURCHASE_HISTORY.some((pattern) => pattern.test(knownBad)),
      `no guard matches the historical claim: ${knownBad}`,
    ).toBe(true);
  });

  it("the purchase-history guard does not block honest uncertainty", () => {
    // The corrected wording, and the support guidance that goes with it, must both survive.
    const legitimate = [
      "Whether any multi-file purchase used the earlier ordering is unknown.",
      "No Stripe evidence was obtained, and none is claimed here.",
      "Handle it as a support case: verify the payment in Stripe, then re-issue or refund.",
    ];
    for (const sample of legitimate) {
      for (const pattern of UNEVIDENCED_PURCHASE_HISTORY) {
        expect(pattern.test(sample), `guard is too broad, it blocks: ${sample}`).toBe(false);
      }
    }
  });

  /**
   * The guards above assert an absence, which is the failure mode where a broken regex looks
   * exactly like a clean repository. These are statements that were actually in the tree
   * before this pass; if a pattern stops matching one, the guard has quietly stopped working.
   */
  it("the claim guards actually match the statements they are meant to catch", () => {
    const historical: Array<[RegExp[], string]> = [
      [BROWSER_ONLY_RECOVERY, "If the browser data is gone, so is the result."],
      [BROWSER_ONLY_RECOVERY, "for thirty days, as long as that browser still holds the result."],
      [BROWSER_ONLY_RECOVERY, "but only while your browser still holds the sealed result."],
      [DELETE_ON_DOWNLOAD, "TTL 60 minutes; delete-on-download and an explicit delete control."],
      [DELETE_ON_DOWNLOAD, "and are deleted as soon as the download completes."],
      [
        RECEIPT_AS_RECOVERY,
        "Enter your Stripe receipt number and we will find the conversion for you.",
      ],
      [
        RECEIPT_AS_RECOVERY,
        "Use the payment reference from your card statement to restore the download.",
      ],
      [
        SERVER_SIDE_BYTES,
        "Hard input limits are enforced server-side as well as in the browser: 50 pages and 20 MB per file.",
      ],
    ];

    for (const [patterns, sample] of historical) {
      expect(
        patterns.some((pattern) => pattern.test(sample)),
        `no guard matches a known-bad statement: ${sample}`,
      ).toBe(true);
    }
  });

  /**
   * The opposite risk: a guard so broad it forbids support from asking for the reference it
   * legitimately needs to find a payment in Stripe and issue a refund.
   */
  it("still permits receipt references in support and refund instructions", () => {
    const legitimate = [
      "Send the Stripe receipt number or the payment reference from your card statement.",
      "For a payment or refund question: your Stripe receipt number, together with the date and amount.",
      "We cannot look a purchase up by name or email. Send the receipt number and we will refund it.",
    ];
    for (const sample of legitimate) {
      for (const pattern of RECEIPT_AS_RECOVERY) {
        expect(pattern.test(sample), `guard is too broad, it blocks: ${sample}`).toBe(false);
      }
    }
  });

  /**
   * The 20 MB limit is enforced in the browser and only there, because the original PDF
   * bytes never reach the server. Copy claiming a server-side byte check is false.
   */
  it("does not claim the server enforces the original PDF byte size", () => {
    for (const [path, text] of collectAllClaimSurfaces()) {
      for (const pattern of SERVER_SIDE_BYTES) {
        expect(text, `${path} claims a server-side 20 MB check that cannot exist`).not.toMatch(
          pattern,
        );
      }
    }
  });

  it("does not claim converted files or the recovery link are delivered by email", () => {
    for (const [path, text] of collectAllClaimSurfaces()) {
      for (const pattern of FILE_DELIVERY_BY_EMAIL) {
        expect(
          text,
          `${path} promises email delivery that the product does not provide`,
        ).not.toMatch(pattern);
      }
    }
  });

  it("the email-delivery guard catches the promises it is meant to forbid", () => {
    for (const sample of [
      "We will email your converted files after payment.",
      "Your recovery link will be emailed after checkout.",
    ]) {
      expect(
        FILE_DELIVERY_BY_EMAIL.some((pattern) => pattern.test(sample)),
        `no email-delivery guard matches: ${sample}`,
      ).toBe(true);
    }
  });

  it("does not claim the compact preview has every export column", () => {
    const preview = readFileSync(
      join(process.cwd(), "src", "components", "converter", "preview-table.tsx"),
      "utf8",
    );
    expect(preview).not.toMatch(/same columns as the CSV and the Excel sheet/i);
    expect(preview).toMatch(/exports add Posted Date and reference columns/i);
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
