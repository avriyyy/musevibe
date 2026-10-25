/**
 * Demo data for DuitKu — aplikasi pencatat keuangan pribadi.
 * Dipakai konsisten di semua tab workspace: Prompt → Spesifikasi → Rencana Kerja → Desain → Kode.
 */

// ─── TAB 1: PROMPT ───────────────────────────────────────────────────────────

export const DEMO_PROMPT =
  "Buat aplikasi pencatat keuangan pribadi yang bisa mencatat pemasukan dan pengeluaran harian, menampilkan ringkasan bulanan, dan memberikan laporan kategori pengeluaran terbesar.";

export const DEMO_CLARIFICATIONS = [
  {
    id: "target",
    question: "Siapa pengguna utama aplikasi ini?",
    options: [
      "Mahasiswa / pelajar",
      "Karyawan / pekerja lepas",
      "Keluarga muda",
      "Pelaku usaha kecil",
    ],
    selected: ["Karyawan / pekerja lepas", "Mahasiswa / pelajar"],
  },
  {
    id: "platform",
    question: "Platform yang diprioritaskan?",
    options: ["Web (browser)", "Mobile (PWA)", "Mobile native (iOS/Android)", "Desktop"],
    selected: ["Web (browser)", "Mobile (PWA)"],
  },
  {
    id: "auth",
    question: "Apakah perlu login / autentikasi pengguna?",
    options: ["Ya, login wajib", "Opsional (bisa tanpa login)", "Tidak perlu, data lokal saja"],
    selected: ["Opsional (bisa tanpa login)"],
  },
  {
    id: "features",
    question: "Fitur tambahan yang diinginkan?",
    options: [
      "Ekspor ke CSV/PDF",
      "Notifikasi pengingat",
      "Sinkronisasi multi-perangkat",
      "Anggaran per kategori",
      "Grafik tren waktu",
    ],
    selected: ["Ekspor ke CSV/PDF", "Anggaran per kategori", "Grafik tren waktu"],
  },
  {
    id: "tech",
    question: "Preferensi teknologi?",
    options: ["Biarkan AI pilih", "Next.js + Tailwind", "Remix", "Vite + React"],
    selected: ["Next.js + Tailwind"],
  },
];

// ─── TAB 2: SPESIFIKASI (PRD) ─────────────────────────────────────────────────

