"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_FILE_TREE, DEMO_CODE_FILES } from "@/lib/demo-data";
import type { FileNode } from "@/lib/demo-data";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Copy,
  Download,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── File tree ─────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  pathPrefix,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  pathPrefix: string;
}) {
  const fullPath = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "dir") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded
            text-[13px] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/5
            transition-colors"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
          )}
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/70" />
          )}
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <TreeNode
            key={child.name}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
            pathPrefix={fullPath}
          />
        ))}
      </div>
    );
  }

  const isSelected = selectedPath === fullPath;
  const hasCode = fullPath in DEMO_CODE_FILES;

  return (
    <button
      onClick={() => hasCode && onSelect(fullPath)}
      className={`flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded
        text-[13px] transition-colors ${
        isSelected
          ? "bg-[#1E6BFF]/15 text-[#F4F4F5]"
          : hasCode
          ? "text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/5 cursor-pointer"
          : "text-[#71717A] cursor-default"
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      disabled={!hasCode}
    >
      <span className="w-3.5 h-3.5 shrink-0" />
      <File className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
      <span>{node.name}</span>
    </button>
  );
}

function FileTree({
  selectedPath,
  onSelect,
}: {
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <nav className="py-2">
      {DEMO_FILE_TREE.map((node) => (
        <TreeNode
          key={node.name}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          pathPrefix=""
        />
      ))}
    </nav>
  );
}

// ─── Code viewer ───────────────────────────────────────────────────────────────

// Very simple syntax highlighter (token-based CSS classes)
function highlightCode(code: string, lang: string): React.ReactNode {
  if (lang !== "typescript" && lang !== "tsx") {
    return <span className="text-[#A1A1AA]">{code}</span>;
  }

  // We do line-by-line rendering with basic keyword highlighting
  const lines = code.split("\n");
  return lines.map((line, li) => (
    <span key={li} className="block">
      <HighlightLine line={line} />
      {"\n"}
    </span>
  ));
}

const KEYWORDS = /\b(import|export|from|const|let|var|function|return|type|interface|extends|implements|class|new|async|await|default|if|else|for|while|switch|case|break|null|undefined|true|false|typeof|keyof|Record|Partial|Omit|string|number|boolean|void)\b/g;
const STRINGS = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
const COMMENTS = /(\/\/.*$)/gm;
const JSX_TAG = /(<\/?[A-Z][A-Za-z]*)/g;

function HighlightLine({ line }: { line: string }) {
  // Simple pass — just color the line by dominant content
  const trimmed = line.trimStart();

  if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
    return <span className="text-[#52525B] italic">{line}</span>;
  }
  if (trimmed.startsWith("import") || trimmed.startsWith("export")) {
    return (
      <span>
        <span className="text-[#7C3AED]">{line.match(/^(\s*(?:import|export)\s+)/)?.[1] ?? ""}</span>
        <span className="text-[#A1A1AA]">{line.replace(/^(\s*(?:import|export)\s+)/, "")}</span>
      </span>
    );
  }

  // Generic: show with muted color
  return <span className="text-[#A1A1AA]">{line}</span>;
}

// ─── Build status ─────────────────────────────────────────────────────────────

const BUILD_CHECKS = [
  { label: "TypeScript strict", status: "pass" as const },
  { label: "ESLint (0 warnings)", status: "pass" as const },
  { label: "npm run build", status: "pass" as const },
  { label: "Unit tests (8/8)", status: "pass" as const },
  { label: "Bundle size (< 200kB)", status: "pass" as const },
];

// ─── Main component ───────────────────────────────────────────────────────────

// Default: open types.ts
const DEFAULT_FILE = "src/lib/types.ts";

export default function TabKode() {
  const [selectedPath, setSelectedPath] = useState(DEFAULT_FILE);
  const [copied, setCopied] = useState(false);

  const currentFile = DEMO_CODE_FILES[selectedPath];

  function handleCopy() {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!currentFile) return;
    const blob = new Blob([currentFile.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedPath.split("/").pop() ?? "file.ts";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadScaffold() {
    // In real app: download ZIP; demo just downloads current file
    handleDownload();
  }

  const lines = currentFile?.code.split("\n").length ?? 0;

  return (
    <div className="flex flex-col gap-0 py-8">
      {/* Build status bar */}
      <div className="px-4 sm:px-6 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3 flex-wrap">
          {BUILD_CHECKS.map((check) => (
            <span
              key={check.label}
              className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {check.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-0 flex-1 min-h-0">
        {/* File tree sidebar */}
        <div className="w-52 sm:w-60 shrink-0 border-r border-white/8 px-2 pt-4 overflow-y-auto max-h-[640px]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#71717A] px-2 pb-2">
            File Scaffold
          </p>
          <FileTree selectedPath={selectedPath} onSelect={setSelectedPath} />
        </div>

        {/* Code panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* File header */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/8 bg-[#030507]">
            <div className="flex items-center gap-2 min-w-0">
              <File className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
              <span className="text-[13px] font-mono text-[#A1A1AA] truncate">
                {selectedPath}
              </span>
              <span className="text-[12px] text-[#71717A] shrink-0">
                {lines} baris
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px]
                  border border-white/10 text-[12px] text-[#A1A1AA] hover:text-[#F4F4F5]
                  hover:border-white/20 transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copied ? "Disalin" : "Salin"}</span>
              </button>
              <button
                onClick={handleDownloadScaffold}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[8px]
                  border border-white/10 text-[12px] text-[#A1A1AA] hover:text-[#F4F4F5]
                  hover:border-white/20 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Unduh Scaffold</span>
              </button>
            </div>
          </div>

          {/* Code display */}
          <AnimatePresence mode="wait">
            {currentFile ? (
              <motion.div
                key={selectedPath}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-auto max-h-[580px]"
              >
                <pre className="min-h-full p-4 bg-[#030507]">
                  <code className="font-mono text-[13px] leading-relaxed">
                    {currentFile.code.split("\n").map((line, i) => (
                      <span key={i} className="flex">
                        {/* Line number */}
                        <span className="select-none w-10 shrink-0 text-right pr-4 text-[#3F3F46] text-[12px] tabular-nums">
                          {i + 1}
                        </span>
                        {/* Code line with basic coloring */}
                        <span className={getLineColor(line)}>{line || " "}</span>
                      </span>
                    ))}
                  </code>
                </pre>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center text-[#71717A] text-sm"
              >
                Pilih file dari sidebar untuk melihat kode
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Simple line colorizer (avoids a full syntax highlight library)
function getLineColor(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
    return "text-[#52525B] italic";
  }
  if (trimmed.startsWith("import") || trimmed.startsWith("export default") || trimmed.startsWith("export type") || trimmed.startsWith("export interface") || trimmed.startsWith("export const") || trimmed.startsWith("export function")) {
    return "text-[#C084FC]";
  }
  if (trimmed.startsWith("interface") || trimmed.startsWith("type ")) {
    return "text-[#7DD3FC]";
  }
  if (trimmed.match(/^\s*\/\//)) {
    return "text-[#52525B] italic";
  }
  if (trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith("`")) {
    return "text-[#86EFAC]";
  }
  if (trimmed.match(/^(const|let|var|return|function|class|async|await)\b/)) {
    return "text-[#93C5FD]";
  }
  return "text-[#A1A1AA]";
}
