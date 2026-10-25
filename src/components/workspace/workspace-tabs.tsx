"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, FileText, GitBranch, Palette, Code2, ArrowRight,
} from "lucide-react";
import TabPrompt from "./tab-prompt";
import TabSpesifikasi from "./tab-spesifikasi";
import TabRencanaKerja from "./tab-rencana-kerja";
import TabDesain from "./tab-desain";
import TabKode from "./tab-kode";

export const TAB_IDS = ["prompt", "spesifikasi", "rencana-kerja", "desain", "kode"] as const;
export type TabId = (typeof TAB_IDS)[number];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "prompt", label: "Prompt", icon: <Sparkles className="w-4 h-4" /> },
  { id: "spesifikasi", label: "Spesifikasi", icon: <FileText className="w-4 h-4" /> },
  { id: "rencana-kerja", label: "Rencana Kerja", icon: <GitBranch className="w-4 h-4" /> },
  { id: "desain", label: "Desain", icon: <Palette className="w-4 h-4" /> },
  { id: "kode", label: "Kode", icon: <Code2 className="w-4 h-4" /> },
];

export default function WorkspaceTabs({ syncUrl = false, initialTab }: { syncUrl?: boolean; initialTab?: TabId }) {
  const [active, setActive] = useState<TabId>(initialTab ?? "prompt");


  const goTo = (id: TabId) => {
    setActive(id);
    if (syncUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const content = useMemo(() => {
    switch (active) {
      case "prompt":
        return <TabPrompt onNextTab={() => goTo("spesifikasi")} />;
      case "spesifikasi":
        return <TabSpesifikasi />;
      case "rencana-kerja":
        return <TabRencanaKerja />;
      case "desain":
        return <TabDesain onNextTab={() => goTo("kode")} />;
      case "kode":
        return <TabKode />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Tahap workflow"
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-white/10"
      >
        {TABS.map((tab, index) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => goTo(tab.id)}
              className={`relative shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${
                isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-slate-500 text-xs font-mono">{String(index + 1).padStart(2, "0")}</span>
              {tab.icon}
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="workspace-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #1E6BFF, #7C3AED, #F472B6)" }}
                />
              )}
            </button>
          );
        })}
      </div>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="pt-8"
        >
          {content}
        </motion.div>
      {!syncUrl && (
        <div className="mt-8 flex justify-center">
          <Link
            href={`/workspace?tab=${active}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 rounded-xl px-5 py-2.5 transition-colors"
          >
            Buka tab {TABS.find((t) => t.id === active)?.label} di workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
