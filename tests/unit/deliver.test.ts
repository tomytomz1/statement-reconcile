import { describe, expect, it } from "vitest";

import { buildVerificationPdf, VERIFICATION_DISCLAIMER } from "@/lib/export/verification-pdf";
import { deliverExport } from "@/lib/export/deliver";
import { reconcile } from "@/lib/reconciliation";
import { withStatementDefaults } from "@/lib/schema/build";
import { assemblePack } from "@/lib/schema/assemble-pack";
import { canonicalizeAndDigest } from "@/lib/extraction/canonicalize";

function statement() {
  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    openingBalance: "100.00",
    closingBalance: "90.00",
    transactions: [{ date: "2026-03-02", description: "Coffee", amount: "-10.00", debit: "10.00" }],
    extractionWarnings: [],
    verificationState: "verification_passed",
  });
}

describe("verification PDF and pack deliverables", () => {
  it("writes a PDF that includes the scope disclaimer and digest", async () => {
    const source = statement();
    const { digest } = await canonicalizeAndDigest(source);
    const bytes = buildVerificationPdf(source, {
      reconciliation: reconcile(source),
      resultDigest: digest,
      generatedAt: new Date("2026-03-31T00:00:00Z"),
    });
    expect(bytes.subarray(0, 5)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]));
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text).toContain("authentic");
    expect(text).toContain(digest.slice(0, 16));
    expect(VERIFICATION_DISCLAIMER.toLowerCase()).toContain("audit opinion");
  });

  it("delivers csv, xlsx, report, and pack-manifest for a verified pack", async () => {
    const source = statement();
    const assembled = await assemblePack([
      { fileId: "aaaaaaaaaaaaaaaa", statement: source, pageCount: 1 },
    ]);
    const opened = {
      ok: true as const,
      kind: "pack" as const,
      statement: assembled.envelope.files[0]!.statement,
      reconciliation: reconcile(source),
      files: [
        {
          fileId: "aaaaaaaaaaaaaaaa",
          statement: assembled.envelope.files[0]!.statement,
          reconciliation: reconcile(source),
          resultDigest: assembled.manifest.files[0]!.resultDigest,
          pageCount: 1,
        },
      ],
      manifest: assembled.manifest,
      packDigest: assembled.digest,
    };

    const csv = await deliverExport(opened, "csv");
    expect(csv.filename.endsWith(".csv")).toBe(true);
    expect(String(csv.body)).toContain("Coffee");

    const xlsx = await deliverExport(opened, "xlsx");
    expect(xlsx.filename.endsWith(".xlsx")).toBe(true);
    expect(xlsx.body).toBeInstanceOf(Uint8Array);

    const report = await deliverExport(opened, "report");
    expect(report.filename).toContain("verification-report");
    expect(report.contentType).toBe("application/pdf");

    const manifest = await deliverExport(opened, "manifest");
    expect(manifest.filename).toBe("pack-manifest.json");
    expect(String(manifest.body)).toContain(assembled.digest);
  });
});
