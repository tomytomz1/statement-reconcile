import { describe, expect, it } from "vitest";

import { seal } from "@/lib/crypto/seal";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { assemblePack } from "@/lib/schema/assemble-pack";
import { packDigest } from "@/lib/schema/pack";
import { passedStatement, verifiedStatement } from "../helpers/statements";

/**
 * The payment boundary, attacked deliberately.
 *
 * Every one of these is the same question asked a different way: can data that was not paid
 * for, or was changed after it was paid for, be turned into a download? The envelope is
 * AES-GCM sealed under the digest, so most of these should fail at the seal — but the seal
 * is not the only thing standing between a customer and someone else's statement, and a test
 * suite that only proves "AES-GCM works" has not tested this application.
 *
 * Where a case is caught by more than one layer the test asserts the refusal, not the layer,
 * so removing one defence does not quietly turn the test green somewhere else.
 */

async function packA() {
  return assemblePack([verifiedStatement("alpha")]);
}
async function packB() {
  return assemblePack([verifiedStatement("beta")]);
}

describe("paid pack A can only ever open as pack A", () => {
  it("allows A when the digest and envelope agree", async () => {
    const a = await packA();
    const opened = await openSealedResult(a.sealed, a.digest);
    expect(opened.ok).toBe(true);
  });

  it("refuses B's envelope presented under A's paid digest", async () => {
    const [a, b] = [await packA(), await packB()];
    const opened = await openSealedResult(b.sealed, a.digest);
    expect(opened.ok).toBe(false);
  });

  it("refuses A's envelope presented under B's digest", async () => {
    const [a, b] = [await packA(), await packB()];
    const opened = await openSealedResult(a.sealed, b.digest);
    expect(opened.ok).toBe(false);
  });

  it("refuses a truncated sealed envelope", async () => {
    const a = await packA();
    const opened = await openSealedResult(a.sealed.slice(0, -8), a.digest);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.reason).toBe("envelope_rejected");
  });

  it("refuses a sealed envelope with a flipped byte", async () => {
    const a = await packA();
    const chars = [...a.sealed];
    const index = Math.floor(chars.length / 2);
    chars[index] = chars[index] === "A" ? "B" : "A";
    const opened = await openSealedResult(chars.join(""), a.digest);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.reason).toBe("envelope_rejected");
  });

  it("refuses a digest that is not a digest at all", async () => {
    const a = await packA();
    for (const bogus of ["", "not-a-digest", "z".repeat(64), "a".repeat(63)]) {
      const opened = await openSealedResult(a.sealed, bogus);
      expect(opened.ok).toBe(false);
    }
  });
});

/**
 * Re-sealing a modified envelope under its own recomputed digest.
 *
 * This is the interesting attack: an attacker who can run the same code can always produce a
 * *self-consistent* envelope. What they cannot do is make it match the digest Stripe
 * recorded at payment. Each case below builds a valid envelope for modified data, then
 * presents it under the original paid digest.
 */
describe("modified data cannot be redeemed against the original payment", () => {
  async function resealWith(mutate: (manifest: Record<string, unknown>) => void) {
    const a = await packA();
    const manifest = JSON.parse(JSON.stringify(a.manifest));
    mutate(manifest);
    const envelope = { kind: "pack", manifest, files: a.envelope.files };
    const tamperedDigest = await packDigest(manifest);
    const sealed = await seal(JSON.stringify(envelope), tamperedDigest);
    return { paidDigest: a.digest, tamperedDigest, sealed };
  }

  it("refuses a modified page count", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      m.totalPages = 2;
      (m.files as Array<Record<string, unknown>>)[0]!.pageCount = 2;
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  it("refuses a modified file count", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      m.fileCount = 2;
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  it("refuses a modified transaction count", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      (m.files as Array<Record<string, unknown>>)[0]!.transactionCount = 99;
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  it("refuses a modified statement type", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      (m.files as Array<Record<string, unknown>>)[0]!.statementType = "credit_card";
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  it("refuses a modified file-level digest", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      (m.files as Array<Record<string, unknown>>)[0]!.resultDigest = "b".repeat(64);
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  it("refuses a verification state flipped to passed in the manifest", async () => {
    const { paidDigest, sealed } = await resealWith((m) => {
      (m.files as Array<Record<string, unknown>>)[0]!.verificationState = "verification_rejected";
    });
    expect((await openSealedResult(sealed, paidDigest)).ok).toBe(false);
  });

  /**
   * The self-consistency check, isolated.
   *
   * Here the attacker re-seals *and* presents the matching tampered digest, so digest
   * binding alone would let it through — only the manifest-versus-contents comparison
   * inside `openPack` catches it. Without that check this test fails, which is the point:
   * it is what makes the defence-in-depth real rather than decorative.
   */
  it("refuses a self-consistent envelope whose manifest disagrees with its contents", async () => {
    const { tamperedDigest, sealed } = await resealWith((m) => {
      (m.files as Array<Record<string, unknown>>)[0]!.transactionCount = 99;
    });
    const opened = await openSealedResult(sealed, tamperedDigest);
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.reason).toBe("invalid_contents");
  });

  it("refuses a self-consistent envelope with an inflated page count", async () => {
    const { tamperedDigest, sealed } = await resealWith((m) => {
      m.totalPages = 40;
      (m.files as Array<Record<string, unknown>>)[0]!.pageCount = 40;
    });
    const opened = await openSealedResult(sealed, tamperedDigest);
    expect(opened.ok).toBe(false);
  });
});

describe("unverified packs cannot be assembled at all", () => {
  it("refuses to build a pack containing a rejected statement", async () => {
    const rejected = passedStatement({ verificationState: "verification_rejected" });
    await expect(
      assemblePack([{ fileId: "a".repeat(16), statement: rejected, pageCount: 1 }]),
    ).rejects.toThrow(/verification/i);
  });

  it("refuses to build a pack containing an unreconciled statement", async () => {
    // No closing balance means no applicable balancing method, which is a rejection rather
    // than a pass — a statement without enough evidence must never become sellable.
    const unbalanced = passedStatement({
      closingBalance: undefined,
      openingBalance: undefined,
      verificationState: "verification_passed",
    });
    const built = assemblePack([{ fileId: "a".repeat(16), statement: unbalanced, pageCount: 1 }]);
    await expect(
      built.then((pack) => openSealedResult(pack.sealed, pack.digest)),
    ).resolves.toMatchObject({ ok: false });
  });

  it("refuses a pack with a duplicated statement", async () => {
    const one = verifiedStatement("same");
    await expect(assemblePack([one, { ...one, fileId: "different0000000" }])).rejects.toThrow(
      /duplicate/i,
    );
  });

  it("refuses an empty pack", async () => {
    await expect(assemblePack([])).rejects.toThrow(/at least one file/i);
  });
});
