"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { captureAttribution } from "@/lib/analytics/attribution";
import { track } from "@/lib/analytics/client";

/**
 * Page-view and attribution reporting.
 *
 * Rendered once in the root layout. When analytics is disabled — which is the default, and
 * which is also the case for anyone sending Do Not Track or Global Privacy Control — every
 * call in here is a no-op and no network request is made.
 *
 * The path is reported without its query string, so a Stripe session id or a job id in the
 * URL never reaches an analytics vendor.
 */
export function PageAnalytics() {
  const pathname = usePathname();
  const attributed = useRef(false);

  useEffect(() => {
    if (!attributed.current) {
      attributed.current = true;
      const attribution = captureAttribution();
      if (attribution.source || attribution.campaign) {
        track("campaign_landed", {
          source: attribution.source,
          medium: attribution.medium,
          campaign: attribution.campaign,
          landingPath: attribution.landingPath,
        });
      }
    }
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
