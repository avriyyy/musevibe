"use client";

import { useLayoutEffect } from "react";
import { useVibe } from "@/lib/store";
import { startCloudSync } from "@/lib/supabase/sync";

/**
 * Hydrates the browser cache before paint, then starts account-scoped Neon
 * sync. Account caches stay owner-tagged and are only shown to the matching
 * session; legacy browser data remains unchanged and is never auto-uploaded.
 */
export default function StoreHydrator() {
  useLayoutEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | undefined;

    void (async () => {
      await useVibe.persist.rehydrate();
      if (!cancelled) stopSync = startCloudSync();
    })();

    return () => {
      cancelled = true;
      stopSync?.();
    };
  }, []);

  return null;
}
