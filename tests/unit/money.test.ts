import { describe, expect, it } from "vitest";

import {
  currencyScale,
  currencyTolerance,
  displayMoney,
  formatMoney,
  sumMoney,
  toMoney,
  withinTolerance,
} from "@/lib/money/decimal";
import { findMoneyTokens, parseMoneyToken } from "@/lib/money/parse";

describe("formatMoney", () => {
  it("fixes to the currency scale", () => {
    expect(formatMoney("1234.5", "USD")).toBe("1234.50");
    expect(formatMoney("1234", "JPY")).toBe("1234");
    expect(formatMoney("1.005", "BHD")).toBe("1.005");
  });

  it("never emits negative zero", () => {
    expect(formatMoney("-0.001", "USD")).toBe("0.00");
    expect(formatMoney("-0", "USD")).toBe("0.00");
    expect(formatMoney(-0.0000001, "USD")).toBe("0.00");
  });

  it("uses banker's rounding at the half", () => {
    expect(formatMoney("0.125", "USD")).toBe("0.12");
    expect(formatMoney("0.135", "USD")).toBe("0.14");
  });

  it("is idempotent", () => {
    const once = formatMoney("12345.678", "USD");
    expect(formatMoney(once, "USD")).toBe(once);
  });
});

describe("decimal arithmetic", () => {
  it("does not accumulate floating point error", () => {
    const values = Array.from({ length: 100 }, () => "0.07");
    expect(formatMoney(sumMoney(values), "USD")).toBe("7.00");
    // The float equivalent is famously not 7.
    const floatSum = values.reduce((total, value) => total + Number(value), 0);
    expect(floatSum).not.toBe(7);
  });

  it("keeps precision through many operations", () => {
    let total = toMoney("0");
    for (let index = 0; index < 1000; index += 1) {
      total = total.plus("0.01").minus("0.003");
    }
    expect(formatMoney(total, "USD")).toBe("7.00");
  });
});

describe("currency awareness", () => {
  it("knows zero-decimal and three-decimal currencies", () => {
    expect(currencyScale("JPY")).toBe(0);
    expect(currencyScale("KWD")).toBe(3);
    expect(currencyScale("usd")).toBe(2);
    expect(currencyScale(undefined)).toBe(2);
  });

  it("scales tolerance to one minor unit", () => {
    expect(currencyTolerance("USD").toString()).toBe("0.01");
    expect(currencyTolerance("JPY").toString()).toBe("1");
    expect(currencyTolerance("KWD").toString()).toBe("0.001");
  });

  it("accepts a one cent difference and rejects two", () => {
    expect(withinTolerance("100.00", "100.01", "USD")).toBe(true);
    expect(withinTolerance("100.00", "100.02", "USD")).toBe(false);
    expect(withinTolerance("100", "101", "JPY")).toBe(true);
  });
});

describe("parseMoneyToken", () => {
  const cases: Array<[string, string]> = [
    ["1,234.56", "1234.56"],
    ["$1,234.56", "1234.56"],
    ["-$1,234.56", "-1234.56"],
    ["(1,234.56)", "-1234.56"],
    ["1234.56-", "-1234.56"],
    ["1.234,56", "1234.56"],
    ["1 234,56", "1234.56"],
    ["1'234.56", "1234.56"],
    ["1,23", "1.23"],
    ["0.99", "0.99"],
    ["-0.01", "-0.01"],
    ["12", "12.00"],
    ["1,234", "1234.00"],
    ["USD 12.00", "12.00"],
    ["€1.234,56", "1234.56"],
    ["\u22121,234.56", "-1234.56"],
    ["1\u00A0234,56", "1234.56"],
  ];

  for (const [input, expected] of cases) {
    it(`parses ${JSON.stringify(input)}`, () => {
      expect(parseMoneyToken(input)?.canonical).toBe(expected);
    });
  }

  it("reads CR and DR suffixes without changing the magnitude", () => {
    const credit = parseMoneyToken("1,234.56 CR");
    expect(credit?.canonical).toBe("1234.56");
    expect(credit?.suffixMarker).toBe("CR");
    const debit = parseMoneyToken("1,234.56DR");
    expect(debit?.suffixMarker).toBe("DR");
  });

  it("rejects things that are not money", () => {
    for (const value of [
      "",
      " ",
      "abc",
      "12/03/2024",
      "1,2345",
      "1.234.56",
      "--12.00",
      "0.123456789",
      "1e5",
      "XXXX1234",
      "1,234,56.78",
    ]) {
      expect(parseMoneyToken(value), value).toBeNull();
    }
  });

  it("does not read a bare integer as money when a decimal is required", () => {
    expect(parseMoneyToken("1042", { requireDecimalOrSymbol: true })).toBeNull();
    expect(parseMoneyToken("$1042", { requireDecimalOrSymbol: true })?.canonical).toBe("1042.00");
    expect(parseMoneyToken("10.42", { requireDecimalOrSymbol: true })?.canonical).toBe("10.42");
  });

  it("does not turn a small decimal into a thousands group", () => {
    expect(parseMoneyToken("0.123")?.canonical).toBe("0.12");
  });

  it("records a currency hint when one is present", () => {
    expect(parseMoneyToken("£45.00")?.currencyHint).toBe("GBP");
    expect(parseMoneyToken("45.00")?.currencyHint).toBeUndefined();
  });
});

describe("findMoneyTokens", () => {
  it("finds each amount with its position", () => {
    const tokens = findMoneyTokens("03/04 COFFEE SHOP 12.50 1,204.55");
    expect(tokens.map((token) => token.parsed.canonical)).toContain("12.50");
    expect(tokens.map((token) => token.parsed.canonical)).toContain("1204.55");
  });
});

describe("displayMoney", () => {
  it("groups thousands and prefixes the symbol", () => {
    expect(displayMoney("1234567.89", "USD")).toBe("$1,234,567.89");
    expect(displayMoney("-45.5", "USD")).toBe("-$45.50");
    expect(displayMoney("1000", "JPY")).toBe("¥1,000");
    expect(displayMoney("10.00", "SEK")).toBe("SEK 10.00");
  });
});
