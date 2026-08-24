import { buildCsv } from "@/lib/export/csv";
import {
  CONTENT_TYPES,
  exportFilename,
  manifestFilename,
  packZipFilename,
  type ExportFormat,
} from "@/lib/export/filename";
import { buildPackManifestJson } from "@/lib/export/manifest";
import { buildVerificationPdf } from "@/lib/export/verification-pdf";
import { buildXlsx } from "@/lib/export/xlsx";
import { buildZip } from "@/lib/export/zip";
import type { OpenSealedSuccess } from "@/lib/payments/open-sealed-result";

export type DeliveredExport = {
  body: Uint8Array | string;
  contentType: string;
  filename: string;
};

export async function deliverExport(
  opened: OpenSealedSuccess,
  format: ExportFormat,
  generatedAt = new Date(),
): Promise<DeliveredExport> {
  if (format === "manifest") {
    const manifest = opened.manifest ?? {
      schemaVersion: 2 as const,
      manifestVersion: 1 as const,
      productVersion: opened.statement.extractorVersion,
      fileCount: opened.files.length,
      totalPages: opened.files.reduce((sum, file) => sum + file.pageCount, 0),
      files: opened.files.map((file) => ({
        fileId: file.fileId,
        resultDigest: file.resultDigest,
        pageCount: file.pageCount,
        transactionCount: file.statement.transactions.length,
        verificationState: "verification_passed" as const,
        statementType: file.statement.statementType,
      })),
    };
    return {
      body: buildPackManifestJson(
        manifest,
        opened.packDigest ?? opened.files[0]?.resultDigest ?? "",
      ),
      contentType: CONTENT_TYPES.manifest,
      filename: manifestFilename(),
    };
  }

  if (opened.files.length === 1) {
    const file = opened.files[0]!;
    return deliverOne(file.statement, file.reconciliation, file.resultDigest, format, generatedAt);
  }

  const entries = [];
  for (const [index, file] of opened.files.entries()) {
    const one = await deliverOne(
      file.statement,
      file.reconciliation,
      file.resultDigest,
      format,
      generatedAt,
      index,
    );
    const bytes = typeof one.body === "string" ? new TextEncoder().encode(one.body) : one.body;
    entries.push({ name: one.filename, data: bytes });
  }

  return {
    body: buildZip(entries),
    contentType: CONTENT_TYPES.zip,
    filename: packZipFilename(format),
  };
}

async function deliverOne(
  statement: OpenSealedSuccess["statement"],
  reconciliation: OpenSealedSuccess["reconciliation"],
  resultDigest: string,
  format: Exclude<ExportFormat, "manifest">,
  generatedAt: Date,
  index?: number,
): Promise<DeliveredExport> {
  if (format === "csv") {
    return {
      body: buildCsv(statement),
      contentType: CONTENT_TYPES.csv,
      filename: exportFilename(statement, "csv", index),
    };
  }
  if (format === "xlsx") {
    return {
      body: await buildXlsx(statement, { reconciliation, generatedAt }),
      contentType: CONTENT_TYPES.xlsx,
      filename: exportFilename(statement, "xlsx", index),
    };
  }
  return {
    body: buildVerificationPdf(statement, {
      reconciliation,
      resultDigest,
      generatedAt,
    }),
    contentType: CONTENT_TYPES.report,
    filename: exportFilename(statement, "report", index),
  };
}
