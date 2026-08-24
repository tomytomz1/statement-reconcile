"use client";

import { flags } from "@/config/flags";
import { siteConfig } from "@/config/site";

import type { AnalyticsEventMap, AnalyticsEventName } from "./events";

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
  return consent() === "allowed";
}

export function track<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventMap[E],
): void {
  if (!analyticsEnabled()) return;
  try {
    switch (siteConfig.analytics.provider) {
      case "plausible":
        sendPlausible(event, properties);
        break;
      case "vercel":
        sendVercel(event, properties);
        break;
      default:
        break;
    }
  } catch {
    // Measurement is never allowed to break the funnel.
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
