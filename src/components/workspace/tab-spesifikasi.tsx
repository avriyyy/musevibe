"use client";

import React, { useState, useMemo, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseMd, parseInline } from "@/lib/markdown";
import type { MdToken, MdInline } from "@/lib/markdown";
import { DEMO_PRD } from "@/lib/demo-data";
import { Copy, Download, Edit3, Check, List } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Inline renderer ────────────────────────────────────────────────────────

function RenderInlines({ inlines }: { inlines: MdInline[] }) {
  return (
    <>
      {inlines.map((node, i) => {
        switch (node.kind) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-[#F4F4F5]">
                {node.text}
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="italic text-[#A1A1AA]">
                {node.text}
              </em>
            );
          case "code":
            return (
              <code
                key={i}
                className="px-1.5 py-0.5 rounded bg-white/8 font-mono text-[13px] text-[#F4F4F5]"
              >
                {node.text}
              </code>
            );
          case "del":
            return (
              <del key={i} className="line-through text-[#71717A]">
                {node.text}
              </del>
            );
          default:
            return <React.Fragment key={i}>{node.text}</React.Fragment>;
        }
      })}
    </>
  );
}

// ─── Token renderer ──────────────────────────────────────────────────────────

function RenderToken({ token }: { token: MdToken }) {
  switch (token.type) {
    case "h1":
      return (
        <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] mt-8 mb-3 tracking-tight leading-tight first:mt-0">
          {token.text}
        </h1>
      );
    case "h2":
      return (
        <h2 className="text-xl font-semibold text-[#F4F4F5] mt-7 mb-2.5 tracking-tight border-b border-white/8 pb-2">
          {token.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="text-base font-semibold text-[#F4F4F5] mt-5 mb-2">
          {token.text}
        </h3>
      );
    case "h4":
      return (
        <h4 className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-wide mt-4 mb-1.5">
          {token.text}
        </h4>
      );
    case "p":
      return (
        <p className="text-[15px] text-[#A1A1AA] leading-relaxed mb-2">
          <RenderInlines inlines={token.inlines} />
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc list-inside space-y-1.5 mb-3 pl-1">
          {token.items.map((item, i) => (
            <li key={i} className="text-[15px] text-[#A1A1AA] leading-relaxed">
              <RenderInlines inlines={item} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal list-inside space-y-1.5 mb-3 pl-1">
          {token.items.map((item, i) => (
            <li key={i} className="text-[15px] text-[#A1A1AA] leading-relaxed">
              <RenderInlines inlines={item} />
            </li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre className="rounded-xl bg-[#030507] border border-white/8 p-4 overflow-x-auto mb-3 mt-2">
          <code className="font-mono text-[13px] text-[#A1A1AA] leading-relaxed whitespace-pre">
            {token.text}
          </code>
          {token.lang && (
            <span className="absolute top-2 right-3 text-[11px] text-[#71717A] font-mono">
              {token.lang}
            </span>
          )}
        </pre>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-[#1E6BFF]/50 pl-4 my-3 text-[#A1A1AA] text-[15px] italic">
          {token.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </blockquote>
      );
    case "table":
      return (
        <div className="overflow-x-auto mb-4 mt-2 rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {token.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left font-semibold text-[#F4F4F5] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {token.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-[#A1A1AA]">
                      <RenderInlines inlines={parseInline(cell)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "hr":
      return <hr className="border-white/8 my-5" />;
    case "blank":
      return null;
    default:
      return null;
  }
}

// ─── Table of Contents ───────────────────────────────────────────────────────

function TableOfContents({ tokens }: { tokens: MdToken[] }) {
  const headings = tokens.filter(
    (t): t is { type: "h2"; text: string } => t.type === "h2"
  );

  return (
    <nav className="sticky top-0 pt-8 hidden lg:block">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#71717A] mb-3">
        Daftar Isi
      </p>
      <ul className="space-y-1">
        {headings.map((h, i) => (
          <li key={i}>
            <a
              href={`#section-${i}`}
              className="block text-sm text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors py-0.5"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TabSpesifikasi() {
  const [view, setView] = useState<"preview" | "source">("preview");
  const [copied, setCopied] = useState(false);
  const uid = useId();

  const tokens = useMemo(() => parseMd(DEMO_PRD), []);

  function handleCopy() {
    navigator.clipboard.writeText(DEMO_PRD).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([DEMO_PRD], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "duitku-prd.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-0 py-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 pb-5 border-b border-white/8">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {(["preview", "source"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`relative px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                view === v
                  ? "text-[#F4F4F5]"
                  : "text-[#A1A1AA] hover:text-[#F4F4F5]"
              }`}
            >
              {view === v && (
                <motion.span
                  layoutId={`tab-indicator-${uid}`}
                  className="absolute inset-0 rounded-[8px] bg-white/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {v === "preview" ? "Pratinjau" : "Kode Markdown"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px]
              border border-white/10 text-sm text-[#A1A1AA] hover:text-[#F4F4F5]
              hover:border-white/20 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Disalin" : "Salin"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px]
              border border-white/10 text-sm text-[#A1A1AA] hover:text-[#F4F4F5]
              hover:border-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unduh Markdown</span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px]
              border border-white/10 text-sm text-[#A1A1AA] hover:text-[#F4F4F5]
              hover:border-white/20 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === "preview" ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex gap-8 px-4 sm:px-6 pt-6"
          >
            {/* Main content */}
            <article className="flex-1 min-w-0">
              {tokens.map((token, i) => (
                <RenderToken key={i} token={token} />
              ))}
            </article>

            {/* Sidebar TOC */}
            <div className="w-48 shrink-0">
              <TableOfContents tokens={tokens} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="source"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="px-4 sm:px-6 pt-6"
          >
            <pre className="rounded-xl bg-[#030507] border border-white/8 p-5 overflow-x-auto">
              <code className="font-mono text-[13px] text-[#A1A1AA] leading-relaxed whitespace-pre">
                {DEMO_PRD}
              </code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
