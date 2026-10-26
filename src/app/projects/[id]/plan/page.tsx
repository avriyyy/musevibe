"use client";
import { use, useState } from "react";
import { useVibe, seedId } from "@/lib/store";
import { loadPlanFromSupabase, savePlanToSupabase } from "@/lib/supabase/sync";

type Status = "todo" | "doing" | "done";
const NEXT: Record<Status, Status | null> = { todo: "doing", doing: "done", done: null };
const BADGE: Record<Status, string> = {
  todo: "bg-wash text-muted",
  doing: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
};

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { projects, prdByProject, setPrd, tasksByProject, setTasks, moveTask } = useVibe();
  const prd = prdByProject[id] || "";
  const tasks = tasksByProject[id] || [];
  const project = projects.find((p) => p.id === id);
  const [idea, setIdea] = useState(() => (prd === "" ? project?.idea || "" : ""));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [newTask, setNewTask] = useState("");

  async function callAI(kind: "prd" | "tasks", prompt: string) {
    const r = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, prompt }),
    });
    if (!r.ok) throw new Error("The AI did not respond");
    const d = await r.json();
    return d.text as string;
  }

  const generateAll = async () => {
    setBusy(true); setMsg(""); setErr("");
    try {
      const prompt = idea || prd || "indie app";
      const md = await callAI("prd", prompt);
      setPrd(id, md);
      const tasksRaw = await callAI("tasks", md.slice(0, 800));
      try {
        const parsed = JSON.parse(tasksRaw);
        if (Array.isArray(parsed)) {
          setTasks(id, parsed.slice(0, 8).map((t: { title: string; status: string }) => ({
            id: seedId(), title: String(t.title || "task"), status: (t.status as Status) || "todo",
          })));
        }
      } catch { /* local draft, keep going */ }
      setMsg("PRD and tasks updated from the AI draft.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create the PRD. Try again.");
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true); setErr("");
    const r = await savePlanToSupabase(id, prd, tasks);
    setMsg(r.ok ? "Saved to Supabase." : "This ID is local-only. New UUID projects sync to Supabase automatically.");
    setBusy(false);
  };

  const load = async () => {
    setBusy(true); setErr("");
    const d = await loadPlanFromSupabase(id);
    if (d && (d.prd || d.tasks.length)) {
      if (d.prd) setPrd(id, d.prd);
      if (d.tasks.length) setTasks(id, d.tasks);
      setMsg("Loaded from Supabase.");
    } else {
      setMsg("No Supabase data for this ID. Showing local data.");
    }
    setBusy(false);
  };

  const counts: Record<Status, number> = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const inputCls =
    "px-3.5 py-2.5 rounded-lg border border-line bg-white text-[14px] placeholder:text-muted/70 focus:border-meta focus:outline-none focus:ring-2 focus:ring-meta/30";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-label="PRD">
        <h1 className="text-[17px] font-bold">PRD</h1>
        <p className="mt-0.5 text-[13px] text-muted">One source of context for Design and Code.</p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-[13px] font-medium">
            Idea, one sentence
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. a habit tracker that never guilt-trips" className={inputCls} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={generateAll} disabled={busy} className="px-[22px] py-2.5 rounded-full bg-meta text-white text-[14px] font-semibold hover:bg-meta-hover active:bg-meta-pressed disabled:opacity-50">
              {busy ? "Working" : "Create PRD + Tasks"}
            </button>
            <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-full border border-line bg-white text-[14px] font-semibold hover:bg-wash disabled:opacity-50">
              Save
            </button>
            <button onClick={load} disabled={busy} className="px-5 py-2.5 rounded-full text-[14px] font-semibold text-muted hover:bg-wash disabled:opacity-50">
              Load
            </button>
          </div>
          {msg ? <p className="text-[13px] text-muted">{msg}</p> : null}
          {err ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
              <p className="text-[14px] font-semibold text-red-800">Could not create the PRD</p>
              <p className="text-[13px] text-red-700">{err}</p>
            </div>
          ) : null}
          {prd === "" ? (
            <div className="rounded-lg border border-dashed border-line p-5">
              <p className="text-[14px] font-semibold">The PRD is still empty.</p>
              <p className="mt-1 text-[13px] text-muted">Fill in the idea above and create it, or write it manually below.</p>
            </div>
          ) : null}
          <label className="grid gap-1.5 text-[13px] font-medium">
            PRD body (markdown)
            <textarea value={prd} onChange={(e) => setPrd(id, e.target.value)} rows={16} spellCheck={false} className={`${inputCls} font-code text-[12px] leading-relaxed`} />
          </label>
        </div>
      </section>

      <section aria-label="Tasks">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold">Tasks</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-wash text-[12px] font-semibold text-muted">{tasks.length}</span>
        </div>
        <div className="mt-4 grid gap-4">
          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTask.trim()) {
                  setTasks(id, [...tasks, { id: seedId(), title: newTask.trim(), status: "todo" }]);
                  setNewTask("");
                }
              }}
              placeholder="Add a task, Enter to save"
              aria-label="New task"
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={() => { if (!newTask.trim()) return; setTasks(id, [...tasks, { id: seedId(), title: newTask.trim(), status: "todo" }]); setNewTask(""); }}
              className="px-5 py-2.5 rounded-full bg-ink text-white text-[14px] font-semibold hover:opacity-90"
            >
              Add
            </button>
          </div>
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-6 text-center">
              <p className="text-[14px] font-semibold">No tasks yet.</p>
              <p className="mt-1 text-[13px] text-muted">Create them from the PRD or add one manually above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {(["todo", "doing", "done"] as const).map((st) => (
                <div key={st} className="rounded-lg bg-wash p-2 min-h-40">
                  <div className="flex items-center justify-between px-1.5 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{st}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${BADGE[st]}`}>{counts[st]}</span>
                  </div>
                  <div className="grid gap-2">
                    {tasks.filter((t) => t.status === st).map((t) => (
                      <article key={t.id} className={`bg-white border border-line border-l-4 rounded-lg p-2.5 ${st === "done" ? "border-l-green-600" : st === "doing" ? "border-l-amber-500" : "border-l-line"}`}>
                        <p className="text-[13px] leading-snug font-medium">{t.title}</p>
                        <div className="flex gap-1 mt-2">
                          {st !== "todo" ? (
                            <button onClick={() => moveTask(id, t.id, "todo")} aria-label={`Move ${t.title} back to todo`} className="text-[12px] font-semibold border border-line rounded-full px-2.5 py-0.5 hover:bg-wash">←</button>
                          ) : null}
                          {NEXT[st] ? (
                            <button onClick={() => moveTask(id, t.id, NEXT[st] as Status)} aria-label={`Move ${t.title} to ${NEXT[st]}`} className="text-[12px] font-semibold border border-line rounded-full px-2.5 py-0.5 hover:bg-wash">→</button>
                          ) : null}
                          <button onClick={() => setTasks(id, tasks.filter((x) => x.id !== t.id))} aria-label={`Delete ${t.title}`} className="text-[12px] font-semibold rounded-full px-2.5 py-0.5 ml-auto text-muted hover:text-red-700 hover:bg-red-50">Delete</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
