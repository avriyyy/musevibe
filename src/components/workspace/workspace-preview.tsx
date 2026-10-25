import React from "react";
import {
  Sparkles,
  FileText,
  GitBranch,
  Palette,
  Code2,
  CheckCircle2,
} from "lucide-react";

/**
 * WorkspacePreview — static, single-screen preview for the landing page.
 * Shows a simplified visual of the 5-stage pipeline without interactive controls.
 * The full workspace is at /workspace.
 */
export default function WorkspacePreview() {
  const steps = [
    {
      icon: <Sparkles className="w-4 h-4 text-[#1E6BFF]" />,
      label: "Prompt",
      done: true,
    },
    {
      icon: <FileText className="w-4 h-4 text-sky-400" />,
      label: "Spesifikasi",
      done: true,
    },
    {
      icon: <GitBranch className="w-4 h-4 text-indigo-400" />,
      label: "Rencana Kerja",
      done: true,
    },
    {
      icon: <Palette className="w-4 h-4 text-violet-400" />,
      label: "Desain",
      done: true,
    },
    {
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
      label: "Kode",
      done: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0E1017] overflow-hidden shadow-2xl shadow-black/40">
      {/* Window chrome */}
      <div className="h-10 bg-[#080B10] border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/60" />
          <span className="w-3 h-3 rounded-full bg-amber-500/60" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          musevibe — workspace
        </span>
        <div className="w-10" />
      </div>

      <div className="p-6 sm:p-8 flex flex-col gap-6">
        {/* Prompt input mock */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Promptmu
          </label>
          <div className="rounded-xl bg-[#080B10] border border-white/10 px-4 py-3 text-sm text-slate-300 font-mono leading-relaxed">
            Buat aplikasi manajemen tugas tim dengan login Google dan notifikasi
            real-time.
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Alur pembuatan
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0">
            {steps.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-2 sm:flex-col sm:items-center sm:gap-1.5 sm:flex-1">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block h-px flex-1 bg-white/10 mx-1" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Output mock */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Hasil
          </label>
          <div className="rounded-xl bg-[#080B10] border border-white/10 p-4 font-mono text-xs text-slate-400 leading-relaxed overflow-hidden">
            <p>
              <span className="text-emerald-400">✓</span>{" "}
              <span className="text-slate-300">PRD.md</span> — 2 halaman
              spesifikasi
            </p>
            <p>
              <span className="text-emerald-400">✓</span>{" "}
              <span className="text-slate-300">tasks.json</span> — 14 tugas
              terurut
            </p>
            <p>
              <span className="text-emerald-400">✓</span>{" "}
              <span className="text-slate-300">design-tokens.ts</span> —
              komponen siap pakai
            </p>
            <p>
              <span className="text-emerald-400">✓</span>{" "}
              <span className="text-slate-300">src/</span> — kode Next.js siap
              produksi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
