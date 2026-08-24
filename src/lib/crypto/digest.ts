import { canonicalJson } from "./canonical-json";

/**
 * SHA-256 digests over canonical JSON, using WebCrypto so the browser and the Node
 * server produce identical results from identical input.
 */

/** Domain separation prefix. Changing it invalidates every previously issued digest. */
const DIGEST_DOMAIN = "statement-reconcile/result/v2\n";

function subtle(): SubtleCrypto {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.subtle) {
    throw new Error("WebCrypto is unavailable in this runtime");
  }
  return cryptoObject.subtle;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle().digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

/**
 * The digest that binds a payment to exactly one extraction result.
 * Computed over `DIGEST_DOMAIN + canonicalJson(value)`.
 */
export async function canonicalDigest(value: unknown): Promise<string> {
  return sha256Hex(DIGEST_DOMAIN + canonicalJson(value));
}

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error("invalid hex string");
  }
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Constant-time comparison for digests and signatures. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/** Cryptographically random lowercase hex identifier. Used for job IDs. */
export function randomId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.getRandomValues) {
    throw new Error("secure randomness is unavailable in this runtime");
  }
  cryptoObject.getRandomValues(bytes);
  return toHex(bytes);
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
