import { supabaseBrowser } from "./client";
import type { Task } from "../types";

function hasEnv() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function savePlanToSupabase(projectId: string, prd: string, tasks: Task[]) {
  if (!hasEnv()) return { ok: false, reason: "no-env" as const };
  // projectId lokal bisa non-uuid (demo-indie). Supabase butuh uuid -> skip save, tetap local.
  const isUuid = /^[0-9a-f-]{36}$/i.test(projectId);
  if (!isUuid) return { ok: false, reason: "local-id" as const };
  try {
    const sb = supabaseBrowser();
    await sb.from("prds").upsert({ project_id: projectId, markdown: prd });
    await sb.from("tasks").delete().eq("project_id", projectId);
    if (tasks.length) {
      await sb.from("tasks").insert(
        tasks.map((t) => ({ project_id: projectId, title: t.title, status: t.status }))
      );
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, reason: "error", error: String(e) };
  }
}

export async function loadPlanFromSupabase(projectId: string) {
  if (!hasEnv()) return null;
  const isUuid = /^[0-9a-f-]{36}$/i.test(projectId);
  if (!isUuid) return null;
  try {
    const sb = supabaseBrowser();
    const [{ data: prd }, { data: tasks }] = await Promise.all([
      sb.from("prds").select("markdown").eq("project_id", projectId).single(),
      sb.from("tasks").select("id,title,status").eq("project_id", projectId),
    ]);
    return {
      prd: (prd as { markdown: string } | null)?.markdown || "",
      tasks: ((tasks as { id: string; title: string; status: string }[]) || []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status as Task["status"],
      })),
    };
  } catch {
    return null;
  }
}
