"use client";
import { use } from "react";
import Link from "next/link";
import { useVibe } from "@/lib/store";

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { screensByProject, tasksByProject } = useVibe();
  const screens = screensByProject[id] || [];
  const tasks = tasksByProject[id] || [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section aria-label="Wireframe">
        <h1 className="text-[17px] font-bold">Wireframe</h1>
        <p className="mt-0.5 text-[13px] text-muted">The drawing canvas is still being prepared. Its data structure is ready.</p>
        <div className="mt-4">
          {screens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-8 text-center">
              <p className="text-[15px] font-semibold">No screens yet.</p>
              <p className="mt-1 text-[13px] text-muted">Next: add Landing, Dashboard, and Detail screens. Each screen links to one Plan task.</p>
            </div>
          ) : null}
        </div>
      </section>
      <aside className="rounded-xl border border-line bg-white shadow-sm h-fit overflow-hidden" aria-label="Linked tasks">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="text-[14px] font-semibold">Linked tasks ({tasks.length})</h2>
        </div>
        <ul className="divide-y divide-line">
          {tasks.slice(0, 6).map((t) => (
            <li key={t.id} className="px-4 py-2.5 text-[13px] flex items-center gap-2.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${t.status === "done" ? "bg-green-600" : t.status === "doing" ? "bg-amber-500" : "bg-line"}`}
                aria-hidden
              />
              <span className="flex-1 font-medium truncate">{t.title}</span>
              <span className="font-code text-[11px] text-muted">{t.status}</span>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-muted">
              Fill these in on the <Link href={`/projects/${id}/plan`} className="text-meta font-medium hover:underline">Plan tab</Link>.
            </li>
          )}
        </ul>
      </aside>
    </div>
  );
}
