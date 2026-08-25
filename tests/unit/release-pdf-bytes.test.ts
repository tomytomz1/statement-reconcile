import { describe, expect, it } from "vitest";

import { releasePdfBytes } from "@/lib/client/pdf";

/**
 * Regression: pdf.js transfers the PDF buffer to its worker, which detaches it in this realm.
 * `releasePdfBytes` used to call `fill(0)` unguarded, so it threw a TypeError on a detached
 * buffer. Every caller is a cleanup or removal path, and in `removeFile` the throw aborted the
 * removal before any state was updated — so dropping a file from a multi-file pack silently did
 * nothing, and `POST /api/pack` was never reached.
 */
describe("releasePdfBytes", () => {
  it("zeroes bytes it still owns", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    releasePdfBytes(bytes);
    expect(Array.from(bytes)).toEqual([0, 0, 0, 0]);
  });

  it("does not throw when the buffer has been transferred away", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    bytes.buffer.transfer();
    expect(bytes.buffer.detached).toBe(true);
    expect(() => releasePdfBytes(bytes)).not.toThrow();
  });
});
