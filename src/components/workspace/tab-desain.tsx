"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_DESIGN_TOKENS, DEMO_PAGE_PREVIEWS } from "@/lib/demo-data";
import {
  Check, Copy, MessageSquare, Send, ArrowRight, Download, Layers, Palette,
} from "lucide-react";

// ─── Data demo prototipe (sama dengan DuitKu di tab lain) ────────────────────
const TX = [
  { id: 1, label: "Gaji Bulanan", cat: "Gaji", amount: 8500000, type: "in" as const, date: "1 Okt" },
  { id: 2, label: "Belanja Harian", cat: "Makan", amount: -125000, type: "out" as const, date: "3 Okt" },
  { id: 3, label: "Ojek Online", cat: "Transport", amount: -45000, type: "out" as const, date: "4 Okt" },
  { id: 4, label: "Langganan Musik", cat: "Hiburan", amount: -55000, type: "out" as const, date: "5 Okt" },
  { id: 5, label: "Freelance Desain", cat: "Gaji", amount: 1200000, type: "in" as const, date: "6 Okt" },
];
const CATS = ["Semua", "Makan", "Transport", "Gaji", "Hiburan"];
const BREAKDOWN = [
  { name: "Makan", pct: 34, amount: "Rp 1.170.000", color: "#1E6BFF" },
  { name: "Transport", pct: 22, amount: "Rp 756.000", color: "#7C3AED" },
  { name: "Hiburan", pct: 14, amount: "Rp 482.000", color: "#F472B6" },
  { name: "Lainnya", pct: 30, amount: "Rp 1.042.000", color: "#A1A1AA" },
];
const MONTHS = [
  { m: "Mei", h: 42 }, { m: "Jun", h: 58 }, { m: "Jul", h: 50 },
  { m: "Agu", h: 70 }, { m: "Sep", h: 64 }, { m: "Okt", h: 88 },
];
const BUDGETS = [
  { name: "Makan", used: 78, label: "Rp 1.170.000 / Rp 1.500.000", tone: "#F59E0B" },
  { name: "Transport", used: 52, label: "Rp 756.000 / Rp 1.450.000", tone: "#10B981" },
  { name: "Hiburan", used: 96, label: "Rp 482.000 / Rp 500.000", tone: "#F87171" },
];

const fmt = (n: number) =>
  (n < 0 ? "-Rp " : "Rp ") + Math.abs(n).toLocaleString("id-ID");

