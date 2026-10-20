import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { flags } from "@/config/flags";
import {
  checkRateLimit,
  clientIdentity,
  rateLimitMisconfigured,
} from "@/lib/security/rate-limit";

/**
 * First-party, marketing-only GA4 Measurement Protocol relay.
 * No Google script, SDK, or pixel executes in a visitor's browser, so a third-party
 * script has no opportunity to inspect same-origin financial IndexedDB data.
 *
 * Strict allowlist: never forward free-form event props, search params,
 * filenames, statement content, account identifiers or checkout information.
 */
const MARKETING_PATH = /^\/(?:[a-z0-9-]{1,100})?$/;
const CLIENT_ID = /^\d{1,10}\.\d{13}$/;
const SESSION_ID = /^\d{10,13}$/;
const ALLOWED_EVENTS = new Set(["page_view", "pricing_viewed"]);

export async function POST(request: Request): Promise<Response> {
  if (process.env.VERCEL_ENV !== "production" ||
      !flags.analytics || siteConfig.analytics.provider !== "ga4") {
    return new Response(null, { status: 204 });
  }

  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MEASUREMENT_API_SECRET;
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId) || !apiSecret) {
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  const canonicalOrigin = new URL(siteConfig.url).origin;
  if (origin !== canonicalOrigin || rateLimitMisconfigured()) {
    return new Response(null, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > 512) {
    return new Response(null, { status: 413 });
  }

  const identity = await clientIdentity(request);
  const limit = await checkRateLimit({ name: "ga4-marketing", limit: 80, windowSeconds: 60 }, identity);
  if (!limit.allowed) return new Response(null, { status: 429 });

  // Limit the actual body size, including requests with no Content-Length header.
  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 512) return new Response(null, { status: 413 });
    input = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return new Response(null, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const eventName = body.event;
  const path = body.path;
  const clientId = body.clientId;
  const sessionId = body.sessionId;

  if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName) ||
      typeof path !== "string" || !MARKETING_PATH.test(path) ||
      typeof clientId !== "string" || !CLIENT_ID.test(clientId) ||
      typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
    return new Response(null, { status: 400 });
  }

  // GA receives only the canonical public-page URL and coarse session identifiers.
  // Advertising consent is explicitly denied and no arbitrary props are forwarded.
  const params = {
    page_location: `${canonicalOrigin}${path}`,
    session_id: sessionId,
    engagement_time_msec: 100,
  };
  const payload = {
    client_id: clientId,
    consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
    events: [{ name: eventName, params }],
  };

  try {
    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.set("measurement_id", measurementId);
    url.searchParams.set("api_secret", apiSecret);
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    // HTTP 2xx is NOT evidence of an accepted event; verify through Realtime.
    if (!response.ok) return new Response(null, { status: 502 });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 502 });
  }
}
