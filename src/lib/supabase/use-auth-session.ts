"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabaseBrowser } from "./client";

/** Keeps optional account UI in sync without gating the local workspace. */
export function useAuthSession() {
  const configured = isSupabaseAuthConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return;

    let active = true;
    const client = supabaseBrowser();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setReady(true);
    });

    void client.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  return { user, ready, configured };
}
