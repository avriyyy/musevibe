"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { FLOW_NODES } from "./flow-3d-scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Sparkles,
  Layers,
  Code2,
  FileText,
  Palette,
} from "lucide-react";

// Dynamically import Three.js scene to prevent SSR issues
const Flow3DScene = dynamic(() => import("./flow-3d-scene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] md:h-[480px] lg:h-[520px] rounded-3xl bg-slate-50/70 border border-slate-200/80 flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
        <Sparkles className="w-6 h-6 text-blue-600" />
      </div>
      <p className="text-sm font-medium text-slate-500">Initializing 3D Wireframe Graph...</p>
    </div>
  ),
});

const NODE_ICONS: Record<string, React.ReactNode> = {
  prompt: <Sparkles className="w-4 h-4 text-blue-600" />,
  prd: <FileText className="w-4 h-4 text-sky-600" />,
  task: <Layers className="w-4 h-4 text-indigo-600" />,
  design: <Palette className="w-4 h-4 text-violet-600" />,
  code: <Code2 className="w-4 h-4 text-emerald-600" />,
};

const NODE_SPECS: Record<
  string,
  {
    inputLabel: string;
    inputValue: string;
    outputLabel: string;
    outputValue: string;
    verification: string;
  }
> = {
  prompt: {
    inputLabel: "Developer Intent",
    inputValue: '"Build an enterprise analytics hub with AI telemetry & RBAC auth"',
    outputLabel: "Semantic Token Flow",
    outputValue: "AST Graph extracted · 14 core entities · 9 functional boundaries",
    verification: "Prompt clarity verified (98.4% confidence)",
  },
  prd: {
    inputLabel: "Autonomous Synthesis",
    inputValue: "RFC-204 Product Spec & Formal Acceptance Criteria",
    outputLabel: "Schema Artifacts",
    outputValue: "18 API endpoints, Postgres DDL, rate-limiting policy & error matrix",
    verification: "PRD RFC schema validated against OpenAPI 3.1",
  },
  task: {
    inputLabel: "Task Decomposition",
    inputValue: "DAG Orchestrator · 24 atomic tasks mapped across 4 milestones",
    outputLabel: "Execution Pipeline",
    outputValue: "Zero circular dependencies · Parallel sprint paths scheduled",
    verification: "Dependency graph acyclic verification: PASS",
  },
  design: {
    inputLabel: "Design System Bridge",
    inputValue: "Tokens parsed: Typography, Light Palette, Radii, Shadows",
    outputLabel: "Component Contracts",
    outputValue: "Accessible WCAG AAA color contrast, Tailwind CSS v4 variables",
    verification: "Token parity & contrast audited: 100%",
  },
  code: {
    inputLabel: "Code Synthesis",
    inputValue: "Next.js 16 App Router · TypeScript 5 · Server & Client components",
    outputLabel: "Target Files",
    outputValue: "src/app/analytics, src/lib/telemetry.ts, unit & e2e test scaffolds",
    verification: "TypeScript compiler & Turbopack build: 0 errors",
  },
};

export default function HeroFlowGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("prompt");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  const activeNode =
    FLOW_NODES.find((n) => n.id === selectedNodeId) || FLOW_NODES[0];
  const activeSpec = NODE_SPECS[selectedNodeId] || NODE_SPECS.prompt;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* 3D Canvas */}
      <div className="relative">
        <Flow3DScene
          selectedNodeId={selectedNodeId}
          onSelectNode={(id) => setSelectedNodeId(id)}
          autoRotate={autoRotate}
        />

        {/* Floating controls toolbar on bottom-right of 3D canvas */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 rounded-full"
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? "Pause Spin" : "Auto Spin"}
          </Button>
          <div className="w-px h-3.5 bg-slate-200" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 rounded-full"
            onClick={() => setSelectedNodeId("prompt")}
            title="Reset to 01 Prompt"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Interactive Step Timeline Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {FLOW_NODES.map((node) => {
          const isActive = selectedNodeId === node.id;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`group flex flex-col p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-100"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700 group-hover:bg-slate-300"
                  }`}
                >
                  {node.step}
                </span>
                <span className="opacity-80 group-hover:opacity-100">
                  {NODE_ICONS[node.id]}
                </span>
              </div>
              <span
                className={`text-sm font-semibold truncate ${
                  isActive ? "text-blue-700" : "text-slate-900"
                }`}
              >
                {node.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate mt-0.5">
                {node.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Active Node Inspector Card (Meta aesthetic) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              {NODE_ICONS[activeNode.id]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-slate-900">
                  Stage {activeNode.step}: {activeNode.name}
                </h4>
                <Badge variant="meta" className="text-[10px]">
                  {activeNode.tag}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeNode.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeSpec.verification}
            </span>
          </div>
        </div>

        {/* Input / Output preview grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">
              Stage Input · {activeSpec.inputLabel}
            </div>
            <div className="text-slate-800 break-words">{activeSpec.inputValue}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/80">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1 font-sans">
              Synthesized Output · {activeSpec.outputLabel}
            </div>
            <div className="text-blue-950 break-words font-medium">
              {activeSpec.outputValue}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