export const DEMO_PRD = `# DuitKu — Product Requirements Document

**Versi:** 1.0  
**Tanggal:** Oktober 2026  
**Dibuat oleh:** MuseVibe  
**Status:** Draft untuk persetujuan tim

---

## 1. Ringkasan Eksekutif

DuitKu adalah aplikasi web progresif (PWA) pencatat keuangan pribadi yang membantu pengguna melacak pemasukan dan pengeluaran harian, memahami pola keuangan bulanan, dan mengelola anggaran per kategori. Aplikasi dapat digunakan tanpa login (data lokal) atau dengan login opsional untuk sinkronisasi.

**Permasalahan yang diselesaikan:**
- Pengguna tidak tahu ke mana uang mereka pergi setiap bulan
- Pencatatan manual di spreadsheet membosankan dan tidak konsisten
- Tidak ada gambaran visual yang cepat tentang kondisi keuangan

**Solusi:** Antarmuka minimal yang memudahkan input cepat (\< 30 detik per transaksi) dengan laporan otomatis yang langsung terbaca.

---

## 2. Tujuan Produk

| Tujuan | Metrik Keberhasilan |
|--------|-------------------|
| Pencatatan cepat | Input transaksi \< 30 detik |
| Laporan terbaca | Pengguna memahami ringkasan tanpa panduan |
| Retensi mingguan | 60% pengguna kembali dalam 7 hari |
| Ekspor berfungsi | CSV/PDF terunduh tanpa error |

---

## 3. Pengguna Target

**Persona Utama: Andi, 26, karyawan swasta**
- Gaji tetap bulanan, pengeluaran bervariasi
- Ingin tahu apakah pengeluaran makan masih wajar
- Tidak mau aplikasi yang rumit; buka → catat → tutup

**Persona Sekunder: Rara, 21, mahasiswi**
- Uang saku terbatas, ingin disiplin menabung
- Sering pakai HP, jarang buka laptop
- Butuh notifikasi sederhana saat mendekati batas anggaran

---

## 4. Fitur dan Kriteria Penerimaan

### 4.1 Pencatatan Transaksi (P0)

**Deskripsi:** Form input cepat untuk mencatat satu transaksi pemasukan atau pengeluaran.

**Kriteria Penerimaan:**
- [ ] Form memiliki field: jumlah, tipe (masuk/keluar), kategori, catatan (opsional), tanggal (default hari ini)
- [ ] Kategori pengeluaran bawaan: Makan, Transport, Belanja, Hiburan, Kesehatan, Lainnya
- [ ] Kategori pemasukan bawaan: Gaji, Freelance, Transfer, Lainnya
- [ ] Validasi: jumlah harus angka positif, kategori wajib dipilih
- [ ] Transaksi tersimpan dalam \< 500ms
- [ ] Tersedia di halaman utama tanpa navigasi tambahan

### 4.2 Ringkasan Bulanan (P0)

**Deskripsi:** Dashboard menampilkan saldo, total pemasukan, dan total pengeluaran bulan berjalan.

**Kriteria Penerimaan:**
- [ ] Menampilkan saldo bersih bulan ini (pemasukan − pengeluaran)
- [ ] Menampilkan total pemasukan dan pengeluaran terpisah
- [ ] Navigasi bulan (mundur/maju) tanpa reload halaman
- [ ] Data terupdate real-time setelah transaksi baru ditambahkan

### 4.3 Laporan Kategori (P0)

**Deskripsi:** Visualisasi pengeluaran per kategori untuk bulan yang dipilih.

**Kriteria Penerimaan:**
- [ ] Tampilkan daftar kategori diurutkan dari terbesar ke terkecil
- [ ] Setiap kategori memiliki bar progres relatif terhadap total pengeluaran
- [ ] Tampilkan persentase dan jumlah nominal per kategori
- [ ] Grafik garis tren pengeluaran 6 bulan terakhir tersedia di halaman laporan

### 4.4 Anggaran per Kategori (P1)

**Deskripsi:** Pengguna dapat menetapkan batas pengeluaran per kategori per bulan.

**Kriteria Penerimaan:**
- [ ] Form pengaturan anggaran per kategori
- [ ] Indikator visual (hijau/kuning/merah) saat mendekati atau melampaui batas
- [ ] Notifikasi browser saat 80% anggaran kategori tercapai
- [ ] Anggaran tersimpan dan berlaku untuk bulan-bulan berikutnya

### 4.5 Ekspor Data (P1)

**Deskripsi:** Pengguna dapat mengunduh data transaksi dalam format CSV atau PDF.

**Kriteria Penerimaan:**
- [ ] Ekspor CSV berisi semua kolom transaksi (tanggal, tipe, kategori, jumlah, catatan)
- [ ] Ekspor PDF berisi ringkasan bulan dan tabel transaksi yang terformat
- [ ] Filter ekspor: rentang tanggal dapat dipilih
- [ ] File terunduh langsung tanpa perlu server (client-side generation)

### 4.6 Login Opsional & Sinkronisasi (P2)

**Deskripsi:** Pengguna dapat login untuk menyinkronkan data antar perangkat.

**Kriteria Penerimaan:**
- [ ] Login via email/password atau Google OAuth
- [ ] Data lokal dapat di-merge ke akun saat pertama login
- [ ] Data tersinkron dalam \< 2 detik setelah perubahan

---

## 5. Batasan Teknis

- **Frontend:** Next.js 16, TypeScript strict, Tailwind CSS v4
- **State:** Zustand untuk state global, localStorage untuk persistensi lokal
- **Database (opsional):** Prisma + SQLite lokal untuk pengembangan, PostgreSQL untuk produksi
- **Auth (P2):** NextAuth.js v5
- **Ekspor:** Papaparse untuk CSV, jsPDF untuk PDF (client-side)
- **Grafik:** Recharts
- **PWA:** next-pwa untuk service worker dan manifest

---

## 6. Arsitektur Halaman

\`\`\`
/ (Dashboard)
├── /transaksi         — Daftar semua transaksi + filter
├── /laporan           — Grafik tren + breakdown kategori
├── /anggaran          — Pengaturan batas per kategori
└── /pengaturan        — Profil, ekspor, preferensi
\`\`\`

---

## 7. Alur Pengguna Utama

\`\`\`
Buka aplikasi
  ↓
Dashboard (saldo + ringkasan bulan)
  ↓
Tap tombol "+ Transaksi"
  ↓
Isi form cepat (jumlah, kategori, tipe)
  ↓
Simpan → Dashboard terupdate otomatis
  ↓
Buka Laporan → lihat kategori terbesar
\`\`\`

---

## 8. Non-Fungsional

| Aspek | Persyaratan |
|-------|-------------|
| Performa | First Contentful Paint \< 1.5s |
| Aksesibilitas | WCAG 2.1 AA (kontras, keyboard nav, screen reader) |
| Responsivitas | Fungsi penuh di 375px–1440px |
| Offline | Fitur P0 berfungsi tanpa koneksi internet |
| Privasi | Data lokal tidak dikirim tanpa izin pengguna |

---

## 9. Risiko

| Risiko | Probabilitas | Mitigasi |
|--------|-------------|----------|
| Pengguna tidak konsisten mencatat | Tinggi | Onboarding singkat, input \< 30 detik |
| Data hilang di localStorage | Sedang | Ekspor CSV sebagai backup |
| Kompleksitas sinkronisasi P2 | Tinggi | Defer ke sprint berikutnya, tidak bloking P0 |
`;