// ─── Prototipe live per halaman ──────────────────────────────────────────────
function Prototype({ pageId }: { pageId: string }) {
  const [filter, setFilter] = useState("Semua");
  const shown = filter === "Semua" ? TX : TX.filter((t) => t.cat === filter);

  if (pageId === "dashboard") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
          <p className="text-sm text-slate-400">Saldo bersih</p>
          <p className="mt-1 text-4xl font-bold text-white">Rp 3.450.000</p>
          <p className="mt-1 text-sm text-emerald-400">+12% dari bulan lalu</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-4">
            <p className="text-sm text-slate-400">Pemasukan</p>
            <p className="mt-1 text-xl font-semibold text-emerald-400">Rp 9.700.000</p>
          </div>
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-4">
            <p className="text-sm text-slate-400">Pengeluaran</p>
            <p className="mt-1 text-xl font-semibold text-red-400">Rp 6.250.000</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#0E1017] border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-white">Transaksi terakhir</p>
            <button className="text-sm font-medium text-white bg-[#1E6BFF] rounded-[10px] px-4 py-2">+ Transaksi</button>
          </div>
          <ul className="divide-y divide-white/5">
            {TX.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-white">{t.label}</p>
                  <p className="text-sm text-slate-500">{t.cat} · {t.date}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === "in" ? "text-emerald-400" : "text-red-400"}`}>{fmt(t.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  if (pageId === "laporan") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
          <p className="font-semibold text-white mb-4">Tren pengeluaran 6 bulan</p>
          <div className="flex items-end gap-3 h-40">
            {MONTHS.map((m) => (
              <div key={m.m} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-[#1E6BFF]/80" style={{ height: `${m.h}%` }} />
                <span className="text-xs text-slate-500">{m.m}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5 space-y-3">
          <p className="font-semibold text-white">Breakdown kategori</p>
          {BREAKDOWN.map((b) => (
            <div key={b.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{b.name} · {b.pct}%</span>
                <span className="text-slate-400">{b.amount}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (pageId === "anggaran") {
    return (
      <div className="grid sm:grid-cols-3 gap-4">
        {BUDGETS.map((b) => (
          <div key={b.name} className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <p className="font-semibold text-white">{b.name}</p>
            <p className="mt-1 text-sm text-slate-400">{b.label}</p>
            <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${b.used}%`, background: b.tone }} />
            </div>
            <p className="mt-2 text-sm text-slate-300">{b.used}% terpakai</p>
          </div>
        ))}
      </div>
    );
  }
  // transaksi
  return (
    <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === c ? "bg-white text-black font-medium" : "bg-white/5 text-slate-300 border border-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-white/5">
        {shown.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm text-white">{t.label}</p>
              <p className="text-sm text-slate-500">{t.cat} · {t.date}</p>
            </div>
            <span className={`text-sm font-semibold ${t.type === "in" ? "text-emerald-400" : "text-red-400"}`}>{fmt(t.amount)}</span>
          </li>
        ))}
        {shown.length === 0 && <li className="py-4 text-sm text-slate-500">Tidak ada transaksi untuk kategori ini.</li>}
      </ul>
    </div>
  );
}

