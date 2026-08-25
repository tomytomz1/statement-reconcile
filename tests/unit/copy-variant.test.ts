import { describe, expect, it } from "vitest";

import {
  COPY_HEADLINES,
  COPY_VARIANT_HEADER,
  copyVariantForSession,
  copyVariantFromHeaders,
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

  it("distributes a representative session set near the intended halves", () => {
    const counts = { a: 0, b: 0 };
    for (let index = 0; index < 10_000; index += 1) {
      counts[copyVariantForSession(index.toString(16).padStart(16, "0"))] += 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(4_600);
      expect(count).toBeLessThan(5_400);
    }
  });

  it("rejects invalid preview assignments", () => {
    expect(isCopyVariant("a")).toBe(true);
    expect(isCopyVariant("b")).toBe(true);
    // "c" was a variant before the headlines were reseated; a stale cookie or a bookmarked
    // preview URL must not resurrect a headline that no longer exists.
    expect(isCopyVariant("c")).toBe(false);
    expect(isCopyVariant("control")).toBe(false);
    expect(isCopyVariant(undefined)).toBe(false);
  });

  it("honors URL overrides only in protected preview deployments", () => {
    const session = "0011223344556677";
    expect(resolveCopyVariant(session, "b", "preview")).toBe("b");
    expect(resolveCopyVariant(session, "b", "production")).toBe(copyVariantForSession(session));
    expect(resolveCopyVariant(session, "invalid", "preview")).toBe(copyVariantForSession(session));
  });
});

describe("server-side variant attribution", () => {
  it("reads an approved variant from the proxy header", () => {
    for (const variant of ["a", "b"] as const) {
      expect(copyVariantFromHeaders(new Headers({ [COPY_VARIANT_HEADER]: variant }))).toBe(variant);
    }
  });

  it("returns undefined rather than guessing when the header is absent or unrecognised", () => {
    // logEvent drops undefined fields, so an unattributed request logs no variant at all
    // instead of being silently miscounted against one.
    expect(copyVariantFromHeaders(new Headers())).toBeUndefined();
    expect(
      copyVariantFromHeaders(new Headers({ [COPY_VARIANT_HEADER]: "control" })),
    ).toBeUndefined();
    expect(copyVariantFromHeaders(new Headers({ [COPY_VARIANT_HEADER]: "" }))).toBeUndefined();
    expect(copyVariantFromHeaders(new Headers({ [COPY_VARIANT_HEADER]: "A" }))).toBeUndefined();
  });
});
