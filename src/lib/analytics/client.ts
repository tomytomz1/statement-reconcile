"use client";

import { flags } from "@/config/flags";
import { isPublicMarketingPath } from "./marketing-paths";
import { siteConfig } from "@/config/site";

import type { AnalyticsEventMap, AnalyticsEventName } from "./events";
import { COPY_VARIANT_STORAGE_KEY, isCopyVariant } from "./copy-variant";

/**
 * Analytics transport.
 *
 * Three properties matter more than the choice of vendor:
 *
 * 1. It is off unless explicitly enabled, and when off no analytics code runs and no
 *    request is made. `track()` becomes a no-op, not a queue.
 * 2. No vendor script is loaded on `/app`. The processing route runs under a CSP that
 *    forbids third-party script, so measurement there is a first-party `fetch` to the
 *    vendor's own endpoint or nothing at all.
 * 3. Do Not Track and Global Privacy Control are honoured. A customer who has asked not to
 *    be measured is not measured, and the product works identically either way.
 *
 * The provider is resolved from configuration rather than imported, so swapping vendors is
 * a deployment change and the call sites never move.
 */

type Consent = "allowed" | "denied";

function consent(): Consent {
  if (typeof navigator === "undefined") return "denied";
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true) return "denied";
  const dnt = nav.doNotTrack ?? (globalThis as { doNotTrack?: string }).doNotTrack;
  if (dnt === "1" || dnt === "yes") return "denied";
  return "allowed";
}

export function analyticsEnabled(): boolean {
  if (!flags.analytics) return false;
  if (siteConfig.analytics.provider === "none") return false;
  if (consent() !== "allowed") return false;
  if (siteConfig.analytics.provider === "ga4") {
    try {
      // No event enrichment, attribution reads, or telemetry before opt-in.
      return (
        typeof window !== "undefined" &&
        window.localStorage.getItem("sr_ga4_marketing_consent") === "granted"
      );
    } catch {
      return false;
    }
  }
  return true;
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (!analyticsEnabled()) return;
  try {
    const enriched = withCopyVariant(properties);
    switch (siteConfig.analytics.provider) {
      case "plausible":
        sendPlausible(event, enriched);
        break;
      case "vercel":
        sendVercel(event, enriched);
        break;
      case "ga4":
        sendFirstPartyGa4(event);
        break;
      default:
        break;
    }
  } catch {
    // Measurement is never allowed to break the funnel.
  }
}

function withCopyVariant(properties: Record<string, unknown>): Record<string, unknown> {
  if (properties.copyVariant !== undefined || typeof sessionStorage === "undefined") {
    return properties;
  }
  try {
    const variant = sessionStorage.getItem(COPY_VARIANT_STORAGE_KEY);
    return isCopyVariant(variant) ? { ...properties, copyVariant: variant } : properties;
  } catch {
    return properties;
  }
}

/**
 * Plausible's event endpoint, called directly.
 *
 * Using the API instead of their script keeps the CSP free of a third-party `script-src`
 * and means nothing runs before the customer's first interaction.
 */
function sendPlausible(event: string, properties: Record<string, unknown>): void {
  const domain = siteConfig.analytics.key || siteConfig.domain;
  const host = siteConfig.analytics.host || "https://plausible.io";
  const body = JSON.stringify({
    name: event === "page_view" ? "pageview" : event,
    domain,
    url: locationUrl(),
    referrer: safeReferrer(),
    props: stringifyProps(properties),
  });
  void fetch(`${host.replace(/\/$/, "")}/api/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    mode: "cors",
    credentials: "omit",
  }).catch(() => undefined);
}

function sendVercel(event: string, properties: Record<string, unknown>): void {
  const queue = (globalThis as { va?: (...args: unknown[]) => void }).va;
  if (typeof queue !== "function") return;
  queue("event", { name: event, data: stringifyProps(properties) });
}

/**
 * The URL as reported to analytics.
 *
 * Query strings and fragments are dropped. A job id or a Stripe session id in a query
 * parameter is not statement content, but it is a correlator we have no reason to hand to
 * a third party.
 */
function locationUrl(): string {
  if (typeof location === "undefined") return siteConfig.url;
  return `${location.origin}${location.pathname}`;
}

/** Only the referring origin is kept, never the referring path. */
function safeReferrer(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

function stringifyProps(properties: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null) continue;
    output[key] = String(value).slice(0, 64);
  }
  return output;
}

/**
 * GA4 requires an explicit opt-in, and only public marketing events are relayed.
 * Unlike gtag.js, no third-party JavaScript executes on this financial site's
 * origin, which also stores sealed statement data in IndexedDB.
 */
let ephemeralGa4Session: { clientId: string; sessionId: string } | null = null;

function sendFirstPartyGa4(event: string): void {
  if (event !== "page_view" && event !== "pricing_viewed") return;
  if (typeof window === "undefined") return;
  if (window.location.origin !== siteConfig.url) return;
  if (!isPublicMarketingPath(window.location.pathname)) return;
  try {
    if (localStorage.getItem("sr_ga4_marketing_consent") !== "granted") return;
    if (!ephemeralGa4Session) {
      const bits = new Uint32Array(1);
      crypto.getRandomValues(bits);
      ephemeralGa4Session = {
        clientId: `${bits[0]}.${Date.now()}`,
        sessionId: String(Math.floor(Date.now() / 1000)),
      };
    }
    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        event,
        path: window.location.pathname,
        clientId: ephemeralGa4Session.clientId,
        sessionId: ephemeralGa4Session.sessionId,
      }),
    }).catch(() => undefined);
  } catch {
    // Analytics must not interfere with the site.
  }
}
