// Generator PRD demo — murni fungsi lokal, TANPA panggilan AI / backend.
// Merangkai draft dari ide + jawaban klarifikasi + satu template tetap.

export interface ClarificationQuestion {
  id: string;
  label: string;
  hint: string;
}

export const CLARIFICATION_QUESTIONS: ClarificationQuestion[] = [
  {
    id: "target-user",
    label: "Siapa target pengguna utama produk ini?",
    hint: "Contoh: karyawan muda yang kesulitan menabung.",
  },
  {
    id: "fitur-inti",
    label: "Sebutkan 3 fitur inti yang wajib ada di versi pertama.",
    hint: "Contoh: catat pemasukan, catat pengeluaran, laporan bulanan.",
  },
  {
    id: "batasan",
    label: "Apa batasan penting atau hal yang TIDAK dikerjakan?",
    hint: "Contoh: tanpa integrasi bank, hanya Android, dikerjakan 1 bulan.",
  },
  {
    id: "teknologi",
    label: "Preferensi teknologi atau platform?",
    hint: "Contoh: aplikasi web, mobile Android, atau keduanya.",
  },
  {
    id: "keberhasilan",
    label: "Bagaimana Anda tahu produk ini berhasil?",
    hint: "Contoh: 100 pengguna mencatat tiap minggu selama sebulan.",
  },
];

export interface PrdSection {
  id: string;
  title: string;
  body: string;
}

export type VersionSource =
  | "generate"
  | "edit-bagian"
  | "prompt-bagian"
  | "versi-baru"
  | "kembali-versi";

export interface PrdVersion {
  id: string;
  nomor: number;
  dibuatPada: string; // ISO string
  sumber: VersionSource;
  catatan: string;
  sections: PrdSection[];
}

export const SECTION_IDS = [
  "ringkasan",
  "target-user",
  "fitur-inti",
  "batasan-teknis",
  "halaman-api",
] as const;

export const SECTION_TITLES: Record<string, string> = {
  ringkasan: "Ringkasan produk",
  "target-user": "Target user",
  "fitur-inti": "Fitur inti + kriteria penerimaan",
  "batasan-teknis": "Batasan teknis",
  "halaman-api": "Daftar halaman/API (garis besar)",
};

export const DUITKU_IDEA = `DuitKu — aplikasi pencatat keuangan pribadi untuk karyawan muda. User bisa catat pemasukan dan pengeluaran harian dengan cepat, lihat sisa uang bulan ini, dan dapat pengingat kalau pengeluaran hampir melewati budget. Harus simpel, tanpa ribet login bank.`;

function jawabanAtauAsumsi(
  answers: Record<string, string>,
  qid: string,
  asumsi: string,
): { teks: string; asumsi: boolean } {
  const v = (answers[qid] ?? "").trim();
  if (v.length > 0) return { teks: v, asumsi: false };
  return { teks: `Asumsi: ${asumsi}`, asumsi: true };
}

function barisAsumsi(teks: string, asumsi: boolean): string {
  return asumsi ? `> ${teks}` : teks;
}

/** Rangkai draft PRD dari ide + jawaban. Bagian tanpa jawaban ditulis eksplisit sebagai asumsi. */
export function generateDraft(
  idea: string,
  answers: Record<string, string>,
): PrdSection[] {
  const ide = idea.trim();
  const target = jawabanAtauAsumsi(
    answers,
    "target-user",
    "pengguna umum usia produktif yang butuh pencatatan sederhana (belum divalidasi).",
  );
  const fitur = jawabanAtauAsumsi(
    answers,
    "fitur-inti",
    "pencatatan transaksi, ringkasan saldo, dan pengingat budget dasar.",
  );
  const batas = jawabanAtauAsumsi(
    answers,
    "batasan",
    "tanpa integrasi bank/e-wallet, single-platform dulu, data tersimpan lokal.",
  );
  const teknologi = jawabanAtauAsumsi(
    answers,
    "teknologi",
    "aplikasi web responsif (bisa dibuka dari HP maupun laptop).",
  );
  const hasil = jawabanAtauAsumsi(
    answers,
    "keberhasilan",
    "pengguna mencatat transaksi minimal 3x seminggu selama sebulan.",
  );

  return [
    {
      id: "ringkasan",
      title: SECTION_TITLES["ringkasan"],
      body: `${ide}\n\nTujuan: ${hasil.teks}`,
    },
    {
      id: "target-user",
      title: SECTION_TITLES["target-user"],
      body: barisAsumsi(target.teks, target.asumsi),
    },
    {
      id: "fitur-inti",
      title: SECTION_TITLES["fitur-inti"],
      body: [
        barisAsumsi(fitur.teks, fitur.asumsi),
        "",
        "Kriteria penerimaan tiap fitur:",
        "- Setiap fitur bisa dipakai end-to-end tanpa panduan tertulis.",
        "- Setiap aksi penting memberi umpan balik sukses/gagal yang jelas.",
        "- Fitur yang belum dijawab di atas ditandai Asumsi dan wajib divalidasi sebelum Final.",
      ].join("\n"),
    },
    {
      id: "batasan-teknis",
      title: SECTION_TITLES["batasan-teknis"],
      body: [
        barisAsumsi(batas.teks, batas.asumsi),
        barisAsumsi(`Platform: ${teknologi.teks}`, teknologi.asumsi),
      ].join("\n"),
    },
    {
      id: "halaman-api",
      title: SECTION_TITLES["halaman-api"],
      body: [
        "Halaman (garis besar): Beranda/ringkasan, Tambah transaksi, Riwayat, Budget & pengingat, Pengaturan.",
        "API (garis besar): daftar transaksi, tambah transaksi, ubah/hapus transaksi, ringkasan periode, atur budget.",
        "> Asumsi: struktur halaman/API di atas adalah kerangka awal dan bisa berubah saat review.",
      ].join("\n"),
    },
  ];
}

/**
 * Prompt ulang SATU bagian saja. Mengembalikan isi body baru untuk section itu;
 * section lain tidak disentuh (ditangani pemanggil).
 */
export function regenerateSection(
  section: PrdSection,
  instruksi: string,
  answers: Record<string, string>,
): string {
  const perintah = instruksi.trim();
  const konteks: string[] = [];
  for (const q of CLARIFICATION_QUESTIONS) {
    const v = (answers[q.id] ?? "").trim();
    if (v) konteks.push(`- ${q.label} ${v}`);
  }
  const catatanKonteks =
    konteks.length > 0
      ? `\n\nTetap konsisten dengan jawaban klarifikasi:\n${konteks.join("\n")}`
      : "";
  return `${section.body}\n\n> Diperbarui per instruksi: ${perintah}${konteks.length > 0 ? " (disesuaikan dengan jawaban klarifikasi di atas)" : ""}${catatanKonteks}`;
}

/** Gabungkan sections menjadi satu sumber Markdown untuk mode tampil sumber. */
export function sectionsToMarkdown(sections: PrdSection[]): string {
  return sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n---\n\n");
}

export function buatId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
