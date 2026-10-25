"use client";

import React from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  FileCode,
  Layers,
  Palette,
  CheckCircle,
} from "lucide-react";

// Custom Node for the 5 Pipeline Stages
function PipelineNode({ data }: { data: { label: string; step: string; status: string; desc: string; icon: string; isActive?: boolean } }) {
  const getIcon = () => {
    switch (data.icon) {
      case "prompt":
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case "prd":
        return <FileCode className="w-4 h-4 text-sky-600" />;
      case "task":
        return <Layers className="w-4 h-4 text-indigo-600" />;
      case "design":
        return <Palette className="w-4 h-4 text-violet-600" />;
      case "build":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-2xl border bg-white shadow-md transition-all duration-200 min-w-[210px] text-left ${
        data.isActive
          ? "border-blue-500 ring-2 ring-blue-100 shadow-blue-500/10"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-blue-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100">{getIcon()}</div>
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
            {data.step}
          </span>
        </div>
        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {data.status}
        </span>
      </div>

      <div className="font-semibold text-slate-900 text-sm">{data.label}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{data.desc}</div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blue-600 !border-2 !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  pipeline: PipelineNode,
};

const INITIAL_NODES: Node[] = [
  {
    id: "1",
    type: "pipeline",
    position: { x: 50, y: 150 },
    data: {
      step: "01",
      label: "Discovery Prompt",
      desc: "Intent extraction & constraints",
      status: "Ready",
      icon: "prompt",
      isActive: true,
    },
  },
  {
    id: "2",
    type: "pipeline",
    position: { x: 330, y: 60 },
    data: {
      step: "02",
      label: "PRD Studio",
      desc: "RFC-204 & Acceptance tests",
      status: "Verified",
      icon: "prd",
    },
  },
  {
    id: "3",
    type: "pipeline",
    position: { x: 330, y: 240 },
    data: {
      step: "03",
      label: "Task Engine",
      desc: "Acyclic DAG schedule",
      status: "Compiled",
      icon: "task",
    },
  },
  {
    id: "4",
    type: "pipeline",
    position: { x: 610, y: 60 },
    data: {
      step: "04",
      label: "Design Studio",
      desc: "Tokens & WCAG AAA UI",
      status: "Validated",
      icon: "design",
    },
  },
  {
    id: "5",
    type: "pipeline",
    position: { x: 610, y: 240 },
    data: {
      step: "05",
      label: "Build-ready",
      desc: "Next.js 16 TSX emission",
      status: "Ready",
      icon: "build",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#3b82f6", strokeWidth: 2 },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    style: { stroke: "#6366f1", strokeWidth: 2 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    animated: true,
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
  {
    id: "e4-5",
    source: "4",
    target: "5",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
];

export interface XYFlowCanvasProps {
  onNodeSelect?: (nodeId: string) => void;
  className?: string;
}

export default function XYFlowCanvas({
  onNodeSelect,
  className = "w-full h-[460px]",
}: XYFlowCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50/40 ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeSelect?.(node.id)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
        <Controls className="!bg-white !border-slate-200/90 !rounded-xl !shadow-sm" />
        <MiniMap
          nodeColor="#e2e8f0"
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!rounded-xl !border !border-slate-200/80 !shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