// ─── TAB 3: RENCANA KERJA ────────────────────────────────────────────────────

export type TaskStatus = "todo" | "doing" | "done" | "blocked";
export type TaskPriority = "P0" | "P1" | "P2";

export interface WorkTask {
  id: string;
  priority: TaskPriority;
  phase: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  dependencies: string[];
  status: TaskStatus;
  estimate: string;
}

export const DEMO_TASKS: WorkTask[] = [
  {
    id: "T01",
    priority: "P0",
    phase: "Fondasi",
    title: "Setup proyek Next.js + TypeScript + Tailwind",
    description: "Inisialisasi proyek dengan konfigurasi yang benar: ESLint, Prettier, path alias, dan struktur folder.",
    acceptanceCriteria: [
      "npm run build berjalan tanpa error",
      "npx tsc --noEmit 0 error",
      "Tailwind v4 terkonfigurasi dengan design token dari DESIGN.md",
    ],
    dependencies: [],
    status: "done",
    estimate: "2 jam",
  },
  {
    id: "T02",
    priority: "P0",
    phase: "Fondasi",
    title: "Model data transaksi + Zustand store",
    description: "Definisikan TypeScript type untuk Transaction, Category, Budget. Buat Zustand store dengan persistensi localStorage.",
    acceptanceCriteria: [
      "Type Transaction mencakup: id, amount, type, categoryId, note, date",
      "Store dapat add/edit/delete transaksi",
      "Persistensi otomatis ke localStorage",
      "Hidration SSR aman (tidak ada mismatch)",
    ],
    dependencies: ["T01"],
    status: "done",
    estimate: "3 jam",
  },
  {
    id: "T03",
    priority: "P0",
    phase: "Fitur Inti",
    title: "Halaman Dashboard + form tambah transaksi",
    description: "Halaman utama dengan ringkasan saldo, total masuk/keluar bulan ini, dan sheet/modal input transaksi cepat.",
    acceptanceCriteria: [
      "Saldo = pemasukan − pengeluaran bulan berjalan",
      "Form input muncul dalam 200ms setelah tombol diklik",
      "Validasi form: jumlah > 0, kategori wajib",
      "Transaksi baru muncul di daftar tanpa reload",
    ],
    dependencies: ["T02"],
    status: "doing",
    estimate: "5 jam",
  },
  {
    id: "T04",
    priority: "P0",
    phase: "Fitur Inti",
    title: "Daftar transaksi + filter bulan",
    description: "Halaman /transaksi dengan daftar semua transaksi, navigasi bulan, dan filter per kategori.",
    acceptanceCriteria: [
      "Navigasi bulan (← →) berfungsi tanpa reload",
      "Filter kategori bisa multi-pilih",
      "Edit dan hapus transaksi tersedia",
      "Scroll infinite atau paginasi untuk > 50 item",
    ],
    dependencies: ["T03"],
    status: "todo",
    estimate: "4 jam",
  },
  {
    id: "T05",
    priority: "P0",
    phase: "Fitur Inti",
    title: "Laporan kategori pengeluaran",
    description: "Halaman /laporan dengan breakdown kategori, bar chart, dan grafik tren 6 bulan.",
    acceptanceCriteria: [
      "Kategori diurutkan terbesar ke terkecil",
      "Setiap kategori: bar progres + persentase + nominal",
      "Grafik tren 6 bulan menggunakan Recharts",
      "Responsif di 375px",
    ],
    dependencies: ["T04"],
    status: "todo",
    estimate: "6 jam",
  },
  {
    id: "T06",
    priority: "P1",
    phase: "Fitur Lanjutan",
    title: "Anggaran per kategori",
    description: "Halaman /anggaran untuk menetapkan batas pengeluaran per kategori, dengan indikator visual dan notifikasi.",
    acceptanceCriteria: [
      "Form input anggaran per kategori",
      "Indikator: hijau (< 70%), kuning (70-99%), merah (≥ 100%)",
      "Notifikasi browser saat 80% tercapai",
      "Anggaran tersimpan dan berlaku bulan berikutnya",
    ],
    dependencies: ["T05"],
    status: "todo",
    estimate: "4 jam",
  },
  {
    id: "T07",
    priority: "P1",
    phase: "Fitur Lanjutan",
    title: "Ekspor CSV dan PDF",
    description: "Fitur ekspor data transaksi ke CSV (Papaparse) dan PDF (jsPDF) dengan filter rentang tanggal.",
    acceptanceCriteria: [
      "CSV berisi: tanggal, tipe, kategori, jumlah, catatan",
      "PDF berisi ringkasan bulan + tabel transaksi",
      "Filter ekspor: pilih rentang tanggal",
      "Ekspor berjalan client-side tanpa server",
    ],
    dependencies: ["T04"],
    status: "todo",
    estimate: "5 jam",
  },
  {
    id: "T08",
    priority: "P1",
    phase: "Kualitas",
    title: "PWA: manifest + service worker",
    description: "Konfigurasi next-pwa untuk installable PWA dengan offline support untuk fitur P0.",
    acceptanceCriteria: [
      "Aplikasi dapat diinstall di Android Chrome",
      "Dashboard berfungsi offline (data dari cache)",
      "Lighthouse PWA score ≥ 90",
    ],
    dependencies: ["T05"],
    status: "todo",
    estimate: "3 jam",
  },
  {
    id: "T09",
    priority: "P2",
    phase: "Autentikasi",
    title: "Login opsional via NextAuth.js",
    description: "Implementasi login email/Google opsional. Data lokal dapat di-merge ke akun.",
    acceptanceCriteria: [
      "Login via email/password dan Google OAuth",
      "Data localStorage di-merge ke database saat pertama login",
      "Logout menghapus session tanpa menghapus data lokal",
    ],
    dependencies: ["T08"],
    status: "blocked",
    estimate: "8 jam",
  },
  {
    id: "T10",
    priority: "P2",
    phase: "Autentikasi",
    title: "Sinkronisasi multi-perangkat",
    description: "Sinkronisasi real-time data antar perangkat menggunakan Prisma + PostgreSQL.",
    acceptanceCriteria: [
      "Data tersinkron dalam < 2 detik",
      "Conflict resolution: last-write-wins per transaksi",
      "Indikator sync status di navbar",
    ],
    dependencies: ["T09"],
    status: "blocked",
    estimate: "10 jam",
  },
];

