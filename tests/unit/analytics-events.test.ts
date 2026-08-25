import { describe, expect, it } from "vitest";

import { sizeBucket } from "@/lib/analytics/events";

describe("privacy-safe analytics buckets", () => {
  it("buckets file sizes instead of returning an exact value", () => {
    expect(sizeBucket(512_000)).toBe("<1mb");
    expect(sizeBucket(2 * 1_048_576)).toBe("1-5mb");
    expect(sizeBucket(7 * 1_048_576)).toBe("5-10mb");
    expect(sizeBucket(15 * 1_048_576)).toBe("10-20mb");
    expect(sizeBucket(25 * 1_048_576)).toBe("20mb+");
  });
});
