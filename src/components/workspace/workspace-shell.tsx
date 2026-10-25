"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import XYFlowCanvas from "./xy-flow-canvas";
import {
  Sparkles,
  Play,
  RotateCcw,
  Download,
  FolderGit2,
  FileCode2,
  FileText,
  Layers,
  Palette,
  Terminal,
  CheckCircle2,
  Maximize2,
  ChevronRight,
  Code2,
} from "lucide-react";

interface WorkspaceShellProps {
  isFullScreen?: boolean;
}

export default function WorkspaceShell({
  isFullScreen = false,
}: WorkspaceShellProps) {
  const [activeStage, setActiveStage] = useState<string>("1");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pipelineProgress, setPipelineProgress] = useState<number>(100);
  const [userPrompt, setUserPrompt] = useState<string>(
    "Build a real-time collaborative document editor with AI inline suggestions and granular permission tiers."
  );
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    "code" | "prd" | "logs"
  >("code");

  const runSimulation = () => {
    setIsRunning(true);
    setPipelineProgress(10);
    setTimeout(() => setPipelineProgress(40), 400);
    setTimeout(() => setPipelineProgress(75), 800);
    setTimeout(() => {
      setPipelineProgress(100);
      setIsRunning(false);
    }, 1300);
  };

  return (
    <div
      className={`flex flex-col bg-[#05060A] rounded-3xl border border-white/10 shadow-xl overflow-hidden font-sans ${
        isFullScreen ? "h-screen rounded-none border-none" : "min-h-[720px]"
      }`}
    >
      {/* Shell Top Navigation Bar */}
      <div className="h-14 bg-[#080B10] border-b border-white/10 px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-[#1E6BFF] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              MV
            </div>
            <span className="font-bold text-white tracking-tight text-sm hidden sm:inline">
              MuseVibe
            </span>
          </Link>

          <span className="text-white/20">/</span>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-200 font-semibold">
              my-project
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              main
            </Badge>
          </div>
        </div>

        {/* Center Breadcrumb */}
        <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
          <span className={activeStage === "1" ? "text-[#1E6BFF] font-semibold" : ""}>
            Prompt
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className={activeStage === "2" ? "text-sky-400 font-semibold" : ""}>
            Spesifikasi
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className={activeStage === "3" ? "text-indigo-400 font-semibold" : ""}>
            Tugas
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className={activeStage === "4" ? "text-violet-400 font-semibold" : ""}>
            Desain
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          <span className={activeStage === "5" ? "text-emerald-400 font-semibold" : ""}>
            Kode
          </span>
        </div>

        {/* Right Shell Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runSimulation}
            disabled={isRunning}
            className="h-8 text-xs gap-1.5"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses ({pipelineProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Jalankan</span>
              </>
            )}
          </Button>

          {!isFullScreen ? (
            <Link href="/workspace">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 hidden sm:flex"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Buka Workspace</span>
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                Kembali
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#05060A]">
        {/* Left Sidebar: Controls & Stages */}
        <div className="w-full lg:w-72 bg-[#080B10] border-r border-white/10 flex flex-col p-4 gap-4 shrink-0">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1E6BFF]" />
              Promptmu
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1E6BFF] focus:bg-white/8 resize-none"
              placeholder="Ceritakan aplikasi yang ingin kamu buat..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tahapan
            </span>
            {[
              { id: "1", title: "01 Prompt", icon: Sparkles, status: "Selesai" },
              { id: "2", title: "02 Spesifikasi", icon: FileText, status: "Selesai" },
              { id: "3", title: "03 Tugas", icon: Layers, status: "Selesai" },
              { id: "4", title: "04 Desain", icon: Palette, status: "Selesai" },
              { id: "5", title: "05 Kode", icon: Code2, status: "Siap" },
            ].map((stage) => {
              const Icon = stage.icon;
              const isSelected = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-[#1E6BFF]/15 text-[#60a5fa] border border-[#1E6BFF]/30 font-semibold"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{stage.title}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {stage.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Emitted Files */}
          <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-1 text-[11px] font-mono text-slate-500">
            <span className="font-sans font-semibold text-slate-500 uppercase text-[10px] mb-1">
              File yang dihasilkan (5)
            </span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <FileCode2 className="w-3 h-3 text-[#1E6BFF]" />
              <span>src/app/page.tsx</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <FileCode2 className="w-3 h-3 text-[#1E6BFF]" />
              <span>src/lib/crdt.ts</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <FileText className="w-3 h-3 text-sky-400" />
              <span>docs/spec.md</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>tasks/dag.json</span>
            </div>
          </div>
        </div>

        {/* Center: Graph Viewport with XYFlow */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-[380px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Peta Alur
              </span>
              <span className="text-[11px] text-slate-500">
                (klik simpul untuk detail)
              </span>
            </div>
            <Badge variant="meta" className="text-[10px]">
              5 Tahap · 5 Koneksi
            </Badge>
          </div>

          <div className="flex-1 min-h-[340px]">
            <XYFlowCanvas
              className="w-full h-full min-h-[340px]"
              onNodeSelect={(id) => setActiveStage(id)}
            />
          </div>
        </div>

        {/* Right Panel: Output & Inspector */}
        <div className="w-full lg:w-80 bg-[#080B10] border-l border-white/10 flex flex-col shrink-0">
          {/* Inspector Header Tabs */}
          <div className="flex border-b border-white/10 bg-[#05060A] p-1.5 gap-1 text-xs">
            <button
              onClick={() => setActiveInspectorTab("code")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "code"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Kode
            </button>
            <button
              onClick={() => setActiveInspectorTab("prd")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "prd"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Spesifikasi
            </button>
            <button
              onClick={() => setActiveInspectorTab("logs")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "logs"
                  ? "bg-white/10 text-white font-semibold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Log
            </button>
          </div>

          {/* Inspector Content */}
          <div className="flex-1 p-3 overflow-y-auto max-h-[360px] lg:max-h-none font-mono text-[11px] leading-relaxed bg-[#030507] text-slate-300">
            {activeInspectorTab === "code" && (
              <pre className="whitespace-pre-wrap">
                {`// src/app/editor/page.tsx
import { CRDTSession } from "@/lib/crdt";
import { DocumentCanvas } from "@/components/canvas";

export default async function EditorPage(
  { params }: { params: { id: string } }
) {
  const session = await CRDTSession.connect({
    docId: params.id,
    mode: "collaborative",
    heartbeatInterval: 2500,
  });

  return (
    <main className="h-full flex flex-col">
      <DocumentCanvas session={session} />
    </main>
  );
}`}
              </pre>
            )}

            {activeInspectorTab === "prd" && (
              <pre className="whitespace-pre-wrap">
                {`# Spesifikasi: Document Canvas
Versi: Release Candidate 1
Dibuat oleh: MuseVibe

1. Invariant Sistem
- Nol keystroke hilang saat reconect.
- State CRDT maks 1MB per revisi.
- Backoff reconect: eksponensial (100ms–5s).`}
              </pre>
            )}

            {activeInspectorTab === "logs" && (
              <pre className="whitespace-pre-wrap text-emerald-400">
                {`[12:28:10] Parser diinisialisasi.
[12:28:11] 14 entitas prompt diparsing.
[12:28:11] Spesifikasi dibuat & schema dikompilasi.
[12:28:12] Urutan tugas DAG: LULUS.
[12:28:12] Token desain dipetakan ke Tailwind v4.
[12:28:13] Build Next.js 16 terverifikasi. 0 error.`}
              </pre>
            )}
          </div>

          {/* Inspector Footer Actions */}
          <div className="p-3 border-t border-white/10 bg-[#080B10] flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terverifikasi
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Shell Status Bar */}
      <div className="h-8 bg-[#030507] text-slate-500 px-4 flex items-center justify-between text-[11px] font-mono border-t border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold">● Next.js 16</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">TypeScript 5.9 Strict</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden sm:inline">React 19</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/api/health" target="_blank" className="hover:text-slate-300 flex items-center gap-1 transition-colors">
            <Terminal className="w-3 h-3 text-[#1E6BFF]" />
            <span>/api/health</span>
          </Link>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