// ─── TAB 4: DESAIN ────────────────────────────────────────────────────────────

export const DEMO_DESIGN_TOKENS = {
  colors: [
    { token: "--bg", value: "#05060A", label: "Background halaman" },
    { token: "--surface", value: "#0E1017", label: "Kartu, panel" },
    { token: "--surface-2", value: "#14141D", label: "Hover, permukaan ketiga" },
    { token: "--border", value: "rgba(255,255,255,0.08)", label: "Border kartu" },
    { token: "--text", value: "#F4F4F5", label: "Teks utama" },
    { token: "--muted", value: "#A1A1AA", label: "Teks sekunder" },
    { token: "--green", value: "#10B981", label: "Pemasukan / positif" },
    { token: "--red", value: "#F87171", label: "Pengeluaran / negatif" },
    { token: "--blue", value: "#1E6BFF", label: "Aksi utama" },
    { token: "--violet", value: "#7C3AED", label: "Aksen sekunder" },
  ],
  typography: [
    { role: "Headline halaman", size: "28–32px", weight: "Semibold", sample: "Ringkasan Oktober 2026" },
    { role: "Label kartu", size: "16px", weight: "Medium", sample: "Total Pengeluaran" },
    { role: "Angka besar (saldo)", size: "36–48px", weight: "Bold", sample: "Rp 3.450.000" },
    { role: "Deskripsi / body", size: "15–16px", weight: "Regular", sample: "Pemasukan bulan ini naik 12% dari bulan lalu." },
    { role: "Label kecil / badge", size: "12–13px", weight: "Medium", sample: "Makan · 34%" },
    { role: "Kode (mono)", size: "13px", weight: "Regular", sample: "categoryId: 'food'" },
  ],
  components: [
    { name: "Tombol Utama", spec: "bg-blue, radius 10px, h-10, px-5, font-semibold" },
    { name: "Tombol Outline", spec: "border-white/14, radius 10px, h-10, px-5" },
    { name: "Kartu Ringkasan", spec: "bg-surface, radius 12px, border-white/8, p-5" },
    { name: "Chip Kategori", spec: "bg-surface-2, radius 999px, px-3 py-1, text-sm" },
    { name: "Input Form", spec: "bg-surface, border-white/8, radius 10px, h-10, px-3" },
    { name: "Badge Status", spec: "radius 999px, px-2 py-0.5, text-xs, font-medium" },
  ],
};

