import { NextResponse, type NextRequest } from "next/server";

import { COPY_VARIANT_HEADER, resolveCopyVariant } from "@/lib/analytics/copy-variant";
import { NO_STORE, contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";

/**
 * Request proxy: security headers, per-request CSP nonce, and an anonymous session cookie.
 *
 * This is the `proxy` convention that replaced `middleware` in Next 16; it runs before every
 * HTML and API response.
 *
 * The nonce has to be generated per request and reach the renderer, which is the whole reason
 * this cannot be a static header list in `next.config.ts`. Next picks it up from the request
 * headers set below and attaches it to the scripts it injects itself.
 *
 * The session cookie is not authentication and grants nothing. It exists so rate limiting has
 * something to key on when a runtime does not forward a client IP. It holds sixteen random hex
 * characters, nothing derived from the customer, and it is `SameSite=Lax` so that the redirect
 * back from Stripe still carries it.
 */

const SESSION_COOKIE = "sr_sid";
const SESSION_MAX_AGE = 60 * 60 * 12;

/** Routes that can hold live statement data, and therefore get the stricter policy. */
function isProcessingPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/") || pathname.startsWith("/checkout");
}

export default function proxy(request: NextRequest): NextResponse {
  const production = process.env.NODE_ENV === "production";
  const nonce = generateNonce();
  const { pathname } = request.nextUrl;
  const processing = isProcessingPath(pathname);

  // The first-party GA4 relay does not need an external browser connection.
  // Ignore stale Plausible hosts after switching the provider.
  const analyticsOrigin =
    process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "plausible"
      ? process.env.NEXT_PUBLIC_ANALYTICS_HOST?.trim()
      : undefined;
  const csp = contentSecurityPolicy({
    ...(processing ? { nonce } : {}),
    processing,
    development: !production,
    connectSrc: analyticsOrigin ? [safeOrigin(analyticsOrigin)] : [],
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const existingSessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSessionId ?? generateSessionId();
  const previewOverride = request.nextUrl.searchParams.get("copy_variant");
  const copyVariant = resolveCopyVariant(sessionId, previewOverride, process.env.VERCEL_ENV);
  requestHeaders.set(COPY_VARIANT_HEADER, copyVariant);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", csp);
  for (const [name, value] of Object.entries(securityHeaders({ production }))) {
    response.headers.set(name, value);
  }

  if (processing || pathname.startsWith("/api/")) {
    response.headers.set("cache-control", NO_STORE);
    // Belt and braces with the route-level metadata: these URLs must never be indexed,
    // archived, or cached, because they can render somebody's statement.
    response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  }

  if (!existingSessionId) {
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  return response;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function generateSessionId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Reduce a configured analytics URL to a bare origin so it cannot widen the policy. */
function safeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "'self'";
  }
}

export const config = {
  /*
   * Everything except Next's own immutable static output. Those assets carry no HTML and no
   * statement data, so running this on them would add latency for no security benefit.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|txt|xml|webmanifest)$).*)",
  ],
};
