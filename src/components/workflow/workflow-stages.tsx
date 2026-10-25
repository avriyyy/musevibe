import React from "react";
import { Sparkles, FileText, GitBranch, Palette, Code2 } from "lucide-react";

interface Stage {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    number: "01",
    title: "Prompt",
    description:
      "Tulis kebutuhan aplikasimu dalam bahasa sehari-hari. MuseVibe memahami konteks dan tujuanmu.",
    icon: <Sparkles className="w-5 h-5 text-[#1E6BFF]" />,
  },
  {
    number: "02",
    title: "Spesifikasi",
    description:
      "Prompt diubah menjadi dokumen spesifikasi (PRD) yang terstruktur: fitur, batasan, dan kriteria penerimaan.",
    icon: <FileText className="w-5 h-5 text-sky-400" />,
  },
  {
    number: "03",
    title: "Rencana Kerja",
    description:
      "Spesifikasi dipecah menjadi daftar tugas yang terurut dan siap dikerjakan oleh tim atau agen AI.",
    icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
  },
  {
    number: "04",
    title: "Desain",
    description:
      "Komponen antarmuka, warna, dan tata letak ditentukan secara konsisten sebelum kode ditulis.",
    icon: <Palette className="w-5 h-5 text-violet-400" />,
  },
  {
    number: "05",
    title: "Kode",
    description:
      "Kode Next.js siap produksi dihasilkan otomatis, lulus pengecekan TypeScript, dan langsung bisa dijalankan.",
    icon: <Code2 className="w-5 h-5 text-emerald-400" />,
  },
];

export default function WorkflowStages() {
  return (
    <section
      id="workflow"
      className="py-24 md:py-32 bg-[#05060A] border-t border-white/8"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1E6BFF] mb-3">
            Cara Kerja
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            Lima langkah dari ide ke aplikasi.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Setiap langkah berjalan berurutan sehingga tidak ada yang terlewat.
          </p>
        </div>

        {/* Stage cards — 5 cards, max 3 per row on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STAGES.map((stage) => (
            <div
              key={stage.number}
              className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-[#0E1017] border border-white/10 hover:border-white/20 transition-all duration-200 hover:bg-[#111520]"
            >
              {/* Number */}
              <span className="text-4xl font-bold text-white/8 select-none leading-none">
                {stage.number}
              </span>

              {/* Icon + Title */}
              <div className="flex items-center gap-3 -mt-2">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  {stage.icon}
                </div>
                <h3 className="text-base font-semibold text-white">
                  {stage.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed">
                {stage.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
