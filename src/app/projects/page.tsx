"use client";
import { useState } from "react";
import Link from "next/link";
import { AppTopNav } from "@/components/AppTopNav";
import { useVibe, seedId } from "@/lib/store";

export default function ProjectsPage() {
  const { projects, addProject } = useVibe();
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");

  const create = () => {
    if (!name.trim()) return;
    addProject({ id: seedId(), name: name.trim(), idea: idea.trim() || name.trim(), createdAt: new Date().toISOString() });
    setName(""); setIdea("");
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopNav items={[{ label: "Projects", href: "/projects" }]} selected="/projects" />

      <main className="w-full max-w-[880px] mx-auto px-5 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-[14px] text-muted">Each project keeps its PRD, tasks, screens, and files in one flow.</p>
        </div>

        <section className="rounded-xl border border-line bg-white shadow-sm p-5" aria-label="New project">
          <h2 className="text-[15px] font-semibold">New project</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-[13px] font-medium">
              Project name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                placeholder="e.g. habit-tracker"
                className="px-3.5 py-2.5 rounded-lg border border-line bg-white text-[14px] font-normal placeholder:text-muted/70 focus:border-meta focus:outline-none focus:ring-2 focus:ring-meta/30"
              />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium">
              One-sentence idea
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                placeholder="e.g. a daily habit log that never guilt-trips"
                className="px-3.5 py-2.5 rounded-lg border border-line bg-white text-[14px] font-normal placeholder:text-muted/70 focus:border-meta focus:outline-none focus:ring-2 focus:ring-meta/30"
              />
            </label>
            <div>
              <button
                onClick={create}
                disabled={!name.trim()}
                className="px-[22px] py-2.5 rounded-full bg-meta text-white text-[14px] font-semibold hover:bg-meta-hover active:bg-meta-pressed disabled:opacity-40"
              >
                Create project
              </button>
            </div>
          </div>
        </section>

        <section aria-label="Project list">
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
              <p className="text-[15px] font-semibold">No projects yet.</p>
              <p className="mt-1 text-[14px] text-muted">Create one above to start the Plan to Code flow.</p>
            </div>
          ) : (
            <ul className="rounded-xl border border-line bg-white shadow-sm divide-y divide-line overflow-hidden">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}/plan`} className="block px-5 py-4 hover:bg-wash">
                    <span className="text-[15px] font-semibold">{p.name}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">{p.idea}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
