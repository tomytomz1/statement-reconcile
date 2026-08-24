import ExcelJS from "exceljs";

import { siteConfig } from "@/config/site";
import { currencyScale } from "@/lib/money/decimal";
import { summarize } from "@/lib/reconciliation";
import type { NormalizedStatement, ReconciliationResult } from "@/lib/schema/statement";

import { neutralizeFormula, safeSheetName } from "./sanitize";

/**
 * XLSX export.
 *
 * Sheets: transactions, statement summary, verification, and source references. No
 * macros, no external links, no embedded objects, no embedded PDF, and no formulas —
 * every numeric cell holds a literal value. Amounts are written as numbers so the
 * customer can sum them, from the canonical decimal string, with a number format matching
 * the currency's scale.
 */

const HEADERS = [
  { header: "Date", key: "date", width: 12 },
  { header: "Posted Date", key: "postedDate", width: 13 },
  { header: "Description", key: "description", width: 52 },
  { header: "Debit", key: "debit", width: 14 },
  { header: "Credit", key: "credit", width: 14 },
  { header: "Amount", key: "amount", width: 14 },
  { header: "Balance", key: "balance", width: 16 },
  { header: "Transaction ID", key: "id", width: 28 },
  { header: "Source page", key: "sourcePage", width: 14 },
] as const;

export type XlsxOptions = {
  reconciliation: ReconciliationResult;
  /** Injected so exports are reproducible in tests. */
  generatedAt?: Date;
};

export async function buildXlsx(
  statement: NormalizedStatement,
  options: XlsxOptions,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = siteConfig.brandName;
  workbook.created = options.generatedAt ?? new Date();
  workbook.calcProperties.fullCalcOnLoad = false;

  const numberFormat = formatForScale(currencyScale(statement.currency));

  const sheet = workbook.addWorksheet(safeSheetName("Transactions", "Transactions"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = HEADERS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 20;

  for (const transaction of statement.transactions) {
    const row = sheet.addRow({
      date: transaction.date,
      postedDate: transaction.postedDate ?? "",
      description: neutralizeFormula(transaction.description),
      debit: numberOrBlank(transaction.debit),
      credit: numberOrBlank(transaction.credit),
      amount: Number(transaction.amount),
      balance: numberOrBlank(transaction.runningBalance),
      id: neutralizeFormula(transaction.id),
      sourcePage: transaction.sourcePage ?? transaction.sourceRegions[0]?.page ?? "",
    });
    for (const key of ["debit", "credit", "amount", "balance"] as const) {
      row.getCell(key).numFmt = numberFormat;
    }
    row.getCell("description").alignment = { wrapText: false };
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, statement.transactions.length + 1), column: HEADERS.length },
  };

  addSummarySheet(workbook, statement, options, numberFormat);
  addVerificationSheet(workbook, statement, options);
  addSourceSheet(workbook, statement);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  statement: NormalizedStatement,
  options: XlsxOptions,
  numberFormat: string,
): void {
  const summary = summarize(statement);
  const sheet = workbook.addWorksheet(safeSheetName("Statement Summary", "Summary"));
  sheet.columns = [
    { header: "Field", key: "field", width: 34 },
    { header: "Value", key: "value", width: 46 },
  ];
  sheet.getRow(1).font = { bold: true };

  const numeric = new Set<number>();
  const rows: Array<[string, string | number]> = [
    ["Statement type", readableType(statement.statementType)],
    ["Currency", statement.currency],
    ["Statement period start", statement.periodStart ?? "not stated"],
    ["Statement period end", statement.periodEnd ?? "not stated"],
    ["Opening balance", statement.openingBalance ? Number(statement.openingBalance) : "not stated"],
    ["Total credits / payments in", Number(summary.totalCredits)],
    ["Total debits / charges out", Number(summary.totalDebits)],
    ["Fees", summary.totalFees ? Number(summary.totalFees) : "none identified"],
    ["Interest", summary.totalInterest ? Number(summary.totalInterest) : "none identified"],
    ["Net change", Number(summary.netChange)],
    ["Closing balance", statement.closingBalance ? Number(statement.closingBalance) : "not stated"],
    ["Transaction count", summary.transactionCount],
    ["Reconciliation method", options.reconciliation.methodLabel],
    ["Reconciliation equation", options.reconciliation.equation ?? "not applicable"],
    ["Reconciliation result", options.reconciliation.passed ? "Passed" : "Not verified"],
    ["Expected closing balance", options.reconciliation.expectedClosingBalance ?? "not applicable"],
    ["Difference", options.reconciliation.difference ?? "not applicable"],
    ["Verification state", statement.verificationState],
    [
      "Source-mapped rows",
      `${statement.completeness.sourceMappedRows} / ${statement.completeness.acceptedRows}`,
    ],
    ["Produced by", `${siteConfig.brandName} ${siteConfig.productVersion}`],
    ["Generated", (options.generatedAt ?? new Date()).toISOString()],
  ];

  for (const [field, value] of rows) {
    const row = sheet.addRow({
      field,
      value: typeof value === "number" ? value : neutralizeFormula(String(value)),
    });
    if (typeof value === "number") {
      numeric.add(row.number);
      row.getCell("value").numFmt =
        Number.isInteger(value) && field === "Transaction count" ? "0" : numberFormat;
    }
  }

  sheet.addRow({});
  const checksHeader = sheet.addRow({ field: "Checks performed", value: "" });
  checksHeader.font = { bold: true };
  for (const check of options.reconciliation.checks) {
    const status = check.passed ? "passed" : check.advisory ? "note" : "failed";
    const detail =
      check.expected !== undefined || check.actual !== undefined
        ? ` (expected ${check.expected ?? "—"}, found ${check.actual ?? "—"})`
        : "";
    sheet.addRow({
      field: neutralizeFormula(check.label),
      value: neutralizeFormula(`${status}${detail}`),
    });
  }
}