export const DEMO_PAGE_PREVIEWS = [
  {
    id: "dashboard",
    name: "Dashboard",
    taskRef: "T03",
    description: "Ringkasan saldo + form input cepat",
    elements: [
      "Kartu saldo bersih (angka besar, hijau/merah)",
      "Kartu pemasukan vs pengeluaran bulan ini",
      "Tombol + Transaksi (sticky di mobile)",
      "Daftar 5 transaksi terakhir",
    ],
  },
  {
    id: "laporan",
    name: "Laporan",
    taskRef: "T05",
    description: "Breakdown kategori + grafik tren",
    elements: [
      "Grafik garis tren 6 bulan (Recharts)",
      "Daftar kategori dengan bar progres",
      "Filter navigasi bulan",
      "Total pengeluaran vs anggaran",
    ],
  },
  {
    id: "anggaran",
    name: "Anggaran",
    taskRef: "T06",
    description: "Batas pengeluaran per kategori",
    elements: [
      "Kartu per kategori dengan progress ring",
      "Indikator hijau/kuning/merah",
      "Form edit batas anggaran (inline)",
      "Total anggaran vs realisasi",
    ],
  },
  {
    id: "transaksi",
    name: "Transaksi",
    taskRef: "T04",
    description: "Daftar lengkap + filter",
    elements: [
      "Filter multi-kategori (chip clickable)",
      "Navigasi bulan",
      "Daftar transaksi dengan icon kategori",
      "Swipe untuk hapus (mobile)",
    ],
  },
];

// ─── TAB 5: KODE ─────────────────────────────────────────────────────────────

export interface FileNode {
  name: string;
  type: "file" | "dir";
  children?: FileNode[];
  content?: string;
  language?: string;
}

