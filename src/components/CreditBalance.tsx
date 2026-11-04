"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/supabase/client";

export interface CreditBalanceState {
  balance: number;
  daily: number;
  projectCost: number;
  resetDate: string;
  resetsAt: string;
}

/** Daily-credit balance for the signed-in account. Null while loading. */
export function useCreditBalance(): CreditBalanceState | null {
  const [state, setState] = useState<CreditBalanceState | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await authFetch("/api/credits");
        if (!response.ok) return;
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
      } catch {
        // Balance stays hidden when credit storage is unreachable.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/** Compact balance pill for app headers. Renders nothing while loading. */
export default function CreditBalance() {
  const credits = useCreditBalance();
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
