"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/client";
import { COPY_VARIANT_STORAGE_KEY, type CopyVariant } from "@/lib/analytics/copy-variant";

export function CopyVariantTracker({ variant }: { variant: CopyVariant }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(COPY_VARIANT_STORAGE_KEY, variant);
    } catch {
      // Storage is optional. Copy selection and the funnel work without it.
    }
    track("copy_variant_viewed", { copyVariant: variant });
  }, [variant]);

  return null;
}
