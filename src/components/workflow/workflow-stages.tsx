"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileSpreadsheet,
  Network,
  Palette,
  Binary,
  CheckCircle2,
  Copy,
  Check,
  Code2,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface StageInfo {
  id: string;
  number: string;
  title: string;
  tagline: string;
  badge: string;
  summary: string;
  icon: React.ReactNode;
  color: string;
  capabilities: string[];
  metrics: { label: string; value: string }[];
}

const STAGES: StageInfo[] = [
  {
    id: "discovery",
    number: "01",
    title: "Discovery",
    tagline: "Intent & Persona Mining",
    badge: "Requirements Analysis",
    summary:
      "Synthesizes raw conversational developer prompts into structured domain models, constraints, user personas, and technical feasibility boundaries.",
    icon: <Sparkles className="w-5 h-5 text-blue-600" />,
    color: "blue",
    capabilities: [
      "Semantic intent extraction & multi-modal prompt decomposition",
      "Stakeholder persona generation with user journey mapping",
      "Non-functional requirement boundary enforcement (latency, compliance, scale)",
      "Feasibility risk analysis & automated scope clarification",
    ],
    metrics: [
      { label: "Intent Accuracy", value: "99.2%" },
      { label: "Extraction Speed", value: "320ms" },
      { label: "Ambiguity Filter", value: "98.5%" },
    ],
  },
  {
    id: "prd",
    number: "02",
    title: "PRD Studio",
    tagline: "RFC & Acceptance Criteria",
    badge: "Autonomous Spec",
    summary:
      "Compiles formal RFC documentation, OpenAPI 3.1 endpoints, domain schemas, error handling matrices, and Gherkin-style acceptance tests.",
    icon: <FileSpreadsheet className="w-5 h-5 text-sky-600" />,
    color: "sky",
    capabilities: [
      "Production-ready RFC document generation with architectural rationale",
      "OpenAPI 3.1 REST & RPC schema definitions with TypeScript types",
      "Gherkin Given-When-Then acceptance criteria for every user story",
      "Relational & document database schemas with migration blueprints",
    ],
    metrics: [
      { label: "Spec Parity", value: "100%" },
      { label: "OpenAPI Standard", value: "v3.1.0" },
      { label: "Schema Coverage", value: "99.8%" },
    ],
  },
  {
    id: "task",
    number: "03",
    title: "Task Engine",
    tagline: "Acyclic DAG Breakdown",
    badge: "Orchestration",
    summary:
      "Transforms high-level PRD requirements into an atomic, topological task dependency graph (DAG) ready for parallel sprint execution.",
    icon: <Network className="w-5 h-5 text-indigo-600" />,
    color: "indigo",
    capabilities: [
      "Topological task sorting with guaranteed cycle-free execution",
      "Atomic story point sizing and velocity estimation",
      "Parallel branch allocation for multi-agent or multi-dev workflows",
      "Automated issue tracking export (GitHub Issues, Linear, Jira)",
    ],
    metrics: [
      { label: "Cycles Detected", value: "0" },
      { label: "Parallel Tracks", value: "6 Max" },
      { label: "DAG Resolution", value: "<150ms" },
    ],
  },
  {
    id: "design",
    number: "04",
    title: "Design Studio",
    tagline: "Tokens & Visual Contracts",
    badge: "Design System",
    summary:
      "Establishes token-driven visual hierarchies, accessible color contrasts, responsive breakpoints, and shadcn/ui compatible component blueprints.",
    icon: <Palette className="w-5 h-5 text-violet-600" />,
    color: "violet",
    capabilities: [
      "Light-mode Meta aesthetic design token compilation",
      "WCAG AAA color contrast validation and dark/light adaptive scales",
      "Shadcn/ui & Tailwind CSS v4 atomic component composition",
      "Responsive layout contracts: Mobile, Tablet, Desktop, Wide",
    ],
    metrics: [
      { label: "WCAG Contrast", value: "AAA Pass" },
      { label: "Token Count", value: "64 Variables" },
      { label: "Tailwind Native", value: "v4.0" },
    ],
  },
  {
    id: "build",
    number: "05",
    title: "Build-ready",
    tagline: "Code Emission & Turbopack",
    badge: "Production TSX",
    summary:
      "Emits production-grade Next.js App Router code with strictly typed TypeScript interfaces, verified against AST typecheck and Turbopack builds.",
    icon: <Binary className="w-5 h-5 text-emerald-600" />,
    color: "emerald",
    capabilities: [
      "Idiomatic Next.js 16 App Router code with Server & Client components",
      "Zero TypeScript compilation warnings with strict mode enabled",
      "Unit & integration test scaffolds preconfigured (Vitest/Playwright)",
      "Instant GitHub sync, Vercel deployment hook, or clean ZIP download",
    ],
    metrics: [
      { label: "Typecheck", value: "0 Errors" },
      { label: "Turbopack Build", value: "PASS" },
      { label: "Bundle Size", value: "Optimal" },
    ],
  },
];

