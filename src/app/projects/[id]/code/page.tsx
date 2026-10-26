"use client";
import { use, useState } from "react";
import { useVibe } from "@/lib/store";

export default function CodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { filesByProject, updateFile } = useVibe();
  const files = filesByProject[id] || [];
  const [activeId, setActiveId] = useState(files[0]?.id || "");
  const active = files.find((f) => f.id === activeId) || files[0];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-label="Editor">
        <h1 className="text-[17px] font-bold">Editor</h1>
        <div className="mt-3 rounded-xl border border-line bg-white shadow-sm overflow-hidden">
          {files.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[15px] font-semibold">No files yet.</p>
              <p className="mt-1 text-[13px] text-muted">Next: a button that scaffolds a starter from the PRD.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 border-b border-line px-3 pt-2" role="tablist" aria-label="Files">
                {files.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={f.id === active?.id}
                    onClick={() => setActiveId(f.id)}
                    className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px font-code ${
                      f.id === active?.id ? "text-meta border-meta" : "text-muted border-transparent hover:text-ink"
                    }`}
                  >
                    {f.path}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {active ? (
                  <label className="grid gap-1.5 text-[13px] font-medium text-muted">
                    {active.path}, full editor coming next
                    <textarea
                      value={active.content}
                      onChange={(e) => updateFile(id, active.id, e.target.value)}
                      rows={20}
                      spellCheck={false}
                      className="px-3.5 py-2.5 rounded-lg border border-line bg-white text-ink text-[12px] leading-relaxed font-code focus:border-meta focus:outline-none focus:ring-2 focus:ring-meta/30"
                    />
                  </label>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
      <section aria-label="Preview">
        <h2 className="text-[17px] font-bold">Preview</h2>
        <div className="mt-3 rounded-xl border border-line bg-white shadow-sm p-4">
          <p className="text-[13px] text-muted">Safe preview next: sandbox plus zip export.</p>
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-wash p-4 font-code text-[12px] leading-relaxed whitespace-pre-wrap">
            {active?.content || "Select a file to see its contents."}
          </pre>
        </div>
      </section>
    </div>
  );
}
