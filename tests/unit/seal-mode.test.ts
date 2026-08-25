import { afterEach, describe, expect, it } from "vitest";

import { resetServerEnvCache } from "@/config/env";
import { SealError, seal, sealMode, unseal } from "@/lib/crypto/seal";

/**
 * Envelope sealing, across every configuration it can be in.
 *
 * The unit suite sets `EXPORT_SEAL_SECRET`, so sealing is real here rather than silently
 * falling back to plaintext — which is what happened before the suite had a setup file, and
 * meant every pack test appeared to prove tamper resistance while exercising the fallback.
 *
 * These tests move the environment deliberately, so each one restores it.
 */

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const PAYLOAD = JSON.stringify({ kind: "pack", secretish: "converted transaction table" });

const mutableEnv = process.env as Record<string, string | undefined>;
const originalSecret = process.env.EXPORT_SEAL_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalSecret === undefined) delete mutableEnv.EXPORT_SEAL_SECRET;
  else mutableEnv.EXPORT_SEAL_SECRET = originalSecret;
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  resetServerEnvCache();
});

function configureSecret(secret: string | undefined): void {
  if (secret === undefined) delete mutableEnv.EXPORT_SEAL_SECRET;
  else mutableEnv.EXPORT_SEAL_SECRET = secret;
  resetServerEnvCache();
}

describe("sealed mode, with a configured secret", () => {
  it("reports sealed mode and produces an AES-GCM envelope", async () => {
    expect(sealMode()).toBe("sealed");
    const envelope = await seal(PAYLOAD, DIGEST_A);
    expect(envelope.startsWith("v1.gcm.")).toBe(true);
  });

  it("does not leave the plaintext readable in the envelope", async () => {
    // The whole point: before payment, the converted table is in the browser. If it were
    // recoverable from the envelope, the paywall would be decorative.
    const envelope = await seal(PAYLOAD, DIGEST_A);
    expect(envelope).not.toContain("converted transaction table");
    expect(Buffer.from(envelope, "utf8").toString("latin1")).not.toContain("transaction table");
  });

  it("round-trips under the same digest", async () => {
    const envelope = await seal(PAYLOAD, DIGEST_A);
    expect(await unseal(envelope, DIGEST_A)).toBe(PAYLOAD);
  });

  it("refuses to open under a different digest", async () => {
    // The digest is the key material and the AAD, so this is the binding between a payment
    // and one specific conversion.
    const envelope = await seal(PAYLOAD, DIGEST_A);
    await expect(unseal(envelope, DIGEST_B)).rejects.toBeInstanceOf(SealError);
  });

  it("refuses to open under a different secret", async () => {
    const envelope = await seal(PAYLOAD, DIGEST_A);
    configureSecret("a-completely-different-seal-secret");
    await expect(unseal(envelope, DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });

  it("refuses a tampered ciphertext", async () => {
    const envelope = await seal(PAYLOAD, DIGEST_A);
    const chars = [...envelope];
    const index = chars.length - 5;
    chars[index] = chars[index] === "A" ? "B" : "A";
    await expect(unseal(chars.join(""), DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });

  it("refuses a truncated envelope", async () => {
    const envelope = await seal(PAYLOAD, DIGEST_A);
    await expect(unseal(envelope.slice(0, -6), DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });

  it("rejects a downgrade to a plaintext envelope", async () => {
    // Sealing is configured, so an attacker hand-crafting the cheaper envelope format must
    // not be able to opt out of the protection.
    const plain = `v1.plain.${Buffer.from(PAYLOAD, "utf8").toString("base64url")}`;
    await expect(unseal(plain, DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });

  it("rejects an unrecognised envelope format", async () => {
    await expect(unseal("v2.something.abc", DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });
});

describe("plaintext fallback, unconfigured outside production", () => {
  it("reports plaintext mode and round-trips", async () => {
    mutableEnv.NODE_ENV = "test";
    configureSecret(undefined);

    expect(sealMode()).toBe("plaintext");
    const envelope = await seal(PAYLOAD, DIGEST_A);
    expect(envelope.startsWith("v1.plain.")).toBe(true);
    expect(await unseal(envelope, DIGEST_A)).toBe(PAYLOAD);
  });

  it("refuses a sealed envelope when no secret is configured", async () => {
    mutableEnv.NODE_ENV = "test";
    configureSecret("temporarily-configured-secret");
    const sealed = await seal(PAYLOAD, DIGEST_A);

    configureSecret(undefined);
    await expect(unseal(sealed, DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });
});

describe("production refuses to seal without a secret", () => {
  it("throws rather than emitting a plaintext envelope", async () => {
    // The failure this prevents: a production deployment missing the secret would otherwise
    // ship the entire converted statement to the browser in the clear, before payment, while
    // /api/health quietly reported plaintext mode and nothing else objected.
    mutableEnv.NODE_ENV = "production";
    configureSecret(undefined);

    await expect(seal(PAYLOAD, DIGEST_A)).rejects.toBeInstanceOf(SealError);
  });

  it("still seals normally in production when the secret is present", async () => {
    mutableEnv.NODE_ENV = "production";
    configureSecret("a-production-shaped-seal-secret");

    const envelope = await seal(PAYLOAD, DIGEST_A);
    expect(envelope.startsWith("v1.gcm.")).toBe(true);
    expect(await unseal(envelope, DIGEST_A)).toBe(PAYLOAD);
  });
});
