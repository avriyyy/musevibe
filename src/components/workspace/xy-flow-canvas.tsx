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
function PipelineNode({
  data,
}: {
  data: {
    label: string;
    step: string;
    status: string;
    desc: string;
    icon: string;
    isActive?: boolean;
  };
}) {
  const getIcon = () => {
    switch (data.icon) {
      case "prompt":
        return <Sparkles className="w-4 h-4 text-[#60a5fa]" />;
      case "prd":
        return <FileCode className="w-4 h-4 text-sky-400" />;
      case "task":
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case "design":
        return <Palette className="w-4 h-4 text-violet-400" />;
      case "build":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#60a5fa]" />;
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-2xl border bg-[#0E1017] shadow-lg transition-all duration-200 min-w-[180px] text-left ${
        data.isActive
          ? "border-[#1E6BFF]/60 ring-2 ring-[#1E6BFF]/20"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#1E6BFF] !border-2 !border-[#05060A]"
      />

      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/5">{getIcon()}</div>
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/8 text-slate-300">
            {data.step}
          </span>
        </div>
        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
          {data.status}
        </span>
      </div>

      <div className="font-semibold text-slate-100 text-sm">{data.label}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
        {data.desc}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#1E6BFF] !border-2 !border-[#05060A]"
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
      label: "Prompt",
      desc: "Tulis kebutuhan aplikasimu",
      status: "Selesai",
      icon: "prompt",
      isActive: true,
    },
  },
  {
    id: "2",
    type: "pipeline",
    position: { x: 310, y: 60 },
    data: {
      step: "02",
      label: "Spesifikasi",
      desc: "PRD & kriteria penerimaan",
      status: "Selesai",
      icon: "prd",
    },
  },
  {
    id: "3",
    type: "pipeline",
    position: { x: 310, y: 240 },
    data: {
      step: "03",
      label: "Rencana Kerja",
      desc: "Daftar tugas terurut (DAG)",
      status: "Selesai",
      icon: "task",
    },
  },
  {
    id: "4",
    type: "pipeline",
    position: { x: 570, y: 60 },
    data: {
      step: "04",
      label: "Desain",
      desc: "Komponen & token visual",
      status: "Selesai",
      icon: "design",
    },
  },
  {
    id: "5",
    type: "pipeline",
    position: { x: 570, y: 240 },
    data: {
      step: "05",
      label: "Kode",
      desc: "Next.js siap produksi",
      status: "Siap",
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
    <div
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#030507] ${className}`}
    >
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
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#1e293b"
        />
        <Controls className="!bg-[#0E1017] !border-white/10 !rounded-xl !shadow-sm" />
        <MiniMap
          nodeColor="#1e293b"
          maskColor="rgba(5, 6, 10, 0.7)"
          className="!rounded-xl !border !border-white/10 !shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
