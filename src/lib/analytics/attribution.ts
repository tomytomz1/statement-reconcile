"use client";

/**
 * First-touch attribution.
 *
 * Knowing which SEO page or campaign produced a paying customer is what makes the content
 * plan steerable, so the campaign parameters from the first page of a visit are kept for
 * the length of that visit.
 *
 * They live in `sessionStorage`, not a cookie: they are gone when the tab closes, they are
 * never sent to our server, and there is nothing to disclose in a cookie banner. Values are
 * restricted to a short, harmless character set, because a UTM parameter is attacker-
 * controlled text that arrives in a URL.
 */

const STORAGE_KEY = "sr_attr_v1";
const MAX_VALUE = 64;

export type Attribution = {
  source: string;
  medium: string;
  campaign: string;
  landingPath: string;
  referrerOrigin: string;
};

const EMPTY: Attribution = {
  source: "",
  medium: "",
  campaign: "",
  landingPath: "",
  referrerOrigin: "",
};

function clean(value: string | null): string {
  if (!value) return "";
  return value
    .slice(0, MAX_VALUE)
    .toLowerCase()
    .replace(/[^a-z0-9._/\- ]/g, "")
    .trim();
}

/**
 * Record attribution if this is the first page of the visit.
 *
 * First touch wins: a customer who arrives from a search result and then clicks an internal
 * link should still be credited to the search result.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as Attribution;

    const params = new URLSearchParams(window.location.search);
    const referrer = safeReferrerOrigin();
    const attribution: Attribution = {
      source: clean(params.get("utm_source")) || (referrer ? "referral" : "direct"),
      medium: clean(params.get("utm_medium")) || (referrer ? "referral" : "none"),
      campaign: clean(params.get("utm_campaign")),
      landingPath: window.location.pathname.slice(0, 120),
      referrerOrigin: referrer,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    // Private browsing modes can throw on sessionStorage access. Attribution is optional.
    return EMPTY;
  }
}

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function safeReferrerOrigin(): string {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    const origin = new URL(document.referrer).origin;
    return origin === window.location.origin ? "" : origin.slice(0, MAX_VALUE);
  } catch {
    return "";
  }
}