export const DEMO_FILE_TREE: FileNode[] = [
  {
    name: "src",
    type: "dir",
    children: [
      {
        name: "app",
        type: "dir",
        children: [
          { name: "layout.tsx", type: "file", language: "tsx" },
          { name: "page.tsx", type: "file", language: "tsx" },
          {
            name: "transaksi",
            type: "dir",
            children: [{ name: "page.tsx", type: "file", language: "tsx" }],
          },
          {
            name: "laporan",
            type: "dir",
            children: [{ name: "page.tsx", type: "file", language: "tsx" }],
          },
          {
            name: "anggaran",
            type: "dir",
            children: [{ name: "page.tsx", type: "file", language: "tsx" }],
          },
        ],
      },
      {
        name: "components",
        type: "dir",
        children: [
          {
            name: "ui",
            type: "dir",
            children: [
              { name: "button.tsx", type: "file", language: "tsx" },
              { name: "card.tsx", type: "file", language: "tsx" },
              { name: "badge.tsx", type: "file", language: "tsx" },
              { name: "input.tsx", type: "file", language: "tsx" },
            ],
          },
          {
            name: "transaction",
            type: "dir",
            children: [
              { name: "transaction-form.tsx", type: "file", language: "tsx" },
              { name: "transaction-list.tsx", type: "file", language: "tsx" },
              { name: "transaction-item.tsx", type: "file", language: "tsx" },
            ],
          },
          {
            name: "dashboard",
            type: "dir",
            children: [
              { name: "summary-card.tsx", type: "file", language: "tsx" },
              { name: "category-breakdown.tsx", type: "file", language: "tsx" },
            ],
          },
          {
            name: "charts",
            type: "dir",
            children: [{ name: "trend-chart.tsx", type: "file", language: "tsx" }],
          },
        ],
      },
      {
        name: "lib",
        type: "dir",
        children: [
          { name: "store.ts", type: "file", language: "ts" },
          { name: "types.ts", type: "file", language: "ts" },
          { name: "utils.ts", type: "file", language: "ts" },
          { name: "categories.ts", type: "file", language: "ts" },
        ],
      },
    ],
  },
];

