import { describe, expect, it } from "vitest";

import { CanonicalizationError, canonicalJson } from "@/lib/crypto/canonical-json";
import { canonicalDigest, isSha256Hex, randomId, timingSafeEqualHex } from "@/lib/crypto/digest";
import {
  canonicalizeAndDigest,
  canonicalizeStatement,
  canonicalizeText,
} from "@/lib/extraction/canonicalize";
import { withProvenance, withStatementDefaults } from "@/lib/schema/build";
import type { NormalizedStatement } from "@/lib/schema/statement";

const statement: NormalizedStatement = withStatementDefaults({
  statementType: "checking",
  currency: "USD",
  periodStart: "2024-03-01",
  periodEnd: "2024-03-31",
  openingBalance: "1000.00",
  closingBalance: "1100.00",
  transactions: [
    { date: "2024-03-02", description: "DEPOSIT", amount: "200.00" },
    { date: "2024-03-10", description: "COFFEE", amount: "-100.00" },
  ],
  extractionWarnings: [],
});

describe("canonicalJson", () => {
  it("sorts object keys", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("is insensitive to property insertion order", () => {
    const a = { x: 1, y: { p: "1", q: "2" } };
    const b = { y: { q: "2", p: "1" }, x: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("drops undefined and null members", () => {
    expect(canonicalJson({ a: 1, b: undefined, c: null })).toBe('{"a":1}');
  });

  it("preserves array order", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("escapes control characters and quotes", () => {
    expect(canonicalJson('a"b\\c\nd\u0001')).toBe('"a\\"b\\\\c\\nd\\u0001"');
  });

  it("refuses non-integer numbers so money is always a string", () => {
    expect(() => canonicalJson({ amount: 1.1 })).toThrow(CanonicalizationError);
    expect(() => canonicalJson({ amount: Number.NaN })).toThrow(CanonicalizationError);
  });

  it("refuses deeply nested values", () => {
    let nested: unknown = "leaf";
    for (let index = 0; index < 40; index += 1) nested = { nested };
    expect(() => canonicalJson(nested)).toThrow(CanonicalizationError);
  });
});

describe("canonicalizeText", () => {
  it("collapses whitespace and trims", () => {
    expect(canonicalizeText("  A   B \n C ")).toBe("A B C");
  });

  it("strips zero-width, bidi and control characters", () => {
    expect(canonicalizeText("A\u200bB\u202eC\u0007D")).toBe("ABCD");
  });

  it("normalizes unicode so visually identical text digests identically", () => {
    const composed = "CAFÉ";
    const decomposed = "CAFE\u0301";
    expect(canonicalizeText(composed)).toBe(canonicalizeText(decomposed));
  });

  it("truncates very long text", () => {
    expect(canonicalizeText("X".repeat(2000)).length).toBeLessThanOrEqual(512);
  });
});

describe("canonicalizeStatement", () => {
  it("is idempotent", () => {
    const once = canonicalizeStatement(statement);
    expect(canonicalizeStatement(once)).toEqual(once);
  });

  it("normalizes amounts to the currency scale", () => {
    const result = canonicalizeStatement(
      withStatementDefaults({
        ...statement,
        transactions: [withProvenance({ date: "2024-03-02", description: "X", amount: "200" })],
      }),
    );
    expect(result.transactions[0]?.amount).toBe("200.00");
  });

  it("uppercases the currency", () => {
    expect(canonicalizeStatement({ ...statement, currency: "usd" }).currency).toBe("USD");
  });

  it("replaces an empty description rather than dropping the row", () => {
    const result = canonicalizeStatement(
      withStatementDefaults({
        ...statement,
        transactions: [withProvenance({ date: "2024-03-02", description: "   ", amount: "1.00" })],
      }),
    );
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.description).toBe("(no description)");
  });
});

describe("digest stability", () => {
  it("is deterministic across repeated computation", async () => {
    const first = await canonicalizeAndDigest(statement);
    const second = await canonicalizeAndDigest(statement);
    expect(first.digest).toBe(second.digest);
    expect(isSha256Hex(first.digest)).toBe(true);
  });

  it("survives a JSON round trip", async () => {
    const direct = await canonicalizeAndDigest(statement);
    const roundTripped = await canonicalizeAndDigest(
      JSON.parse(JSON.stringify(direct.statement)) as unknown,
    );
    expect(roundTripped.digest).toBe(direct.digest);
  });

  it("is unaffected by key ordering in the transport payload", async () => {
    const reordered = {
      privacy: statement.privacy,
      runningBalanceSummary: statement.runningBalanceSummary,
      verificationState: statement.verificationState,
      ambiguities: statement.ambiguities,
      completeness: statement.completeness,
      extractionPath: statement.extractionPath,
      extractorVersion: statement.extractorVersion,
      extractionWarnings: statement.extractionWarnings,
      transactions: statement.transactions.map((transaction) => ({
        verification: transaction.verification,
        extractorVersion: transaction.extractorVersion,
        rawSourceText: transaction.rawSourceText,
        fieldProvenance: transaction.fieldProvenance,
        sourceRegions: transaction.sourceRegions,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        id: transaction.id,
      })),
      currency: statement.currency,
      closingBalance: statement.closingBalance,
      openingBalance: statement.openingBalance,
      periodEnd: statement.periodEnd,
      periodStart: statement.periodStart,
      statementType: statement.statementType,
      schemaVersion: statement.schemaVersion,
    };
    const a = await canonicalizeAndDigest(statement);
    const b = await canonicalizeAndDigest(reordered);
    expect(b.digest).toBe(a.digest);
  });

  it("changes when any amount changes by one cent", async () => {
    const baseline = await canonicalizeAndDigest(statement);
    const tampered = await canonicalizeAndDigest(
      withStatementDefaults({
        ...statement,
        transactions: [
          { date: "2024-03-02", description: "DEPOSIT", amount: "200.01" },
          { date: "2024-03-10", description: "COFFEE", amount: "-100.00" },
        ],
      }),
    );
    expect(tampered.digest).not.toBe(baseline.digest);
  });

  it("changes when rows are reordered", async () => {
    const baseline = await canonicalizeAndDigest(statement);
    const reordered = await canonicalizeAndDigest({
      ...statement,
      transactions: [...statement.transactions].reverse(),
    });
    expect(reordered.digest).not.toBe(baseline.digest);
  });

  it("digests a known value stably", async () => {
    const digest = await canonicalDigest({ a: "1" });
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(await canonicalDigest({ a: "1" })).toBe(digest);
  });
});

describe("digest helpers", () => {
  it("compares in constant time and rejects mismatched lengths", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("abcd", "abcde")).toBe(false);
  });

  it("produces distinct random ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => randomId(16)));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
