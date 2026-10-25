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
      className={`flex flex-col bg-slate-900/5 rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden font-sans ${
        isFullScreen ? "h-screen rounded-none border-none" : "min-h-[720px]"
      }`}
    >
      {/* Shell Top Navigation Bar */}
      <div className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              MV
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-sm hidden sm:inline">
              MuseVibe
            </span>
          </Link>

          <span className="text-slate-300">/</span>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-slate-900 font-semibold">
              nexus-doc-engine
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              main
            </Badge>
          </div>
        </div>

        {/* Center Breadcrumb */}
        <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
          <span className={activeStage === "1" ? "text-blue-600 font-semibold" : ""}>
            Discovery
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={activeStage === "2" ? "text-sky-600 font-semibold" : ""}>
            PRD Studio
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={activeStage === "3" ? "text-indigo-600 font-semibold" : ""}>
            Task Engine
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={activeStage === "4" ? "text-violet-600 font-semibold" : ""}>
            Design Studio
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={activeStage === "5" ? "text-emerald-600 font-semibold" : ""}>
            Build-ready
          </span>
        </div>

        {/* Right Shell Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={runSimulation}
            disabled={isRunning}
            className="h-8 text-xs gap-1.5 shadow-sm"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing ({pipelineProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Pipeline</span>
              </>
            )}
          </Button>

          {!isFullScreen ? (
            <Link href="/workspace">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 text-slate-700 hidden sm:flex"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-slate-700"
              >
                Exit to Landing
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Workspace Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100/50">
        {/* Left Sidebar: Controls & Stages */}
        <div className="w-full lg:w-72 bg-white border-r border-slate-200/80 flex flex-col p-4 gap-4 shrink-0">
          <div>
            <label className="text-xs font-semibold text-slate-900 block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Developer Prompt Input
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              placeholder="Describe your target application..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Workflow Stages
            </span>
            {[
              { id: "1", title: "01 Discovery", icon: Sparkles, status: "Done" },
              { id: "2", title: "02 PRD Studio", icon: FileText, status: "Done" },
              { id: "3", title: "03 Task Engine", icon: Layers, status: "Done" },
              { id: "4", title: "04 Design Studio", icon: Palette, status: "Done" },
              { id: "5", title: "05 Build-ready", icon: Code2, status: "Ready" },
            ].map((stage) => {
              const Icon = stage.icon;
              const isSelected = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{stage.title}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    {stage.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Emitted Workspace Files */}
          <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-1 text-[11px] font-mono text-slate-500">
            <span className="font-sans font-semibold text-slate-400 uppercase text-[10px] mb-1">
              Synthesized Files (5)
            </span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <FileCode2 className="w-3 h-3 text-blue-500" />
              <span>src/app/page.tsx</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <FileCode2 className="w-3 h-3 text-blue-500" />
              <span>src/lib/crdt.ts</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <FileText className="w-3 h-3 text-sky-500" />
              <span>docs/rfc-204-spec.md</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Layers className="w-3 h-3 text-indigo-500" />
              <span>tasks/dag-sprint.json</span>
            </div>
          </div>
        </div>

        {/* Center: Graph Viewport with XYFlow */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-[380px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Workflow Topology Canvas
              </span>
              <span className="text-[11px] text-slate-500">
                (Click nodes to inspect stage properties)
              </span>
            </div>
            <Badge variant="meta" className="text-[10px]">
              Active Graph: 5 Nodes · 5 Edges
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
        <div className="w-full lg:w-80 bg-white border-l border-slate-200/80 flex flex-col shrink-0">
          {/* Inspector Header Tabs */}
          <div className="flex border-b border-slate-200/80 bg-slate-50/70 p-1.5 gap-1 text-xs">
            <button
              onClick={() => setActiveInspectorTab("code")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "code"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              TypeScript
            </button>
            <button
              onClick={() => setActiveInspectorTab("prd")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "prd"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              PRD RFC
            </button>
            <button
              onClick={() => setActiveInspectorTab("logs")}
              className={`flex-1 py-1.5 text-center rounded-lg font-medium transition-colors cursor-pointer ${
                activeInspectorTab === "logs"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Logs
            </button>
          </div>

          {/* Inspector Content */}
          <div className="flex-1 p-3 overflow-y-auto max-h-[360px] lg:max-h-none font-mono text-[11px] leading-relaxed bg-slate-950 text-slate-200">
            {activeInspectorTab === "code" && (
              <pre className="whitespace-pre-wrap">
                {`// src/app/editor/page.tsx
import { CRDTSession } from "@/lib/crdt";
import { DocumentCanvas } from "@/components/canvas";

export default async function EditorPage({ params }: { params: { id: string } }) {
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
                {`# Specification: Document Canvas
Target: Release Candidate 1
Authored by: MuseVibe Studio Engine

1. System Invariants
- Zero lost keystrokes during offline reconnection.
- CRDT state vectors capped under 1MB per revision chunk.
- Client socket reconnect backoff: Exponential jittered (100ms - 5s).`}
              </pre>
            )}

            {activeInspectorTab === "logs" && (
              <pre className="whitespace-pre-wrap text-emerald-400">
                {`[12:28:10] AST Parser initialized.
[12:28:11] Semantic prompt tokens parsed: 14 entities.
[12:28:11] PRD RFC-204 generated & schema compiled.
[12:28:12] Task DAG topological resolution: PASS.
[12:28:12] Design tokens mapped to Tailwind v4 theme.
[12:28:13] Next.js 16 build verified. 0 TS errors.`}
              </pre>
            )}
          </div>

          {/* Inspector Footer Actions */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              AST Verified
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-slate-700 bg-white">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Shell Status Bar */}
      <div className="h-8 bg-slate-900 text-slate-400 px-4 flex items-center justify-between text-[11px] font-mono border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold">● Next.js 16 Turbopack</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">TypeScript 5.9.3 Strict</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">React 19.3</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/api/health" target="_blank" className="hover:text-white flex items-center gap-1">
            <Terminal className="w-3 h-3 text-blue-400" />
            <span>Health Endpoint</span>
          </Link>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