export const DEMO_CODE_FILES: Record<string, { language: string; code: string }> = {
  "src/lib/types.ts": {
    language: "typescript",
    code: `// DuitKu — Type definitions
// Semua type utama aplikasi didefinisikan di sini.

export type TransactionType = "income" | "expense";

export type CategoryId =
  | "food" | "transport" | "shopping" | "entertainment"
  | "health" | "salary" | "freelance" | "transfer" | "other";

export interface Category {
  id: CategoryId;
  label: string;
  type: TransactionType | "both";
  emoji: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  categoryId: CategoryId;
  amount: number;       // dalam Rupiah, integer
  note: string;
  date: string;         // ISO 8601: "2026-10-15"
  createdAt: string;
}

export interface Budget {
  categoryId: CategoryId;
  limitAmount: number;  // batas bulanan dalam Rupiah
  month: string;        // format: "2026-10"
}

export interface MonthlyStats {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<CategoryId, number>;
}`,
  },
  "src/lib/store.ts": {
    language: "typescript",
    code: `// DuitKu — Zustand store dengan persistensi localStorage
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction, Budget, CategoryId } from "./types";

interface DuitKuStore {
  transactions: Transaction[];
  budgets: Budget[];

  // Actions
  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  editTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (budget: Budget) => void;

  // Derived
  getMonthTransactions: (month: string) => Transaction[];
  getCategoryTotal: (categoryId: CategoryId, month: string) => number;
}

export const useDuitKuStore = create<DuitKuStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      budgets: [],

      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            {
              ...t,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      editTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      setBudget: (budget) =>
        set((s) => ({
          budgets: [
            ...s.budgets.filter(
              (b) =>
                !(b.categoryId === budget.categoryId && b.month === budget.month)
            ),
            budget,
          ],
        })),

      getMonthTransactions: (month) =>
        get().transactions.filter((t) => t.date.startsWith(month)),

      getCategoryTotal: (categoryId, month) =>
        get()
          .getMonthTransactions(month)
          .filter((t) => t.categoryId === categoryId && t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0),
    }),
    { name: "duitku-store" }
  )
);`,
  },
  "src/app/page.tsx": {
    language: "tsx",
    code: `// DuitKu — Dashboard utama
import { Suspense } from "react";
import { SummaryCards } from "@/components/dashboard/summary-card";
import { TransactionForm } from "@/components/transaction/transaction-form";
import { TransactionList } from "@/components/transaction/transaction-list";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";

export default function DashboardPage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-10"

  return (
    <main className="min-h-screen bg-[#05060A]">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            DuitKu
          </h1>
          <span className="text-sm text-slate-400">
            Oktober 2026
          </span>
        </div>

        {/* Ringkasan bulan ini */}
        <Suspense fallback={<div className="h-32 rounded-xl bg-white/5 animate-pulse" />}>
          <SummaryCards month={currentMonth} />
        </Suspense>

        {/* Tombol tambah transaksi */}
        <TransactionForm />

        {/* Breakdown kategori */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3">
            Pengeluaran bulan ini
          </h2>
          <CategoryBreakdown month={currentMonth} />
        </section>

        {/* Transaksi terbaru */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3">
            Terbaru
          </h2>
          <TransactionList month={currentMonth} limit={5} />
        </section>
      </div>
    </main>
  );
}`,
  },
  "src/components/transaction/transaction-form.tsx": {
    language: "tsx",
    code: `// DuitKu — Form tambah transaksi cepat
"use client";

import { useState } from "react";
import { useDuitKuStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";
import type { TransactionType, CategoryId } from "@/lib/types";

export function TransactionForm() {
  const addTransaction = useDuitKuStore((s) => s.addTransaction);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId | "">("");
  const [note, setNote] = useState("");

  const categories = CATEGORIES.filter(
    (c) => c.type === type || c.type === "both"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !amount) return;

    addTransaction({
      type,
      categoryId,
      amount: parseInt(amount.replace(/\\D/g, ""), 10),
      note,
      date: new Date().toISOString().slice(0, 10),
    });

    setOpen(false);
    setAmount("");
    setCategoryId("");
    setNote("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-[10px] bg-[#1E6BFF] text-white
                   font-semibold text-base hover:bg-blue-500 transition-colors"
      >
        + Tambah Transaksi
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-[#0E1017] border border-white/8 p-5 flex flex-col gap-4"
    >
      {/* Tipe */}
      <div className="flex gap-2">
        {(["expense", "income"] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={\`flex-1 h-9 rounded-[10px] text-sm font-medium transition-colors \${
              type === t
                ? t === "expense"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-slate-400 border border-white/8 hover:bg-white/8"
            }\`}
          >
            {t === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {/* Jumlah */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="Rp 0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-10 rounded-[10px] bg-[#14141D] border border-white/8
                   px-3 text-white placeholder:text-slate-500 text-sm
                   focus:outline-none focus:border-white/20"
        required
      />

      {/* Kategori */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={\`px-3 py-1.5 rounded-full text-sm transition-colors \${
              categoryId === cat.id
                ? "bg-[#1E6BFF] text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/8"
            }\`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Catatan */}
      <input
        type="text"
        placeholder="Catatan (opsional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-10 rounded-[10px] bg-[#14141D] border border-white/8
                   px-3 text-white placeholder:text-slate-500 text-sm
                   focus:outline-none focus:border-white/20"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 h-10 rounded-[10px] bg-[#1E6BFF] text-white
                     font-semibold text-sm hover:bg-blue-500 transition-colors"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 px-4 rounded-[10px] border border-white/10
                     text-slate-400 text-sm hover:text-white hover:border-white/20
                     transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  );
}`,
  },
  "src/lib/categories.ts": {
    language: "typescript",
    code: `// DuitKu — Definisi kategori bawaan
import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  // Pengeluaran
  { id: "food",          label: "Makan",       type: "expense", emoji: "🍜", color: "#F59E0B" },
  { id: "transport",     label: "Transport",   type: "expense", emoji: "🚌", color: "#3B82F6" },
  { id: "shopping",      label: "Belanja",     type: "expense", emoji: "🛍️", color: "#8B5CF6" },
  { id: "entertainment", label: "Hiburan",     type: "expense", emoji: "🎬", color: "#EC4899" },
  { id: "health",        label: "Kesehatan",   type: "expense", emoji: "💊", color: "#10B981" },

  // Pemasukan
  { id: "salary",    label: "Gaji",     type: "income", emoji: "💰", color: "#10B981" },
  { id: "freelance", label: "Freelance", type: "income", emoji: "💻", color: "#1E6BFF" },
  { id: "transfer",  label: "Transfer", type: "income", emoji: "↗️", color: "#6366F1" },

  // Keduanya
  { id: "other", label: "Lainnya", type: "both", emoji: "📦", color: "#71717A" },
];

export const getCategoryById = (id: string) =>
  CATEGORIES.find((c) => c.id === id);`,
  },
};