// ─── Komponen utama: Studio ala OpenDesign ───────────────────────────────────
export default function TabDesain({ onNextTab }: { onNextTab?: () => void }) {
  const [pageId, setPageId] = useState(DEMO_PAGE_PREVIEWS[0].id);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [refine, setRefine] = useState("");
  const [comments, setComments] = useState([
    { id: 1, author: "Tim produk", text: "Angka saldo di Dashboard sudah jelas, tapi tombol + Transaksi di mobile harus tetap terlihat saat scroll.", resolved: false },
    { id: 2, author: "Desainer", text: "Warna kategori Hiburan di Laporan terlalu mirip dengan aksen utama, bedakan sedikit.", resolved: false },
  ]);
  const [copied, setCopied] = useState(false);
  const page = DEMO_PAGE_PREVIEWS.find((p) => p.id === pageId) ?? DEMO_PAGE_PREVIEWS[0];
  const approvedCount = Object.values(approved).filter(Boolean).length;

  const designMd = `# DESIGN.md — DuitKu\n\n- Tema gelap: bg #05060A, surface #0E1017, border white/8.\n- Gradient logo hanya garis tipis 1-2px, bukan background penuh.\n- Radius kartu 12px, tombol 10px, section 96-128px.\n- Teks sekunder minimal 14px, kontras cukup di background gelap.\n- Satu aksi utama per layar; aksi sekunder tidak bersaing.`;

  return (
    <div className="space-y-6">
      {/* Studio header ala OpenDesign: sistem + aksi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0E1017] border border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E6BFF]/15 border border-white/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-[#1E6BFF]" />
          </div>
          <div>
            <p className="font-semibold text-white">DuitKu Design System · v1</p>
            <p className="text-sm text-slate-400">{approvedCount} dari {DEMO_PAGE_PREVIEWS.length} halaman disetujui · aturan dari DESIGN.md yang sama di semua halaman</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(designMd).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-white/10 text-sm text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Tersalin" : "Salin DESIGN.md"}
          </button>
          <button
            onClick={() => setApproved(Object.fromEntries(DEMO_PAGE_PREVIEWS.map((p) => [p.id, true])))}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-white/10 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Check className="w-4 h-4" /> Setujui semua
          </button>
          <button
            onClick={onNextTab}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[10px] bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Kirim ke Kode <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Panel kiri: Design System */}
        <aside className="space-y-6">
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <p className="flex items-center gap-2 font-semibold text-white mb-3"><Layers className="w-4 h-4" /> Token warna</p>
            <ul className="space-y-2">
              {DEMO_DESIGN_TOKENS.colors.map((c) => (
                <li key={c.token} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-md border border-white/10 shrink-0" style={{ background: c.value }} />
                  <span className="font-mono text-slate-300">{c.token}</span>
                  <span className="text-slate-500 truncate">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <p className="font-semibold text-white mb-3">Tipografi</p>
            <ul className="space-y-2 text-sm">
              {DEMO_DESIGN_TOKENS.typography.map((t) => (
                <li key={t.role} className="flex justify-between gap-3">
                  <span className="text-slate-400">{t.role}</span>
                  <span className="font-mono text-slate-300 text-right">{t.size} · {t.weight}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <p className="font-semibold text-white mb-3">Komponen</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {DEMO_DESIGN_TOKENS.components.map((c) => (
                <li key={c.name}><span className="text-slate-200">{c.name}</span> — {c.spec}</li>
              ))}
            </ul>
          </div>
          <details className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <summary className="cursor-pointer font-semibold text-white text-sm">Lihat DESIGN.md</summary>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-400 font-mono">{designMd}</pre>
          </details>
        </aside>

        {/* Tengah: prototipe live + refine/feedback */}
        <div className="space-y-6 min-w-0">
          <div>
            <p className="font-semibold text-white mb-3">Prototipe — {page.name}</p>
            <p className="text-sm text-slate-400 mb-4">{page.description} · tertaut ke tugas {page.taskRef} di Rencana Kerja</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {DEMO_PAGE_PREVIEWS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPageId(p.id)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                    pageId === p.id ? "bg-white text-black border-white" : "bg-white/5 text-slate-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  {p.name}
                  {approved[p.id] ? " ✓" : ""}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={pageId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Prototype pageId={pageId} />
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setApproved((a) => ({ ...a, [pageId]: !a[pageId] }))}
                className={`h-10 px-5 rounded-[10px] text-sm font-medium border transition-colors ${
                  approved[pageId] ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                }`}
              >
                {approved[pageId] ? "✓ Halaman disetujui" : "Setujui halaman ini"}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(`DESIGN.md DuitKu — halaman ${page.name}`).catch(() => {}); }}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-white/10 text-sm text-slate-300 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" /> Ekspor halaman
              </button>
            </div>
          </div>

          {/* Refine + feedback ala OpenDesign Studio */}
          <div className="rounded-xl bg-[#0E1017] border border-white/10 p-5">
            <p className="flex items-center gap-2 font-semibold text-white mb-1"><MessageSquare className="w-4 h-4" /> Refine & feedback</p>
            <p className="text-sm text-slate-400 mb-4">Minta perubahan atau beri komentar di proyek yang sama — prototipe diperbarui di tempat, tidak pindah alat.</p>
            <div className="flex gap-2 mb-5">
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="Minta perubahan desain, misal: perbesar angka saldo di mobile…"
                className="flex-1 min-w-0 h-11 rounded-[10px] bg-white/5 border border-white/10 px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/25"
              />
              <button
                onClick={() => {
                  if (!refine.trim()) return;
                  setComments((c) => [{ id: Date.now(), author: "Kamu", text: refine.trim(), resolved: false }, ...c]);
                  setRefine("");
                }}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[10px] bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" /> Kirim
              </button>
            </div>
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">{c.author}</p>
                    <p className="mt-0.5 text-sm text-slate-400 leading-relaxed">{c.text}</p>
                  </div>
                  <button
                    onClick={() => setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))}
                    className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      c.resolved ? "border-emerald-500/30 text-emerald-400" : "border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {c.resolved ? "✓ Selesai" : "Tandai selesai"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
