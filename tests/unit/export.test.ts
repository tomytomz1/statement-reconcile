import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildCsv, CSV_COLUMNS } from "@/lib/export/csv";
import { exportFilename, safeFilename } from "@/lib/export/filename";
import { csvRow, neutralizeFormula, safeSheetName } from "@/lib/export/sanitize";
import { buildXlsx } from "@/lib/export/xlsx";
import { reconcile } from "@/lib/reconciliation";
import { withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";

/**
 * Export tests.
 *
 * The export is the artefact the customer paid for, so these tests care about two things that
 * are easy to get wrong and expensive to get wrong: the file must not be able to execute
 * anything when it is opened, and the numbers in it must be the numbers that were verified.
 */

type StatementOverrides = Partial<Parameters<typeof withStatementDefaults>[0]>;

function statement(overrides: StatementOverrides = {}): NormalizedStatement {
  return withStatementDefaults({
    statementType: "checking",
    currency: "USD",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    openingBalance: "1000.00",
    closingBalance: "1150.50",
    transactions: [
      { date: "2026-03-02", description: "Payroll deposit", amount: "2500.00", credit: "2500.00" },
      { date: "2026-03-05", description: "Rent", amount: "-1800.00", debit: "1800.00" },
      {
        date: "2026-03-19",
        description: "Grocery store",
        amount: "-549.50",
        debit: "549.50",
        runningBalance: "1150.50",
      },
    ],
    extractionWarnings: [],
    ...overrides,
  });
}

describe("formula neutralisation", () => {
  it("prefixes every character a spreadsheet would treat as a formula", () => {
    for (const dangerous of ["=1+1", "+1", "-1", "@SUM(A1)", "\t=cmd", "\r=cmd"]) {
      expect(neutralizeFormula(dangerous).startsWith("'")).toBe(true);
    }
  });

  it("leaves ordinary descriptions untouched", () => {
    for (const safe of ["Grocery store", "ACME Ltd. #4821", "Refund (partial)", "3 for 2 offer"]) {
      expect(neutralizeFormula(safe)).toBe(safe);
    }
  });

  it("neutralises the DDE payload form, which is the dangerous one", () => {
    // `=cmd|' /C calc'!A0` is the classic command-execution vector in Excel.
    const attack = `=cmd|' /C calc'!A0`;
    expect(neutralizeFormula(attack)).toBe(`'${attack}`);
  });

  it("does not double-prefix an already neutralised value", () => {
    const once = neutralizeFormula("=1+1");
    expect(neutralizeFormula(once)).toBe(once);
  });
});

describe("CSV construction", () => {
  it("writes the documented header in the documented order", () => {
    const csv = buildCsv(statement(), { bom: false });
    expect(csv.split("\r\n")[0]).toBe(CSV_COLUMNS.map((column) => `"${column}"`).join(","));
  });

  it("emits CRLF line endings and a trailing newline, as RFC 4180 requires", () => {
    const csv = buildCsv(statement(), { bom: false });
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n").filter((line) => line !== "")).toHaveLength(4);
  });

  it("includes a UTF-8 BOM by default so Excel on Windows reads it as UTF-8", () => {
    expect(buildCsv(statement()).charCodeAt(0)).toBe(0xfeff);
    expect(buildCsv(statement(), { bom: false }).charCodeAt(0)).not.toBe(0xfeff);
  });

  it("escapes a description containing a comma and a quote, and cannot break the row", () => {
    const csv = buildCsv(
      statement({
        transactions: [
          {
            date: "2026-03-02",
            description: 'ACME, "the" store\nsecond line',
            amount: "-10.00",
            debit: "10.00",
          },
        ],
      }),
      { bom: false },
    );
    const body = csv.split("\r\n")[1] ?? "";
    expect(body).toContain('"ACME, ""the"" store second line"');
    // A newline inside a description is collapsed to a space rather than being carried into
    // the file, so no reader can mistake it for the start of a new record.
    expect(csv.split("\r\n").filter((line) => line !== "")).toHaveLength(2);
  });

  it("neutralises a formula in the description column", () => {
    const csv = buildCsv(
      statement({
        transactions: [
          {
            date: "2026-03-02",
            description: '=HYPERLINK("http://x")',
            amount: "-1.00",
            debit: "1.00",
          },
        ],
      }),
      { bom: false },
    );
    expect(csv).toContain("'=HYPERLINK");
  });

  it("writes blank cells rather than omitting columns when a field is absent", () => {
    const csv = buildCsv(
      statement({
        transactions: [{ date: "2026-03-02", description: "Fee", amount: "-3.00" }],
      }),
      { bom: false },
    );
    const cells = (csv.split("\r\n")[1] ?? "").split(",");
    expect(cells).toHaveLength(CSV_COLUMNS.length);
  });

  it("preserves the exact canonical amount, never a rounded float", () => {
    const csv = buildCsv(
      statement({
        transactions: [{ date: "2026-03-02", description: "Odd cents", amount: "-0.07" }],
      }),
      { bom: false },
    );
    expect(csv).toContain("-0.07");
  });
});

describe("csvRow", () => {
  it("quotes every field unconditionally, so delimiter detection cannot shift a column", () => {
    expect(csvRow(["a", "b", "c"])).toBe('"a","b","c"');
  });

  it("doubles an embedded quote rather than escaping it with a backslash", () => {
    expect(csvRow(['a"b'])).toBe('"a""b"');
  });
});

describe("XLSX construction", () => {
  it("produces a four-sheet workbook with numeric amounts and no formulas", async () => {
    const source = statement();
    const bytes = await buildXlsx(source, {
      reconciliation: reconcile(source),
      generatedAt: new Date("2026-03-31T00:00:00Z"),
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Transactions",
      "Statement Summary",
      "Verification",
      "Source references",
    ]);

    const sheet = workbook.getWorksheet("Transactions");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe("Date");
    // Amounts must be real numbers so the customer can sum them immediately.
    expect(typeof sheet?.getRow(2).getCell(6).value).toBe("number");
    expect(sheet?.getRow(2).getCell(6).value).toBe(2500);

    // Nothing anywhere in the workbook may be a formula.
    for (const worksheet of workbook.worksheets) {
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
        });
      });
    }
  });

  it("records the reconciliation verdict on the summary sheet", async () => {
    const source = statement();
    const result = reconcile(source);
    const bytes = await buildXlsx(source, { reconciliation: result });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
    const summary = workbook.getWorksheet("Statement Summary");

    const values: string[] = [];
    summary?.eachRow((row) => {
      row.eachCell((cell) => values.push(String(cell.value ?? "")));
    });

    expect(values).toContain("Reconciliation result");
    expect(values).toContain(result.passed ? "Passed" : "Not verified");
    expect(values).toContain("Reconciliation method");
  });

  it("neutralises a formula in a description before it reaches a cell", async () => {
    const source = statement({
      transactions: [{ date: "2026-03-02", description: "=1+1", amount: "-1.00", debit: "1.00" }],
    });
    const bytes = await buildXlsx(source, { reconciliation: reconcile(source) });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
    const cell = workbook.getWorksheet("Transactions")?.getRow(2).getCell(3);
    expect(cell?.type).not.toBe(ExcelJS.ValueType.Formula);
    expect(String(cell?.value)).toBe("'=1+1");
  });

  it("handles a statement with no transactions without producing a broken autofilter", async () => {
    const source = statement({ transactions: [], closingBalance: "1000.00" });
    const bytes = await buildXlsx(source, { reconciliation: reconcile(source) });
    const workbook = new ExcelJS.Workbook();
    await expect(
      workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer),
    ).resolves.toBeDefined();
  });
});

