import { describe, expect, it } from "vitest";

import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";
import { withProvenance, withStatementDefaults } from "@/lib/schema/build";
import { evaluateCompleteness } from "@/lib/verification/completeness";
import { evaluateVerificationGate } from "@/lib/verification/gate";
import { evaluateRunningBalances } from "@/lib/verification/running-balance";
import { pageFingerprint } from "@/lib/verification/fingerprint";
import type { ExtractedPdfText } from "@/lib/extraction/types";

function item(
  id: string,
  t: string,
  x: number,
  y: number,
): ExtractedPdfText["pages"][number]["items"][number] {
  return { id, t, x, y, w: 40, h: 10 };
}

function document(pages: ExtractedPdfText["pages"]): ExtractedPdfText {
  return { pageCount: pages.length, pages };
}

function checkingWithRunningBalances(opts?: { breakAt?: number; skipBalanceOn?: number }) {
  const rows = [
    { date: "2024-03-02", description: "PAYROLL", amount: "500.00", balance: "1500.00" },
    { date: "2024-03-10", description: "GROCERIES", amount: "-250.00", balance: "1250.00" },
    { date: "2024-03-20", description: "RENT", amount: "-100.00", balance: "1150.00" },
  ];
  if (opts?.breakAt === 1) rows[1] = { ...rows[1]!, balance: "1260.00" };

  const transactions = rows.map((row, index) =>
    withProvenance(
      {
        date: row.date,
        description: row.description,
        amount: row.amount,
        runningBalance: opts?.skipBalanceOn === index ? undefined : row.balance,
        categoryHint: row.amount.startsWith("-") ? "debit" : "credit",
        sourcePage: 1,
      },
      index,
    ),
  );

  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2024-03-01",
    periodEnd: "2024-03-31",
    openingBalance: "1000.00",
    closingBalance: "1150.00",
    transactions,
    extractionWarnings: [],
  });
}

describe("running-balance transitions", () => {
  it("passes every transition when the printed chain is consistent", () => {
    const result = evaluateRunningBalances(checkingWithRunningBalances());
    expect(result.applicable).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.transitionsChecked).toBe(3);
    expect(result.transitionsPassed).toBe(3);
  });

  it("fails the exact first broken transition even if opening-to-closing still nets", () => {
    const statement = checkingWithRunningBalances({ breakAt: 1 });
    const result = evaluateRunningBalances(statement);
    expect(result.passed).toBe(false);
    expect(result.firstFailureIndex).toBe(1);
    expect(result.firstFailureDifference).not.toBe("0.00");
  });

  it("rejects partial running-balance coverage instead of marking it not_applicable", () => {
    const result = evaluateRunningBalances(checkingWithRunningBalances({ skipBalanceOn: 2 }));
    expect(result.applicable).toBe(true);
    expect(result.passed).toBe(false);
  });
});

