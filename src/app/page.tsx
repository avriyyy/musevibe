import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  History,
  Info,
  Lightbulb,
  Lock,
  Pencil,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";

const LANGKAH_ALUR = [
  {
    ikon: Lightbulb,
    judul: "Tulis ide",
    deskripsi: "Tuangkan ide produk apa adanya — boleh berantakan, boleh tidak lengkap.",
  },
  {
    ikon: ClipboardList,
    judul: "Jawab klarifikasi",
    deskripsi: "Jawab maksimal 5 pertanyaan penting, atau lewati. Yang tak dijawab dicatat sebagai asumsi.",
  },
  {
    ikon: FileText,
    judul: "Terima draft PRD",
    deskripsi: "Baca sebagai dokumen rapi atau intip sumber Markdown-nya.",
  },
  {
    ikon: Pencil,
    judul: "Review per bagian",
    deskripsi: "Edit langsung atau prompt ulang satu bagian tanpa mengulang seluruh PRD.",
  },
  {
    ikon: History,
    judul: "Kelola versi",
    deskripsi: "Setiap perubahan menyimpan versi baru. Kembali ke versi lama kapan saja.",
  },
  {
    ikon: Lock,
    judul: "Kunci Final",
    deskripsi: "PRD terkunci. Perubahan lanjutan hanya lewat versi baru agar turunan aman.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader aktif="beranda" />

      <main className="flex-1">
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              <Info className="h-3.5 w-3.5" aria-hidden />
              Demo frontend — generasi AI belum tersambung
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
              Ubah ide berantakan menjadi PRD yang rapi.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              Tulis ide produk, jawab beberapa pertanyaan klarifikasi, dan dapatkan
              dokumen PRD terstruktur: ringkasan, target user, fitur inti beserta
              kriteria penerimaan, batasan teknis, dan garis besar halaman/API.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Buka Workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <p className="text-xs text-zinc-500">
                Tanpa daftar, tanpa server — tersimpan otomatis di browser Anda.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50" aria-label="Cara kerja">
          <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
            <h2 className="text-xl font-bold text-zinc-950 sm:text-2xl">Cara kerja dalam 6 langkah</h2>
            <ol className="mt-6">
              {LANGKAH_ALUR.map((l, i) => {
                const Ikon = l.ikon;
                return (
                  <li key={l.judul} className="flex gap-4 border-l-2 border-zinc-300 pb-7 pl-5 last:pb-0">
                    <span className="-ml-[31px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white">
                      <Ikon className="h-3.5 w-3.5 text-zinc-800" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-zinc-950">
                        <span className="mr-2 text-zinc-400">{i + 1}.</span>
                        {l.judul}
                      </p>
                      <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-zinc-600">{l.deskripsi}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Link
              href="/workspace"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Buka Workspace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
