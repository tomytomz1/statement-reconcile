import { isProduction } from "@/config/env";
import { canonicalUrl } from "@/config/site";

/**
 * Origin validation for state-changing requests.
 *
 * The application has no cookie-authenticated session, so classic CSRF has little to
 * steal. Origin checking still matters for a different reason: it stops another site from
 * quietly using our parsing endpoint as free infrastructure, and it stops a page the
 * customer has open elsewhere from driving their statement through our API.
 *
 * Vercel preview deployments get unpredictable hostnames, so a request whose Origin
 * matches its own Host is accepted as same-origin.
 */

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  // Same-site navigations and non-browser clients may omit Origin entirely. A missing
  // Origin cannot be a cross-site browser request for a JSON POST, so it is allowed.
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("host");
  if (host && originHost === host) return true;

  try {
    if (originHost === new URL(canonicalUrl).host) return true;
  } catch {
    // canonicalUrl is validated at config load; ignore.
  }

  if (!isProduction() && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(originHost)) {
    return true;
  }

  return false;
}

/**
 * The origin to build absolute redirect URLs from.
 *
 * Stripe needs absolute success and cancel URLs. Using the request's own host means
 * preview deployments redirect back to themselves instead of to production, and local
 * development works without configuration. In production the canonical URL wins so a
 * spoofed Host header cannot redirect a customer somewhere else after payment.
 */
export function requestOrigin(request: Request): string {
  if (isProduction()) return canonicalUrl;
  const host = request.headers.get("host");
  if (!host || !/^[A-Za-z0-9.:_-]+$/.test(host)) return canonicalUrl;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const scheme =
    proto === "http" || proto === "https" ? proto : host.startsWith("localhost") ? "http" : "https";
  return `${scheme}://${host}`;
}

/** Reject anything that is not a JSON body, so a form POST cannot reach an API route. */
export function isJsonRequest(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().startsWith("application/json");
}

/**
 * Read a JSON body with a hard byte ceiling.
 *
 * `request.json()` will happily buffer whatever it is given. Reading the stream manually
 * and aborting past the limit is what keeps a decompression or oversize payload from
 * consuming the function's memory.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; reason: "too_large" | "malformed" }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_large" };

  const body = request.body;
  if (!body) return { ok: false, reason: "malformed" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(merged)) };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
