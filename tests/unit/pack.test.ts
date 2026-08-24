import { describe, expect, it } from "vitest";

import { assemblePack, packFileId } from "@/lib/schema/assemble-pack";
import { packDigest } from "@/lib/schema/pack";
import { emptyCompleteness, withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { seal } from "@/lib/crypto/seal";
import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";

function passedStatement(overrides: Partial<NormalizedStatement> = {}): NormalizedStatement {
  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    openingBalance: "100.00",
    closingBalance: "90.00",
    transactions: [
      {
        date: "2026-03-02",
        description: "Coffee",
        amount: "-10.00",
        debit: "10.00",
      },
    ],
    extractionWarnings: [],
    verificationState: "verification_passed",
    ...overrides,
  });
}

describe("conversion pack", () => {
  it("assigns a 16-hex file id from the job id", () => {
    const id = packFileId("a".repeat(32), 0);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(packFileId("a".repeat(32), 1)).not.toBe(id);
  });

  it("refuses to include a file that is not verification_passed", async () => {
    const rejected = passedStatement({ verificationState: "verification_rejected" });
    await expect(
      assemblePack([{ fileId: "aaaaaaaaaaaaaaaa", statement: rejected, pageCount: 1 }]),
    ).rejects.toThrow(/verification/i);
  });

  it("changes the pack digest when the included file set changes", async () => {
    const first = passedStatement();
    const second = passedStatement({ periodEnd: "2026-04-30", closingBalance: "90.00" });
    const one = await assemblePack([
      { fileId: "aaaaaaaaaaaaaaaa", statement: first, pageCount: 1 },
    ]);
    const two = await assemblePack([
      { fileId: "aaaaaaaaaaaaaaaa", statement: first, pageCount: 1 },
      { fileId: "bbbbbbbbbbbbbbbb", statement: second, pageCount: 1 },
    ]);
    expect(one.digest).not.toBe(two.digest);
    expect(one.digest).toBe(await packDigest(one.manifest));
    expect(two.manifest.fileCount).toBe(2);
    expect(two.manifest.totalPages).toBe(2);
  });

  it("uses content-stable file ids so an exact re-upload recreates the paid digest", async () => {
    const statement = passedStatement();
    const first = await assemblePack([{ fileId: "aaaaaaaaaaaaaaaa", statement, pageCount: 1 }]);
    const reupload = await assemblePack([{ fileId: "bbbbbbbbbbbbbbbb", statement, pageCount: 1 }]);
    expect(reupload.digest).toBe(first.digest);
    expect(reupload.manifest.files[0]?.fileId).toBe(first.manifest.files[0]?.fileId);
  });

  it("refuses a client page count that disagrees with verified completeness", async () => {
    await expect(
      assemblePack([{ fileId: "aaaaaaaaaaaaaaaa", statement: passedStatement(), pageCount: 50 }]),
    ).rejects.toThrow(/page count/i);
  });

  it("opens a sealed pack only when the claimed digest matches and every file still passes", async () => {
    const statement = passedStatement();
    const assembled = await assemblePack([{ fileId: "aaaaaaaaaaaaaaaa", statement, pageCount: 1 }]);
    const opened = await openSealedResult(assembled.sealed, assembled.digest);
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.kind).toBe("pack");
      expect(opened.files).toHaveLength(1);
      expect(opened.statement.verificationState).toBe("verification_passed");
    }

    const mismatch = await openSealedResult(assembled.sealed, "b".repeat(64));
    expect(mismatch.ok).toBe(false);
  });

  it("refuses a legacy sealed statement that fails completeness", async () => {
    const statement = passedStatement({
      completeness: {
        ...emptyCompleteness(1, 1),
        passed: false,
        truncated: true,
        rejectionCodes: ["truncated"],
      },
    });
    const { digest } = await canonicalizeAndDigest(statement);
    const sealed = await seal(JSON.stringify(statement), digest);
    const opened = await openSealedResult(sealed, digest);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.reason).toBe("not_reconciled");
  });
});