function addVerificationSheet(
  workbook: ExcelJS.Workbook,
  statement: NormalizedStatement,
  options: XlsxOptions,
): void {
  const sheet = workbook.addWorksheet(safeSheetName("Verification", "Verification"));
  sheet.columns = [
    { header: "Check", key: "check", width: 36 },
    { header: "Result", key: "result", width: 64 },
  ];
  sheet.getRow(1).font = { bold: true };

  const running = statement.runningBalanceSummary;
  const material = statement.ambiguities.filter(
    (finding) => finding.material && finding.resolution === "unresolved",
  ).length;
  const rows: Array<[string, string]> = [
    ["Verification state", statement.verificationState],
    ["Schema version", String(statement.schemaVersion)],
    ["Extractor version", statement.extractorVersion],
    ["Extraction path", statement.extractionPath],
    [
      "Pages processed",
      `${statement.completeness.pagesIncludedInParse} / ${statement.completeness.pagesDeclared}`,
    ],
    [
      "Rows traced to source",
      `${statement.completeness.sourceMappedRows} / ${statement.completeness.acceptedRows}`,
    ],
    [
      "Running-balance transitions",
      running.applicable
        ? `${running.transitionsPassed} / ${running.transitionsChecked} passed`
        : "not_applicable",
    ],
    ["Material unresolved ambiguities", String(material)],
    ["Completeness", statement.completeness.passed ? "passed" : "failed"],
    ["Aggregate reconciliation", options.reconciliation.passed ? "passed" : "failed"],
    [
      "Disclaimer",
      "Verifies extraction and arithmetic checks only. Not authenticity, not an audit opinion, not bank approval.",
    ],
  ];
  for (const [check, result] of rows) {
    sheet.addRow({ check, result: neutralizeFormula(result) });
  }
}

function addSourceSheet(workbook: ExcelJS.Workbook, statement: NormalizedStatement): void {
  const sheet = workbook.addWorksheet(safeSheetName("Source references", "Source refs"));
  sheet.columns = [
    { header: "Transaction ID", key: "id", width: 28 },
    { header: "Field", key: "field", width: 16 },
    { header: "Page", key: "page", width: 10 },
    { header: "Raw source text", key: "raw", width: 60 },
    { header: "Normalized", key: "normalized", width: 22 },
    { header: "Status", key: "status", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const transaction of statement.transactions) {
    for (const field of transaction.fieldProvenance) {
      const region = field.sourceRegions[0];
      sheet.addRow({
        id: neutralizeFormula(transaction.id),
        field: field.field,
        page: region?.page ?? "",
        raw: neutralizeFormula((region?.rawText ?? transaction.rawSourceText).slice(0, 500)),
        normalized: neutralizeFormula(field.normalizedValue ?? ""),
        status: field.status,
      });
    }
  }
}

function numberOrBlank(value: string | undefined): number | string {
  return value === undefined ? "" : Number(value);
}

function formatForScale(scale: number): string {
  if (scale === 0) return "#,##0";
  return `#,##0.${"0".repeat(scale)}`;
}

function readableType(type: NormalizedStatement["statementType"]): string {
  switch (type) {
    case "checking":
      return "Checking / current account";
    case "savings":
      return "Savings account";
    case "credit_card":
      return "Credit card";
    default:
      return "Not determined";
  }
}
