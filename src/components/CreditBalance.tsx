"use client";

import { useEffect, useRef, useState } from "react";
import { CREDITS_CHANGED_EVENT } from "@/lib/credits";
import { authFetch } from "@/lib/supabase/client";

export interface CreditBalanceState {
  balance: number;
  daily: number;
  projectCost: number;
  resetDate: string;
  resetsAt: string;
}

export interface CreditBalanceLoad {
  /** Latest known balance. Null until the first successful load. */
  state: CreditBalanceState | null;
  /** True when the last load failed and no balance is known yet. */
  failed: boolean;
}

/**
 * Daily-credit balance for the signed-in account. Refetches after project
 * creation and when the tab regains focus, so the pill never shows a
 * balance that was already spent.
 */
export function useCreditBalance(): CreditBalanceLoad {
  const [state, setState] = useState<CreditBalanceState | null>(null);
  const [failed, setFailed] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await authFetch("/api/credits");
        if (!response.ok) throw new Error("credit load failed");
        const data = (await response.json()) as Partial<CreditBalanceState>;
        if (
          !alive ||
          typeof data.balance !== "number" ||
          typeof data.daily !== "number" ||
          typeof data.projectCost !== "number"
        ) {
          return;
        }
        setState({
          balance: data.balance,
          daily: data.daily,
          projectCost: data.projectCost,
          resetDate: typeof data.resetDate === "string" ? data.resetDate : "",
          resetsAt: typeof data.resetsAt === "string" ? data.resetsAt : "",
        });
        loadedRef.current = true;
        setFailed(false);
      } catch {
        // Keep a previously loaded balance; only report failure when there
        // is nothing to show yet.
        if (!alive || loadedRef.current) return;
        setFailed(true);
      }
    };
    void load();
    const reload = () => void load();
    window.addEventListener(CREDITS_CHANGED_EVENT, reload);
    window.addEventListener("focus", reload);
    return () => {
      alive = false;
      window.removeEventListener(CREDITS_CHANGED_EVENT, reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  return { state, failed };
}

/** Compact balance pill for app headers. Renders nothing while loading. */
export default function CreditBalance() {
  const { state: credits } = useCreditBalance();
  if (!credits) return null;
  return (
    <span
      title={`Daily credits — creating a project uses ${credits.projectCost}`}
      className="inline-flex h-9 items-center rounded-full border border-white/15 bg-white/5 px-3 text-[12px] font-medium text-[#e5e7eb]"
    >
      {credits.balance} credit{credits.balance === 1 ? "" : "s"}
    </span>
  );
}
