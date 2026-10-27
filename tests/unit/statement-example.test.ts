import { describe, expect, it } from "vitest";

import { exampleCsv, exampleStatement } from "@/lib/seo/statement-example";

describe("fictional statement demonstration", () => {
  it("reconciles the sample bank account using exact cents", () => {
    const result = exampleStatement("bank");
    expect(result.openingCents).toBe(100000);
    expect(result.netChangeCents).toBe(15975);
    expect(result.closingCents).toBe(115975);
    expect(result.transactions.at(-1)?.balanceCents).toBe(result.closingCents);
  });

  it("treats card purchases as balance owed and payments as reductions", () => {
    const result = exampleStatement("card");
    expect(result.openingCents).toBe(80000);
    expect(result.netChangeCents).toBe(-20000);
    expect(result.closingCents).toBe(60000);
    expect(result.transactions.at(-1)?.balanceCents).toBe(result.closingCents);
  });

  it("exports an Excel-compatible CSV with separate debit and credit fields", () => {
    const bank = exampleCsv("bank").split("\r\n");
    const card = exampleCsv("card").split("\r\n");
    expect(bank[0]).toBe("Date,Posted Date,Description,Debit,Credit,Amount,Balance");
    expect(bank).toHaveLength(5);
    expect(card).toHaveLength(5);
    expect(bank[1]).toContain(",,850.00,850.00,1850.00");
    expect(card[1]).toContain(",125.00,,125.00,925.00");
  });

  it("never exposes arbitrary user-provided data in these fixed examples", () => {
    expect(exampleCsv("bank")).toContain("Example paycheck");
    expect(exampleCsv("card")).toContain("Example purchase");
  });
});