describe("sheet names", () => {
  it("strips the characters Excel forbids and respects the 31-character limit", () => {
    expect(safeSheetName("A/B\\C?D*E[F]", "fallback")).not.toMatch(/[/\\?*[\]]/);
    expect(safeSheetName("x".repeat(60), "fallback").length).toBeLessThanOrEqual(31);
    expect(safeSheetName("", "fallback")).toBe("fallback");
  });
});

describe("download filenames", () => {
  it("never echoes the customer's own filename", () => {
    const name = exportFilename(statement(), "xlsx");
    expect(name).toBe("statement-checking-2026-03-01_2026-03-31.xlsx");
  });

  it("labels a credit-card statement readably", () => {
    const name = exportFilename(statement({ statementType: "credit_card" }), "csv");
    expect(name.startsWith("statement-credit-card")).toBe(true);
  });

  it("works when the statement has no period", () => {
    const bare = statement();
    delete bare.periodStart;
    delete bare.periodEnd;
    expect(exportFilename(bare, "csv")).toBe("statement-checking.csv");
  });

  it("cannot produce a filename that escapes a quoted header or traverses a path", () => {
    for (const nasty of ["../../etc/passwd", 'a"; rm -rf /', "a\r\nX-Injected: 1", "  "]) {
      const safe = safeFilename(nasty);
      expect(safe).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(safe).not.toContain("..");
    }
  });
});
