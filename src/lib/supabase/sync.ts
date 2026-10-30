import { supabaseBrowser } from "./client";
import type { Task } from "../types";

function hasEnv() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// NOTE (sync-not-ready): Supabase sync is intentionally disabled.
// RLS is enabled with no user policies (see supabase/schema.sql) and auth is
// deferred, so the anon key cannot read or write rows. Before enabling:
//  - add auth (sign-in) and per-user owner policies (auth.uid()) — never
//    disable RLS or use the service role in the browser,
//  - make task replacement atomic (single RPC/transaction: validate all
//    writes succeed before deleting anything),
//  - surface .error results fail-closed instead of reporting success.
// Until then this helper performs NO writes and reports sync-not-ready.

export async function savePlanToSupabase(projectId: string, prd: string, tasks: Task[]) {
  void prd;
  void tasks;
  if (!hasEnv()) return { ok: false, reason: "no-env" as const };
  // projectId lokal bisa non-uuid (demo-indie). Supabase butuh uuid -> skip save, tetap local.
  const isUuid = /^[0-9a-f-]{36}$/i.test(projectId);
  if (!isUuid) return { ok: false, reason: "local-id" as const };
  // Auth deferred + task replace is non-atomic: fail closed, no writes.
  return { ok: false as const, reason: "sync-not-ready" as const };
}

export async function loadPlanFromSupabase(projectId: string) {
  if (!hasEnv()) return null;
  const isUuid = /^[0-9a-f-]{36}$/i.test(projectId);
  if (!isUuid) return null;
  try {
    const sb = supabaseBrowser();
    const [prdRes, tasksRes] = await Promise.all([
      sb.from("prds").select("markdown").eq("project_id", projectId).maybeSingle(),
      sb.from("tasks").select("id,title,status").eq("project_id", projectId),
    ]);
    // Fail closed: RLS denial / network / query errors return null rather
    // than a fabricated empty plan.
    if (prdRes.error || tasksRes.error) return null;
    const prd = prdRes.data as { markdown: string } | null;
    const rows = (tasksRes.data ?? []) as { id: string; title: string; status: string }[];
    return {
      prd: prd?.markdown || "",
      tasks: rows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status as Task["status"],
      })),
    };
  } catch {
    return null;
  }
}
