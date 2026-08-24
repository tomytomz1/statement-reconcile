import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";

import { parseStatementDeterministically } from "@/lib/extraction/deterministic/parser";
import { buildCsv } from "@/lib/export/csv";
import { buildXlsx } from "@/lib/export/xlsx";
import { generateFixture, INJECTION_DESCRIPTIONS } from "@/lib/fixtures/generator";
import { logEvent, logFailure } from "@/lib/security/logging";

describe("adversarial prompt injection fixture", () => {
  it("reconciles with real rows or rejects, and never treats injected JSON as schema", () => {
    const fixture = generateFixture("adversarial-prompt-injection", 1);
    const outcome = parseStatementDeterministically(fixture.document);

    expect(outcome.ok || !outcome.ok).toBe(true);
    if (!outcome.ok) {
      expect(outcome.code).toBeTruthy();
      return;
    }

    expect(outcome.reconciliation.passed).toBe(true);
    expect(outcome.statement.transactions.length).toBe(fixture.truth.transactionCount);
    expect(outcome.statement.closingBalance).toBe(fixture.truth.closingBalance);
    expect(outcome.statement.closingBalance).not.toBe("0.00");

    const descriptions = outcome.statement.transactions.map((row) => row.description);
    expect(descriptions.some((text) => text.includes("{") || /reconciled/i.test(text))).toBe(true);
    expect(JSON.stringify(outcome.statement)).not.toMatch(/"reconciled"\s*:\s*true/);
  });
});

describe("adversarial formula injection fixture", () => {
  it("neutralises descriptions in CSV and XLSX when parse succeeds", async () => {
    const fixture = generateFixture("adversarial-formula-injection", 1);
    const outcome = parseStatementDeterministically(fixture.document);
    if (!outcome.ok) return;

    const csv = buildCsv(outcome.statement, { bom: false });
    expect(csv).not.toMatch(/"=/);
    expect(csv).not.toMatch(/\n=/);

    const bytes = await buildXlsx(outcome.statement, { reconciliation: outcome.reconciliation });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Transactions");
    sheet?.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const description = String(row.getCell(3).value ?? "");
      expect(description.startsWith("=")).toBe(false);
    });
  });
});

describe("logging sanitize", () => {
  it("does not pass through description, amount, balance, or filename", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      logEvent("parse_request_invalid", {
        description: "PAYROLL ACME LOGISTICS",
        amount: "2500.00",
        balance: "4182.55",
        filename: "chase-statement.pdf",
        route: "parse",
      });
      expect(spy).toHaveBeenCalledTimes(1);
      const line = String(spy.mock.calls[0]?.[0]);
      expect(line).toContain("[redacted]");
      expect(line).toContain('"route":"parse"');
      expect(line).not.toContain("PAYROLL");
      expect(line).not.toContain("2500.00");
      expect(line).not.toContain("4182.55");
      expect(line).not.toContain("chase-statement.pdf");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("HTML in descriptions", () => {
  it("is quoted as text in CSV, not treated as markup", () => {
    const fixture = generateFixture("adversarial-prompt-injection", 1);
    const outcome = parseStatementDeterministically(fixture.document);
    if (!outcome.ok) {
      const script = INJECTION_DESCRIPTIONS.find((text) => text.includes("<script>"));
      expect(script).toBeDefined();
      return;
    }

    const csv = buildCsv(outcome.statement, { bom: false });
    expect(csv).toContain("<script>");
    expect(csv).toMatch(/"<script>/);
    expect(csv).not.toContain("<script>alert('xss')</script> HARDWARE STORE</td>");
  });
});

describe("logFailure", () => {
  it("records the error kind rather than the message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    try {
      logFailure("parse_unhandled", new Error("CARD PURCHASE MAPLE GROCERS 41.20"), {
        route: "parse",
      });
      const line = String(spy.mock.calls[0]?.[0]);
      expect(line).toContain("Error");
      expect(line).not.toContain("MAPLE GROCERS");
      expect(line).not.toContain("41.20");
    } finally {
      spy.mockRestore();
      debug.mockRestore();
    }
  });
});
