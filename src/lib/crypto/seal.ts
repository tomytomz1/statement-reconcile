import { serverEnv } from "@/config/env";

import { fromHex, isSha256Hex, toHex } from "./digest";

/**
 * Sealing of the extraction result that the browser holds between the preview and the
 * paid download.
 *
 * The product deliberately stores nothing server-side, so the browser has to keep the
 * extraction result until payment completes. Handing the browser the full plaintext
 * transaction table would make the paywall decorative: anyone could read it out of local
 * storage. Instead the server seals the result with AES-256-GCM under a key derived from
 * the result's own digest, and the browser keeps only the ciphertext.
 *
 *     key   = HMAC-SHA256(EXPORT_SEAL_SECRET, "statement-reconcile/seal/v1" || digest)
 *     nonce = 12 random bytes
 *     aad   = digest
 *
 * Because the key and the additional authenticated data both come from the digest, and
 * because the digest is what Stripe records at checkout, a sealed result can only be
 * opened by presenting it together with a paid session for that exact digest. There is no
 * server-side state and no lookup table.
 *
 * When `EXPORT_SEAL_SECRET` is not configured the app degrades to an unsealed envelope.
 * That is still gated by server-side Stripe verification and a digest match, but the
 * plaintext is present in the browser. `/api/health` and `pnpm doctor` report which mode
 * is active.
 */

const SEAL_INFO = "statement-reconcile/seal/v1";
const SEALED_PREFIX = "v1.gcm.";
const PLAIN_PREFIX = "v1.plain.";
const NONCE_BYTES = 12;

export type SealMode = "sealed" | "plaintext";

export function sealMode(): SealMode {
  return serverEnv().EXPORT_SEAL_SECRET ? "sealed" : "plaintext";
}

function subtle(): SubtleCrypto {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.subtle) throw new Error("WebCrypto is unavailable in this runtime");
  return cryptoObject.subtle;
}

async function deriveKey(secret: string, digest: string): Promise<CryptoKey> {
  const hmacKey = await subtle().importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const material = await subtle().sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode(`${SEAL_INFO}${digest}`),
  );
  return subtle().importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function seal(plaintext: string, digest: string): Promise<string> {
  if (!isSha256Hex(digest)) throw new Error("seal requires a SHA-256 digest");
  const secret = serverEnv().EXPORT_SEAL_SECRET;
  if (!secret) {
    return `${PLAIN_PREFIX}${base64UrlEncode(new TextEncoder().encode(plaintext))}`;
  }

  const key = await deriveKey(secret, digest);
  const nonce = new Uint8Array(NONCE_BYTES);
  globalThis.crypto.getRandomValues(nonce);
  const ciphertext = await subtle().encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: fromHex(digest) },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${SEALED_PREFIX}${toHex(nonce)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export class SealError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SealError";
  }
}

export async function unseal(envelope: string, digest: string): Promise<string> {
  if (!isSha256Hex(digest)) throw new SealError("unseal requires a SHA-256 digest");

  if (envelope.startsWith(PLAIN_PREFIX)) {
    if (serverEnv().EXPORT_SEAL_SECRET) {
      // Refuse to accept an unsealed envelope once sealing is configured, so an attacker
      // cannot downgrade the protection by hand-crafting the envelope.
      throw new SealError("unsealed envelope rejected while sealing is enabled");
    }
    return new TextDecoder().decode(base64UrlDecode(envelope.slice(PLAIN_PREFIX.length)));
  }

  if (!envelope.startsWith(SEALED_PREFIX)) throw new SealError("unrecognized envelope");

  const secret = serverEnv().EXPORT_SEAL_SECRET;
  if (!secret) throw new SealError("sealed envelope presented but no seal secret is configured");

  const [nonceHex, payload] = envelope.slice(SEALED_PREFIX.length).split(".");
  if (!nonceHex || !payload) throw new SealError("malformed envelope");

  let plaintext: ArrayBuffer;
  try {
    const key = await deriveKey(secret, digest);
    plaintext = await subtle().decrypt(
      { name: "AES-GCM", iv: fromHex(nonceHex), additionalData: fromHex(digest) },
      key,
      base64UrlDecode(payload),
    );
  } catch {
    throw new SealError("envelope could not be opened for this digest");
  }
  return new TextDecoder().decode(plaintext);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  const buffer = Buffer.from(padded, "base64");
  const bytes = new Uint8Array(new ArrayBuffer(buffer.byteLength));
  bytes.set(buffer);
  return bytes;
}

/** Upper bound on an envelope we are willing to accept from a client. */
export const MAX_ENVELOPE_CHARS = 3_000_000;
