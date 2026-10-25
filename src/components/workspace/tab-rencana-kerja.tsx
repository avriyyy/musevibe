"use client";

import React, { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_TASKS } from "@/lib/demo-data";
import type { WorkTask, TaskStatus, TaskPriority } from "@/lib/demo-data";
import {
  List,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronRight,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  done: {
    label: "Selesai",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  doing: {
    label: "Dikerjakan",
    color: "text-[#1E6BFF] border-[#1E6BFF]/30 bg-[#1E6BFF]/10",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  todo: {
    label: "Belum mulai",
    color: "text-[#A1A1AA] border-white/10 bg-white/5",
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: "Terblokir",
    color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  P1: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  P2: "text-[#A1A1AA] bg-white/5 border-white/10",
};

// ─── Task card (list view) ────────────────────────────────────────────────────

function TaskCard({
  task,
  onSelect,
}: {
  task: WorkTask;
  onSelect: (t: WorkTask) => void;
}) {
  const status = STATUS_CONFIG[task.status];

  return (
    <motion.button
      onClick={() => onSelect(task)}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.15 }}
      className="w-full text-left group"
    >
      <div
        className="rounded-xl bg-[#0E1017] border border-white/8 p-4
        hover:border-white/16 hover:bg-[#111520] transition-all duration-150"
      >
        <div className="flex items-start gap-3">
          {/* Priority + ID */}
          <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </span>
            <span className="text-[11px] font-mono text-[#71717A]">{task.id}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-[#F4F4F5] leading-snug">
                {task.title}
              </p>
              <span
                className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${status.color}`}
              >
                {status.icon}
                {status.label}
              </span>
            </div>

            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-2.5">
              {task.description}
            </p>

            <div className="flex items-center gap-3 text-[12px] text-[#71717A]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimate}
              </span>
              <span>·</span>
              <span>{task.phase}</span>
              {task.dependencies.length > 0 && (
                <>
                  <span>·</span>
                  <span>Bergantung pada: {task.dependencies.join(", ")}</span>
                </>
              )}
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5 group-hover:text-[#A1A1AA] transition-colors" />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  task,
  onClose,
}: {
  task: WorkTask;
  onClose: () => void;
}) {
  const status = STATUS_CONFIG[task.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full lg:w-96 shrink-0 rounded-xl bg-[#0E1017] border border-white/8 p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </span>
            <span className="text-[11px] font-mono text-[#71717A]">{task.id}</span>
            <span className="text-[11px] text-[#71717A]">· {task.phase}</span>
          </div>
          <h3 className="text-base font-semibold text-[#F4F4F5] leading-snug">
            {task.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F4F4F5] hover:bg-white/8 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#71717A]">Status:</span>
        <span
          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Description */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] mb-1.5">
          Deskripsi
        </p>
        <p className="text-sm text-[#A1A1AA] leading-relaxed">{task.description}</p>
      </div>

      {/* Acceptance criteria */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] mb-2">
          Kriteria Penerimaan
        </p>
        <ul className="space-y-1.5">
          {task.acceptanceCriteria.map((ac, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#A1A1AA]">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1E6BFF]/60 shrink-0" />
              {ac}
            </li>
          ))}
        </ul>
      </div>

      {/* Meta */}
      <div className="pt-3 border-t border-white/8 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[#71717A] mb-0.5">Estimasi</p>
          <p className="text-[#F4F4F5] font-medium">{task.estimate}</p>
        </div>
        <div>
          <p className="text-xs text-[#71717A] mb-0.5">Dependensi</p>
          <p className="text-[#F4F4F5] font-medium">
            {task.dependencies.length ? task.dependencies.join(", ") : "—"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Diagram node ─────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<TaskPriority, string> = {
  P0: "bg-rose-400",
  P1: "bg-amber-400",
  P2: "bg-[#71717A]",
};

const STATUS_RING: Record<TaskStatus, string> = {
  done: "border-emerald-500/50",
  doing: "border-[#1E6BFF]/70",
  todo: "border-white/10",
  blocked: "border-rose-500/40",
};

function DiagramNode({
  task,
  x,
  y,
  width,
  onSelect,
  isSelected,
}: {
  task: WorkTask;
  x: number;
  y: number;
  width: number;
  onSelect: (t: WorkTask) => void;
  isSelected: boolean;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelect(task)}
      className="cursor-pointer"
      style={{ outline: "none" }}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
      role="button"
      aria-label={`Tugas ${task.id}: ${task.title}`}
    >
      <rect
        width={width}
        height={72}
        rx={10}
        ry={10}
        fill="#0E1017"
        stroke={isSelected ? "#1E6BFF" : "rgba(255,255,255,0.1)"}
        strokeWidth={isSelected ? 1.5 : 1}
      />
      {/* Priority dot */}
      <circle
        cx={16}
        cy={16}
        r={5}
        fill={
          task.priority === "P0"
            ? "#f87171"
            : task.priority === "P1"
            ? "#fbbf24"
            : "#71717a"
        }
      />
      {/* ID */}
      <text x={27} y={20} fontSize={10} fill="#71717A" fontFamily="monospace">
        {task.id}
      </text>
      {/* Title — max 2 lines, ~32 chars */}
      <text x={12} y={40} fontSize={11} fill="#F4F4F5" fontWeight={600}>
        {task.title.length > 34 ? task.title.slice(0, 34) + "…" : task.title}
      </text>
      {/* Status */}
      <text x={12} y={58} fontSize={10} fill="#A1A1AA">
        {STATUS_CONFIG[task.status].label} · {task.estimate}
      </text>
    </g>
  );
}

// ─── Diagram view ─────────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 72;
const COL_GAP = 40;
const ROW_GAP = 24;
const PHASES = ["Fondasi", "Fitur Inti", "Fitur Lanjutan", "Kualitas", "Autentikasi"];

function DiagramView({
  selectedTask,
  onSelect,
}: {
  selectedTask: WorkTask | null;
  onSelect: (t: WorkTask) => void;
}) {
  const [zoom, setZoom] = useState(1);

  // Group by phase
  const byPhase = PHASES.map((phase) => ({
    phase,
    tasks: DEMO_TASKS.filter((t) => t.phase === phase),
  })).filter((g) => g.tasks.length > 0);

  // Calculate positions
  let colX = 24;
  const positions: Record<string, { x: number; y: number }> = {};
  byPhase.forEach((group) => {
    group.tasks.forEach((task, i) => {
      positions[task.id] = { x: colX, y: 40 + i * (NODE_H + ROW_GAP) };
    });
    colX += NODE_W + COL_GAP;
  });

  const totalW = colX;
  const totalH =
    Math.max(...Object.values(positions).map((p) => p.y)) + NODE_H + 40;

  // Edges from dependencies
  const edges: { from: string; to: string }[] = [];
  DEMO_TASKS.forEach((task) => {
    task.dependencies.forEach((dep) => {
      if (positions[dep] && positions[task.id]) {
        edges.push({ from: dep, to: task.id });
      }
    });
  });

  return (
    <div className="relative rounded-xl bg-[#030507] border border-white/8 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          className="w-8 h-8 rounded-lg bg-[#0E1017] border border-white/10
            text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center
            transition-colors"
          aria-label="Perbesar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          className="w-8 h-8 rounded-lg bg-[#0E1017] border border-white/10
            text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center
            transition-colors"
          aria-label="Perkecil"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="w-8 h-8 rounded-lg bg-[#0E1017] border border-white/10
            text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center justify-center
            transition-colors"
          aria-label="Fit ke layar"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Phase labels */}
      <div
        className="absolute top-3 left-0 right-0 flex pointer-events-none"
        style={{ paddingLeft: 24 }}
      >
        {byPhase.map((group) => (
          <div
            key={group.phase}
            style={{ width: NODE_W + COL_GAP, flexShrink: 0 }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#71717A]">
              {group.phase}
            </span>
          </div>
        ))}
      </div>

      {/* SVG canvas */}
      <div className="overflow-auto" style={{ maxHeight: 480 }}>
        <svg
          width={totalW * zoom}
          height={totalH * zoom}
          viewBox={`0 0 ${totalW} ${totalH}`}
          style={{ display: "block" }}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = positions[edge.from];
            const to = positions[edge.to];
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1.5}
                strokeDasharray={
                  DEMO_TASKS.find((t) => t.id === edge.to)?.status === "blocked"
                    ? "4,3"
                    : undefined
                }
              />
            );
          })}

          {/* Nodes */}
          {DEMO_TASKS.map((task) => {
            const pos = positions[task.id];
            if (!pos) return null;
            return (
              <DiagramNode
                key={task.id}
                task={task}
                x={pos.x}
                y={pos.y}
                width={NODE_W}
                onSelect={onSelect}
                isSelected={selectedTask?.id === task.id}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PRIORITY_FILTERS: (TaskPriority | "all")[] = ["all", "P0", "P1", "P2"];
const PHASE_FILTERS = ["Semua", ...Array.from(new Set(DEMO_TASKS.map((t) => t.phase)))];

export default function TabRencanaKerja() {
  const [viewMode, setViewMode] = useState<"list" | "diagram">("list");
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [phaseFilter, setPhaseFilter] = useState("Semua");
  const uid = useId();

  const filtered = DEMO_TASKS.filter((t) => {
    const byPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const byPhase = phaseFilter === "Semua" || t.phase === phaseFilter;
    return byPriority && byPhase;
  });

  // Summary counts
  const counts = {
    done: DEMO_TASKS.filter((t) => t.status === "done").length,
    doing: DEMO_TASKS.filter((t) => t.status === "doing").length,
    todo: DEMO_TASKS.filter((t) => t.status === "todo").length,
    blocked: DEMO_TASKS.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="flex flex-col gap-0 py-8">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 pb-5 border-b border-white/8 flex flex-col gap-4">
        {/* Summary row */}
        <div className="flex items-center gap-4 text-sm">
          {Object.entries(counts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status as TaskStatus];
            return (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 ${cfg.color.split(" ")[0]}`}
              >
                {cfg.icon}
                <span className="font-semibold">{count}</span>
                <span className="text-[#71717A] hidden sm:inline">{cfg.label}</span>
              </span>
            );
          })}
        </div>

        {/* View toggle + filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8 shrink-0">
            {(["list", "diagram"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                  viewMode === v
                    ? "text-[#F4F4F5]"
                    : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                }`}
              >
                {viewMode === v && (
                  <motion.span
                    layoutId={`view-indicator-${uid}`}
                    className="absolute inset-0 rounded-[8px] bg-white/10"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {v === "list" ? (
                  <List className="w-3.5 h-3.5" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
                )}
                {v === "list" ? "Daftar" : "Diagram"}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          {viewMode === "list" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRIORITY_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    priorityFilter === p
                      ? "bg-[#1E6BFF]/15 border-[#1E6BFF]/40 text-[#F4F4F5]"
                      : "bg-white/5 border-white/8 text-[#A1A1AA] hover:border-white/16"
                  }`}
                >
                  {p === "all" ? "Semua prioritas" : p}
                </button>
              ))}
              <span className="text-[#71717A] text-xs">·</span>
              {PHASE_FILTERS.map((ph) => (
                <button
                  key={ph}
                  onClick={() => setPhaseFilter(ph)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    phaseFilter === ph
                      ? "bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#F4F4F5]"
                      : "bg-white/5 border-white/8 text-[#A1A1AA] hover:border-white/16"
                  }`}
                >
                  {ph}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex gap-6"
            >
              {/* Task list */}
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                {filtered.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={setSelectedTask}
                  />
                ))}
              </div>

              {/* Detail panel */}
              <AnimatePresence>
                {selectedTask && (
                  <DetailPanel
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="diagram"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex gap-6 flex-col lg:flex-row"
            >
              <div className="flex-1 min-w-0">
                <DiagramView
                  selectedTask={selectedTask}
                  onSelect={setSelectedTask}
                />
                <p className="mt-2 text-xs text-[#71717A]">
                  Klik node untuk melihat detail tugas. Garis putus-putus menandakan dependensi yang terblokir.
                </p>
              </div>

              <AnimatePresence>
                {selectedTask && (
                  <DetailPanel
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