export default function WorkflowStages() {
  const [activeStageId, setActiveStageId] = useState<string>("discovery");
  const [copied, setCopied] = useState<boolean>(false);

  const activeStage =
    STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="workflow" className="py-20 md:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 mb-3">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Autonomous 5-Stage Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Engineered for deterministic software creation.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Every software system must pass five rigorous validation gates before
            a single line of production code is delivered. Explore each stage below.
          </p>
        </div>

        {/* Stage Selector Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none">
          {STAGES.map((stage) => {
            const isActive = activeStageId === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10 scale-102"
                    : "bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span
                  className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {stage.number}
                </span>
                <span>{stage.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Interactive Showcase */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/50 via-white to-white p-6 sm:p-8 lg:p-10 shadow-lg shadow-slate-200/40"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Stage Overview & Capabilities */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      STAGE {activeStage.number}
                    </span>
                    <Badge variant="meta">{activeStage.badge}</Badge>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {activeStage.title}
                  </h3>
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    {activeStage.tagline}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-3">
                    {activeStage.summary}
                  </p>
                </div>

                {/* Capabilities list */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Core Capabilities
                  </span>
                  {activeStage.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  {activeStage.metrics.map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-base sm:text-lg font-bold text-slate-900">
                        {m.value}
                      </div>
                      <div className="text-[11px] text-slate-500">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Interactive Mockup / Artifact Preview */}
              <div className="lg:col-span-7">
                {activeStage.id === "discovery" && <DiscoveryPreview />}
                {activeStage.id === "prd" && (
                  <PrdPreview copied={copied} onCopy={() => handleCopy(SAMPLE_PRD_CONTENT)} />
                )}
                {activeStage.id === "task" && <TaskEnginePreview />}
                {activeStage.id === "design" && <DesignStudioPreview />}
                {activeStage.id === "build" && (
                  <BuildReadyPreview copied={copied} onCopy={() => handleCopy(SAMPLE_CODE_SNIPPET)} />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

// Stage 1: Discovery Artifact Component
function DiscoveryPreview() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-900">
            Semantic Domain Extraction Engine
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Confidence: 99.4%
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700">
        <span className="font-semibold text-slate-900 block mb-1">Raw User Prompt:</span>
        <p className="italic text-slate-600 font-mono">
          &quot;Build a low-latency collaborative document engine with real-time cursor sync, version history diffs, and team permission tiers.&quot;
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
          <span className="font-semibold text-blue-900 block mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Extracted Entities (4)
          </span>
          <ul className="space-y-1 text-blue-800 font-mono text-[11px]">
            <li>• WorkspaceDocument [CRDT/OT]</li>
            <li>• PresenceCursor [WebSocket/SSE]</li>
            <li>• VersionDelta [Immutable Tree]</li>
            <li>• TeamRole [Owner, Editor, Viewer]</li>
          </ul>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
          <span className="font-semibold text-indigo-900 block mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Technical Boundaries
          </span>
          <ul className="space-y-1 text-indigo-800 text-[11px]">
            <li>• Target Latency: &lt; 50ms cursor sync</li>
            <li>• Conflict Resolution: Yjs / CRDT</li>
            <li>• Auth Policy: Session + JWT Bearer</li>
            <li>• Next.js 16 App Router Server Actions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Sample PRD Text for Copying
const SAMPLE_PRD_CONTENT = `# RFC-204: Collaborative Canvas & Document Engine
## 1. Summary
Autonomous specification for low-latency multi-tenant document canvas.

## 2. API Schema Contracts
- POST /api/v1/documents
- GET /api/v1/documents/:id/deltas
- WS  /api/v1/documents/:id/presence

## 3. Acceptance Criteria
- [x] Given an authenticated user, when opening a canvas, then active cursors render within 30ms.
- [x] Given concurrent edits, CRDT merges without data loss.`;

// Stage 2: PRD Preview Component
function PrdPreview({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const [activeTab, setActiveTab] = useState<"spec" | "openapi" | "criteria">("spec");

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900">
            PRD Studio Specification
          </span>
          <Badge variant="outline" className="text-[10px]">
            RFC-204
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          className="h-7 px-2.5 text-xs text-slate-600 gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy RFC</span>
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["spec", "openapi", "criteria"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeTab === tab
                ? "bg-sky-100 text-sky-800 font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab === "spec" && "RFC Overview"}
            {tab === "openapi" && "OpenAPI 3.1 Schemas"}
            {tab === "criteria" && "Acceptance Criteria"}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[260px] scrollbar-thin">
        {activeTab === "spec" && (
          <pre>
            {`# RFC-204: Collaborative Canvas & Document Engine
Status: APPROVED · Author: MuseVibe PRD Engine · Target: v1.0
Domain Model:
  ├── Document (id, workspace_id, title, crdt_state_vector)
  ├── CursorSession (client_id, user_id, x, y, color)
  └── RevisionSnapshot (hash, delta_bytes, created_at)`}
          </pre>
        )}
        {activeTab === "openapi" && (
          <pre>
            {`paths:
  /api/v1/documents:
    post:
      summary: Initialize shared canvas document
      responses:
        201:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DocumentPayload' }
  /api/v1/presence/stream:
    get:
      summary: SSE streaming endpoint for real-time cursor broadcast`}
          </pre>
        )}
        {activeTab === "criteria" && (
          <pre>
            {`SCENARIO: Multi-user concurrent text insertion
  GIVEN two users A and B are connected to document #412
  WHEN user A inputs "Hello" at offset 0
  AND user B inputs "World" at offset 0 concurrently
  THEN CRDT resolve preserves both keystrokes deterministically
  AND latency telemetry reports sync under 35ms.`}
          </pre>
        )}
      </div>
    </div>
  );
}

// Stage 3: Task Engine DAG Component
function TaskEnginePreview() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-900">
            Acyclic DAG Task Scheduler (4 Tasks Queued)
          </span>
        </div>
        <Badge variant="purple" className="text-[10px]">
          Cycle-Free: Guaranteed
        </Badge>
      </div>

      <div className="space-y-2.5">
        {[
          {
            id: "TASK-101",
            title: "CRDT State Sync Engine (Yjs / WebSocket)",
            dep: "No dependencies",
            status: "Completed",
            statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
            sp: "5 SP",
          },
          {
            id: "TASK-102",
            title: "Multi-user Canvas Viewport & Cursor Overlay",
            dep: "Depends on TASK-101",
            status: "In Execution",
            statusColor: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse",
            sp: "3 SP",
          },
          {
            id: "TASK-103",
            title: "Version Snapshot Archival & Delta Diffs",
            dep: "Depends on TASK-101",
            status: "Queued",
            statusColor: "bg-slate-100 text-slate-600 border-slate-200",
            sp: "3 SP",
          },
          {
            id: "TASK-104",
            title: "Permission RBAC & Team Token Verification",
            dep: "Depends on TASK-102, 103",
            status: "Queued",
            statusColor: "bg-slate-100 text-slate-600 border-slate-200",
            sp: "2 SP",
          },
        ].map((task) => (
          <div
            key={task.id}
            className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-800">{task.id}</span>
                <span className="font-medium text-slate-900">{task.title}</span>
              </div>
              <span className="text-[11px] text-slate-500">{task.dep}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {task.sp}
              </span>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${task.statusColor}`}
              >
                {task.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stage 4: Design Studio Component
function DesignStudioPreview() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-600" />
          <span className="text-xs font-semibold text-slate-900">
            Meta Light Design Tokens & Contracts
          </span>
        </div>
        <Badge variant="meta" className="text-[10px]">
          WCAG AAA
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { name: "Primary Blue", hex: "#0064E0", role: "bg-blue-600", text: "text-white" },
          { name: "Surface Clean", hex: "#FFFFFF", role: "bg-white border border-slate-200", text: "text-slate-900" },
          { name: "Muted Subtle", hex: "#F8FAFC", role: "bg-slate-50 border border-slate-200", text: "text-slate-700" },
          { name: "Accent Indigo", hex: "#4F46E5", role: "bg-indigo-600", text: "text-white" },
        ].map((token) => (
          <div key={token.name} className="p-3 rounded-xl border border-slate-200/70 bg-white flex flex-col gap-2">
            <div className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-mono ${token.role} ${token.text}`}>
              {token.hex}
            </div>
            <div className="text-[11px] font-medium text-slate-700">{token.name}</div>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
          Compiled Component Contracts
        </span>
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm">Primary Button</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="outline" size="sm">Outline</Button>
          <Badge variant="success">Badge Success</Badge>
          <Badge variant="purple">Badge Violet</Badge>
        </div>
      </div>
    </div>
  );
}

// Sample Code for Build Ready
const SAMPLE_CODE_SNIPPET = `// src/app/api/v1/engine/route.ts
import { NextResponse } from "next/server";
import { type EngineConfig, compileWorkspace } from "@/lib/compiler";

export async function POST(req: Request) {
  const payload: EngineConfig = await req.json();
  const buildResult = await compileWorkspace(payload);

  return NextResponse.json({
    success: true,
    astValidated: true,
    turbopackVerified: true,
    bundleTimeMs: 142,
    artifacts: buildResult.artifacts,
  });
}`;

// Stage 5: Build-ready Component
function BuildReadyPreview({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col gap-4 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-900">
            Next.js 16 App Router · TypeScript Strict
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Build: 0 Errors
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="h-7 px-2.5 text-xs text-slate-600 gap-1"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[260px] scrollbar-thin">
        <pre>{SAMPLE_CODE_SNIPPET}</pre>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <ShieldCheck className="w-4 h-4" />
          Turbopack compile: 142ms · Zero TS regressions
        </span>
        <span className="font-mono text-[11px]">Target: ES2022 / Next 16</span>
      </div>
    </div>
  );
}
