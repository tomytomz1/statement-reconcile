import { describe, expect, it, vi } from "vitest";

import { runExtractionPipeline } from "@/lib/extraction/pipeline";
import { FIXTURE_FAMILIES, generateFixture } from "@/lib/fixtures/generator";

vi.mock("@/lib/crypto/seal", () => ({
  seal: () => {
    throw new TypeError("sealing is unavailable");
  },
}));

const reconciling = FIXTURE_FAMILIES.find((family) => family.expectation === "reconciles");

describe("a failure after verification is distinguishable from a parsing failure", () => {
  /**
   * Packaging runs only once a statement has already passed verification, so a throw there
   * means the conversion worked and could not be delivered. The caller sees the same
   * internal error either way — correct, since neither is actionable for them — which is
   * exactly why the two must be told apart in the logs.
   */
  it("logs finalize_failed, not a parsing failure, and leaks no statement content", async () => {
    if (!reconciling) throw new Error("no reconciling fixture family");
    const fixture = generateFixture(reconciling.family, 5);

    const lines: string[] = [];
    const spy = vi
      .spyOn(console, "log")
      .mockImplementation((line: unknown) => void lines.push(String(line)));

    try {
      await expect(runExtractionPipeline(fixture.document, {})).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }

    const events = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const finalize = events.find((event) => event.event === "finalize_failed");

    expect(finalize).toBeDefined();
    expect(finalize?.errorKind).toBe("TypeError");
    // Extraction genuinely succeeded first; the two events are not interchangeable.
    expect(events.some((event) => event.event === "extraction_succeeded")).toBe(true);
    expect(events.some((event) => event.event === "extraction_failed")).toBe(false);

    // The exception message and any statement content stay off the log line.
    for (const line of lines) {
      expect(line).not.toContain("sealing is unavailable");
      for (const transaction of fixture.truth.transactions) {
        expect(line).not.toContain(transaction.description);
      }
    }
  });
});
