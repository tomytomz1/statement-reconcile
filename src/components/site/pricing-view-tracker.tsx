"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";

/**
 * Records that someone read the pricing page.
 *
 * `page_view` already fires for every path, but the funnel question is narrower: how many
 * visitors go looking for the price before converting, and how many of those go on to
 * upload. Keeping it as its own event means that ratio survives any later change to how
 * page views are counted.
 */
export function PricingViewTracker() {
  useEffect(() => {
    track("pricing_viewed", {});
  }, []);

  return null;
}