describe("completeness", () => {
  it("fails when a declared page is missing from the payload", () => {
    const extracted = document([
      { page: 1, width: 612, height: 792, items: [item("p1i0", "Opening Balance 100.00", 36, 40)] },
    ]);
    extracted.pageCount = 2;
    const report = evaluateCompleteness({
      document: extracted,
      acceptedRows: 1,
      sourceMappedRows: 1,
      unresolvedCandidateRows: 0,
      transactionSectionCount: 1,
      mixedAccount: false,
      truncated: false,
      timedOut: false,
      pagesWithCandidateRows: new Set([1]),
    });
    expect(report.passed).toBe(false);
    expect(report.rejectionCodes).toContain("pages_unopened");
  });

  it("detects identical content on different page numbers", () => {
    const first = {
      page: 1,
      width: 612,
      height: 792,
      items: [item("row", "03/02 Coffee 10.00", 36, 120)],
    };
    expect(pageFingerprint({ ...first, page: 2 })).toBe(pageFingerprint(first));
  });

  it("does not silently classify an empty page as informational", () => {
    const extracted = document([
      { page: 1, width: 612, height: 792, items: [item("p1", "03/02 Coffee 10.00", 36, 120)] },
      { page: 2, width: 612, height: 792, items: [] },
    ]);
    const report = evaluateCompleteness({
      document: extracted,
      acceptedRows: 1,
      sourceMappedRows: 1,
      unresolvedCandidateRows: 0,
      transactionSectionCount: 1,
      mixedAccount: false,
      truncated: false,
      timedOut: false,
      pagesWithCandidateRows: new Set([1]),
    });
    expect(report.passed).toBe(false);
    expect(report.rejectionCodes).toContain("unprocessed_page");
  });

  it("fails on truncation and unmapped rows", () => {
    const extracted = document([
      {
        page: 1,
        width: 612,
        height: 792,
        items: Array.from({ length: 20 }, (_, index) =>
          item(`p1i${index}`, `Row ${index}`, 36, 40 + index * 12),
        ),
      },
    ]);
    const report = evaluateCompleteness({
      document: extracted,
      acceptedRows: 3,
      sourceMappedRows: 2,
      unresolvedCandidateRows: 1,
      transactionSectionCount: 1,
      mixedAccount: false,
      truncated: true,
      timedOut: false,
      pagesWithCandidateRows: new Set([1]),
    });
    expect(report.passed).toBe(false);
    expect(report.rejectionCodes).toEqual(
      expect.arrayContaining(["truncated", "unmapped_rows", "unresolved_rows"]),
    );
  });
});

describe("verification gate", () => {
  it("blocks payment when a row has no source regions", async () => {
    const statement = checkingWithRunningBalances();
    const unmapped = {
      ...statement,
      transactions: statement.transactions.map((row, index) =>
        index === 0 ? { ...row, sourceRegions: [] } : row,
      ),
    };
    const gated = evaluateVerificationGate({
      statement: unmapped,
      completeness: unmapped.completeness,
      ambiguities: [],
    });
    expect(gated.result.passed).toBe(false);
    expect(gated.statement.verificationState).toBe("verification_rejected");
  });

  it("includes provenance in the canonical digest", async () => {
    const statement = checkingWithRunningBalances();
    const baseline = await canonicalizeAndDigest(statement);
    const changed = await canonicalizeAndDigest({
      ...statement,
      transactions: statement.transactions.map((row, index) =>
        index === 0
          ? {
              ...row,
              sourceRegions: row.sourceRegions.map((region) => ({
                ...region,
                rawText: `${region.rawText} TAMPER`,
              })),
            }
          : row,
      ),
    });
    expect(changed.digest).not.toBe(baseline.digest);
  });

  it("blocks a row whose material amount field is not traced", () => {
    const statement = checkingWithRunningBalances();
    const broken = {
      ...statement,
      transactions: statement.transactions.map((row, index) =>
        index === 0
          ? {
              ...row,
              fieldProvenance: row.fieldProvenance.filter((field) => field.field !== "amount"),
            }
          : row,
      ),
    };
    const gated = evaluateVerificationGate({
      statement: broken,
      completeness: broken.completeness,
      ambiguities: [],
    });
    expect(gated.result.passed).toBe(false);
    expect(gated.result.materialAmbiguities).toBeGreaterThan(0);
    expect(gated.statement.transactions[0]?.verification.sourceStatus).toBe("failed");
  });

  it("blocks two accepted rows that claim the same source items", () => {
    const statement = checkingWithRunningBalances();
    const shared = statement.transactions[0]?.sourceRegions;
    const duplicatedEvidence = {
      ...statement,
      transactions: statement.transactions.map((row, index) =>
        index === 1 && shared ? { ...row, sourceRegions: shared } : row,
      ),
    };
    const gated = evaluateVerificationGate({
      statement: duplicatedEvidence,
      completeness: duplicatedEvidence.completeness,
      ambiguities: [],
    });
    expect(gated.result.passed).toBe(false);
    expect(gated.statement.ambiguities.some((item) => item.code === "duplicate_row")).toBe(true);
  });
});
