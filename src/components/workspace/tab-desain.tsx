"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_DESIGN_TOKENS, DEMO_PAGE_PREVIEWS } from "@/lib/demo-data";
import { Check, ExternalLink, RefreshCw, Palette } from "lucide-react";

// ─── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ token }: { token: (typeof DEMO_DESIGN_TOKENS.colors)[0] }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(token.value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Determine if swatch needs a border (very dark backgrounds)
  const needsBorder =
    token.value === "#05060A" ||
    token.value === "#0E1017" ||
    token.value === "#14141D";

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-3 rounded-xl bg-[#0E1017] border border-white/8
        p-3 hover:border-white/16 transition-colors text-left w-full"
    >
      <div
        className="w-10 h-10 rounded-[8px] shrink-0 border"
        style={{
          background: token.value.startsWith("rgba") ? token.value : token.value,
          borderColor: needsBorder
            ? "rgba(255,255,255,0.14)"
            : "rgba(255,255,255,0.06)",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-mono text-[#F4F4F5] truncate">{token.token}</p>
        <p className="text-[12px] text-[#71717A]">{token.label}</p>
      </div>
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <span className="text-[11px] font-mono text-[#71717A] group-hover:text-[#A1A1AA] transition-colors">
            {token.value.length > 8 ? "copy" : token.value}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Typography sample ────────────────────────────────────────────────────────

function TypoRow({ row }: { row: (typeof DEMO_DESIGN_TOKENS.typography)[0] }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-white/8 last:border-0">
      <div className="w-44 shrink-0">
        <p className="text-[12px] text-[#71717A]">{row.role}</p>
        <p className="text-[12px] font-mono text-[#A1A1AA]">
          {row.size} · {row.weight}
        </p>
      </div>
      <p
        className="text-[#F4F4F5] leading-snug"
        style={{
          fontSize:
            row.size.includes("48") || row.size.includes("36")
              ? "28px"
              : row.size.includes("28")
              ? "22px"
              : row.size.includes("12")
              ? "12px"
              : "15px",
          fontWeight: row.weight === "Bold" ? 700 : row.weight === "Semibold" ? 600 : row.weight === "Medium" ? 500 : 400,
          fontFamily: row.role.includes("mono") || row.role.includes("Kode") ? "var(--font-geist-mono)" : undefined,
        }}
      >
        {row.sample}
      </p>
    </div>
  );
}

// ─── Page preview card ────────────────────────────────────────────────────────

function PagePreviewCard({
  page,
  onApprove,
  onChange,
  approved,
}: {
  page: (typeof DEMO_PAGE_PREVIEWS)[0];
  onApprove: () => void;
  onChange: () => void;
  approved: boolean;
}) {
  return (
    <motion.div
      layout
      className="rounded-xl bg-[#0E1017] border border-white/8 p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-base font-semibold text-[#F4F4F5]">{page.name}</p>
            {approved && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                <Check className="w-3 h-3" />
                Disetujui
              </span>
            )}
          </div>
          <p className="text-sm text-[#A1A1AA]">{page.description}</p>
        </div>
        <a
          href={`#task-${page.taskRef}`}
          className="shrink-0 inline-flex items-center gap-1 text-[12px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {page.taskRef}
        </a>
      </div>

      {/* Wireframe placeholder */}
      <div className="rounded-[8px] bg-[#030507] border border-white/5 p-4 min-h-[120px] flex flex-col gap-2">
        {/* Mock wireframe elements */}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2 w-16 rounded bg-white/10" />
          <div className="h-2 w-10 rounded bg-white/5" />
        </div>
        {page.elements.map((el, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="shrink-0 w-1.5 h-1.5 rounded-full"
              style={{
                background: i === 0 ? "#1E6BFF" : i === 1 ? "#7C3AED" : "rgba(255,255,255,0.2)",
              }}
            />
            <div
              className="h-1.5 rounded bg-white/8"
              style={{ width: `${60 + (i * 17) % 30}%` }}
            />
          </div>
        ))}
      </div>

      {/* Element list */}
      <ul className="space-y-1">
        {page.elements.map((el, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-[#A1A1AA]">
            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
            {el}
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onApprove}
          disabled={approved}
          className={`flex-1 h-9 rounded-[10px] text-sm font-medium transition-all border ${
            approved
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
              : "bg-white/5 border-white/10 text-[#A1A1AA] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
          }`}
        >
          {approved ? "✓ Disetujui" : "Setujui"}
        </button>
        <button
          onClick={onChange}
          className="h-9 px-4 rounded-[10px] border border-white/10 text-sm
            text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-white/20 transition-colors
            flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Ubah
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TabDesain() {
  const [section, setSection] = useState<"tokens" | "pages">("tokens");
  const [approvedPages, setApprovedPages] = useState<Record<string, boolean>>({});

  function toggleApprove(id: string) {
    setApprovedPages((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const approvedCount = Object.values(approvedPages).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-0 py-8">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 pb-5 border-b border-white/8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {(["tokens", "pages"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`relative px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                section === s
                  ? "text-[#F4F4F5]"
                  : "text-[#A1A1AA] hover:text-[#F4F4F5]"
              }`}
            >
              {section === s && (
                <motion.span
                  layoutId="design-tab-indicator"
                  className="absolute inset-0 rounded-[8px] bg-white/10"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {s === "tokens" ? "Design System" : "Pratinjau Halaman"}
            </button>
          ))}
        </div>

        {section === "pages" && (
          <span className="text-sm text-[#A1A1AA]">
            {approvedCount}/{DEMO_PAGE_PREVIEWS.length} disetujui
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          {section === "tokens" ? (
            <motion.div
              key="tokens"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-8"
            >
              {/* Colors */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4 text-[#1E6BFF]" />
                  <h3 className="text-base font-semibold text-[#F4F4F5]">Warna</h3>
                  <span className="text-sm text-[#71717A]">— klik untuk salin nilai</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {DEMO_DESIGN_TOKENS.colors.map((c) => (
                    <ColorSwatch key={c.token} token={c} />
                  ))}
                </div>
              </section>

              {/* Typography */}
              <section>
                <h3 className="text-base font-semibold text-[#F4F4F5] mb-4">
                  Tipografi
                </h3>
                <div className="rounded-xl bg-[#0E1017] border border-white/8 px-4">
                  {DEMO_DESIGN_TOKENS.typography.map((row, i) => (
                    <TypoRow key={i} row={row} />
                  ))}
                </div>
              </section>

              {/* Components */}
              <section>
                <h3 className="text-base font-semibold text-[#F4F4F5] mb-4">
                  Komponen
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEMO_DESIGN_TOKENS.components.map((comp, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-[#0E1017] border border-white/8 p-4"
                    >
                      <p className="text-sm font-medium text-[#F4F4F5] mb-1">
                        {comp.name}
                      </p>
                      <p className="text-[12px] font-mono text-[#71717A]">
                        {comp.spec}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="pages"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {DEMO_PAGE_PREVIEWS.map((page) => (
                <PagePreviewCard
                  key={page.id}
                  page={page}
                  approved={approvedPages[page.id] ?? false}
                  onApprove={() => toggleApprove(page.id)}
                  onChange={() => {}}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
