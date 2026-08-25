import { describe, expect, it } from "vitest";

import {
  COPY_HEADLINES,
  copyVariantForSession,
  isCopyVariant,
  resolveCopyVariant,
} from "@/lib/analytics/copy-variant";

describe("copy variant assignment", () => {
  it("is deterministic and always returns an approved variant", () => {
    const first = copyVariantForSession("0011223344556677");
    expect(copyVariantForSession("0011223344556677")).toBe(first);
    expect(isCopyVariant(first)).toBe(true);
    expect(COPY_HEADLINES[first].length).toBeGreaterThan(20);
  });

  it("distributes a representative session set near the intended thirds", () => {
    const counts = { a: 0, b: 0, c: 0 };
    for (let index = 0; index < 10_000; index += 1) {
      counts[copyVariantForSession(index.toString(16).padStart(16, "0"))] += 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(3_000);
      expect(count).toBeLessThan(3_700);
    }
  });

  it("rejects invalid preview assignments", () => {
    expect(isCopyVariant("a")).toBe(true);
    expect(isCopyVariant("control")).toBe(false);
    expect(isCopyVariant(undefined)).toBe(false);
  });

  it("honors URL overrides only in protected preview deployments", () => {
    const session = "0011223344556677";
    expect(resolveCopyVariant(session, "c", "preview")).toBe("c");
    expect(resolveCopyVariant(session, "c", "production")).toBe(copyVariantForSession(session));
    expect(resolveCopyVariant(session, "invalid", "preview")).toBe(copyVariantForSession(session));
  });
});
