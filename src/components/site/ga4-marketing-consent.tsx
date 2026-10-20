"use client";

import { useEffect, useState } from "react";
import { flags } from "@/config/flags";
import { siteConfig } from "@/config/site";
import { track } from "@/lib/analytics/client";

const CONSENT_KEY = "sr_ga4_marketing_consent";

type Choice = "loading" | "unset" | "granted" | "denied" | "browser_denied";

function browserPrivacyDenies(): boolean {
  const privacy = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean };
  return (
    privacy.globalPrivacyControl === true ||
    privacy.doNotTrack === "1" ||
    privacy.doNotTrack === "yes"
  );
}

/**
 * Consent for OPTIONAL marketing analytics only. Never loads a Google script:
 * the opt-in page-view is sent to a first-party endpoint.
 * This component is mounted solely in the public (site) route group.
 */
export function Ga4MarketingConsent() {
  const [choice, setChoice] = useState<Choice>("loading");
  const [editing, setEditing] = useState(false);
  const configured = flags.analytics && siteConfig.analytics.provider === "ga4";

  useEffect(() => {
    if (!configured) return;
    if (browserPrivacyDenies()) {
      setChoice("browser_denied");
      return;
    }
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      setChoice(stored === "granted" || stored === "denied" ? stored : "unset");
    } catch {
      setChoice("denied");
    }
  }, [configured]);

  if (!configured || choice === "loading") return null;

  function choose(granted: boolean) {
    try {
      localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
    } catch {
      setChoice("denied");
      setEditing(false);
      return;
    }
    setChoice(granted ? "granted" : "denied");
    setEditing(false);
    // This call occurs only on a real user opt-in. Never send a view on opt-out.
    if (granted && !browserPrivacyDenies()) {
      track("page_view", { path: window.location.pathname });
    }
  }

  if (choice === "browser_denied") return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 max-w-sm text-sm">
      {choice === "unset" || editing ? (
        <section
          role="dialog"
          aria-label="Analytics preferences"
          className="rounded-lg border border-slate-300 bg-white p-4 shadow-lg"
        >
          <p className="font-semibold">Optional website analytics</p>
          <p className="mt-2 text-slate-700">
            Allow Google Analytics to count visits to our public marketing pages? No Google scripts
            run in your browser. We never report bank statements, transactions, filenames, or
            anything entered into the converter. Your choice is optional and can be changed later.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded border px-3 py-2"
              type="button"
              onClick={() => choose(false)}
            >
              Decline
            </button>
            <button
              className="rounded bg-blue-700 px-3 py-2 text-white"
              type="button"
              onClick={() => choose(true)}
            >
              Allow analytics
            </button>
          </div>
        </section>
      ) : (
        <button
          className="rounded bg-white/95 px-2 py-1 text-xs text-slate-600 underline shadow-sm"
          type="button"
          onClick={() => setEditing(true)}
        >
          Analytics preferences
        </button>
      )}
    </div>
  );
}
