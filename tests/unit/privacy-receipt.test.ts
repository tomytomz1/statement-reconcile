import { describe, expect, it } from "vitest";

import { disclosureSentences, localOnlyDisclosure, withRemoteText } from "@/lib/privacy/receipt";
import { compareMaterialFields } from "@/lib/extraction/secondary/compare";

describe("privacy receipts", () => {
  it("structurally records that the original PDF never left the browser", () => {
    const receipt = localOnlyDisclosure(3);
    expect(receipt.rawPdfLeftBrowser).toBe(false);
    expect(receipt.remoteTextRegionsProcessed).toBe(0);
    const sentences = disclosureSentences(receipt);
    expect(sentences.some((sentence) => /never left this browser/i.test(sentence))).toBe(true);
    expect(sentences.some((sentence) => /no statement text was sent/i.test(sentence))).toBe(true);
  });

  it("changes the disclosed sentence when a remote text region is actually sent", () => {
    const receipt = withRemoteText(localOnlyDisclosure(2), 1, "openai-compatible");
    expect(receipt.remoteTextRegionsProcessed).toBe(1);
    const sentences = disclosureSentences(receipt).join(" ");
    expect(sentences).toMatch(/1 ambiguous text region/);
    expect(sentences).not.toMatch(/No statement text was sent/);
  });
});

describe("secondary extraction comparison", () => {
  it("agrees only when material fields match exactly", () => {
    const agreed = compareMaterialFields(
      { date: "2026-03-02", amount: "-10.00" },
      { date: "2026-03-02", amount: "-10.00" },
    );
    expect(agreed.agreed).toBe(true);

    const disagreed = compareMaterialFields(
      { date: "2026-03-02", amount: "-10.00" },
      { date: "2026-03-02", amount: "-10.01" },
    );
    expect(disagreed.agreed).toBe(false);
  });
});
