import { describe, expect, it } from "vitest";

import { ENTITLEMENT_TTL_MS, isWithinEntitlementWindow } from "@/lib/payments/entitlement";
import { openSealedResult } from "@/lib/payments/open-sealed-result";
import { assemblePack, type PackFileInput } from "@/lib/schema/assemble-pack";
import { verifiedStatement } from "../helpers/statements";

/**
 * Recovery after the local result expires.
 *
 * The commercial promise is a 30-day entitlement, but the sealed local result lives about an
 * hour. Redeeming the entitlement after that means re-uploading the same PDFs and
 * reproducing the *same pack digest* — so anything that makes the digest depend on something
 * other than the statements themselves silently breaks a paid customer's only route back to
 * their files.
 *
 * File order was exactly such a thing until the manifest was sorted by content digest.
 */

async function packOf(files: PackFileInput[]) {
  return assemblePack(files);
}

describe("pack digest is a function of contents, not upload order", () => {
  it("reproduces the same digest for the same files in the same order", async () => {
    const files = [verifiedStatement("alpha"), verifiedStatement("beta")];
    const first = await packOf(files);
    const second = await packOf(files);
    expect(second.digest).toBe(first.digest);
  });

  it("reproduces the same digest when the same files are chosen in a different order", async () => {
    // The customer who paid has no idea what order they picked the files in the first time.
    // If this fails, their entitlement is unredeemable for a reason no error could explain.
    const alpha = verifiedStatement("alpha");
    const beta = verifiedStatement("beta");

    const forwards = await packOf([alpha, beta]);
    const backwards = await packOf([beta, alpha]);

    expect(backwards.digest).toBe(forwards.digest);
    expect(backwards.manifest.files.map((f) => f.fileId)).toEqual(
      forwards.manifest.files.map((f) => f.fileId),
    );
  });

  it("orders the manifest deterministically regardless of input permutation", async () => {
    const a = verifiedStatement("a");
    const b = verifiedStatement("b");
    const c = verifiedStatement("c");

    const orders: PackFileInput[][] = [
      [a, b, c],
      [c, b, a],
      [b, a, c],
      [c, a, b],
    ];
    const digests = new Set<string>();
    for (const order of orders) digests.add((await packOf(order)).digest);

    expect(digests.size).toBe(1);
  });

  it("still produces a different digest for genuinely different contents", async () => {
    // Order-independence must not become content-blindness.
    const one = await packOf([verifiedStatement("alpha"), verifiedStatement("beta")]);
    const two = await packOf([verifiedStatement("alpha"), verifiedStatement("gamma")]);
    expect(two.digest).not.toBe(one.digest);
  });

  it("opens a reassembled pack under the digest a previous assembly produced", async () => {
    // This is the recovery path itself: re-uploaded files, freshly sealed, opened against
    // the digest Stripe recorded at payment time.
    const alpha = verifiedStatement("alpha");
    const beta = verifiedStatement("beta");

    const paid = await packOf([alpha, beta]);
    const reuploaded = await packOf([beta, alpha]);

    const opened = await openSealedResult(reuploaded.sealed, paid.digest);
    expect(opened.ok).toBe(true);
  });

  it("refuses a sealed envelope opened under a digest it does not belong to", async () => {
    const paid = await packOf([verifiedStatement("alpha")]);
    const other = await packOf([verifiedStatement("beta")]);

    const opened = await openSealedResult(other.sealed, paid.digest);
    expect(opened.ok).toBe(false);
  });
});

describe("entitlement window boundaries", () => {
  const paidAt = Date.UTC(2026, 0, 1, 12, 0, 0);
  const base = {
    sessionId: "cs_test_x",
    digest: "a".repeat(64),
    jobId: "job",
    paidAt,
    amountTotal: 1900,
    currency: "usd",
    livemode: true,
  };

  it("allows a download at the exact 30-day boundary", () => {
    expect(isWithinEntitlementWindow(base, paidAt + ENTITLEMENT_TTL_MS)).toBe(true);
  });

  it("refuses one millisecond after the boundary", () => {
    expect(isWithinEntitlementWindow(base, paidAt + ENTITLEMENT_TTL_MS + 1)).toBe(false);
  });

  it("allows the moment of payment", () => {
    expect(isWithinEntitlementWindow(base, paidAt)).toBe(true);
  });

  it("treats an unknown payment time as still valid rather than guessing", () => {
    // `paidAt` is null when Stripe did not report a creation time. Refusing would strand a
    // paying customer on a data gap that is ours, not theirs.
    expect(
      isWithinEntitlementWindow({ ...base, paidAt: null }, paidAt + ENTITLEMENT_TTL_MS * 10),
    ).toBe(true);
  });
});
