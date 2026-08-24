import { describe, expect, it, vi } from "vitest";

import { logEvent, logFailure } from "@/lib/security/logging";

function captureLog(run: () => void): string {
  const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  try {
    run();
    return String(spy.mock.calls[0]?.[0] ?? "");
  } finally {
    spy.mockRestore();
  }
}

describe("logEvent field sanitization", () => {
  it("redacts forbidden keys regardless of case", () => {
    const line = captureLog(() =>
      logEvent("extraction_failed", {
        Description: "DIRECT DEPOSIT",
        AMOUNT: "500.00",
        Balance: "1000.00",
        Filename: "statement.pdf",
        code: "reconciliation_failed",
      }),
    );
    expect(line).toContain("[redacted]");
    expect(line).toContain("reconciliation_failed");
    expect(line).not.toContain("DIRECT DEPOSIT");
    expect(line).not.toContain("statement.pdf");
  });

  it("redacts strings that look like account fragments", () => {
    const line = captureLog(() => logEvent("checkout_started", { note: "acct 4111111111111111" }));
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("4111");
  });
});

describe("logFailure", () => {
  it("does not put the exception message on the JSON log line", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    try {
      const line = captureLog(() =>
        logFailure("export_failed", new Error("openingBalance 4,182.55 leaked")),
      );
      expect(line).toContain('"event":"export_failed"');
      expect(line).not.toContain("openingBalance");
      expect(line).not.toContain("4,182.55");
    } finally {
      debug.mockRestore();
    }
  });
});
