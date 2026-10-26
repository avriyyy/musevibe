"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Code,
  Eye,
  FileText,
  History,
  Info,
  Lightbulb,
  Lock,
  Pencil,
  RotateCcw,
} from "lucide-react";
import {
  CLARIFICATION_QUESTIONS,
  DUITKU_IDEA,
  buatId,
  generateDraft,
  regenerateSection,
  sectionsToMarkdown,
  type PrdSection,
  type PrdVersion,
  type VersionSource,
} from "@/lib/prd";
import { hapusStateLokal, muatState, useSimpanLokal } from "@/lib/storage";
import { cn } from "@/lib/utils";

const LANGKAH = [
  { id: 0, nama: "Ide", ikon: Lightbulb },
  { id: 1, nama: "Pertanyaan", ikon: ClipboardList },
  { id: 2, nama: "Draft", ikon: FileText },
  { id: 3, nama: "Review", ikon: Pencil },
  { id: 4, nama: "Versi", ikon: History },
  { id: 5, nama: "Final", ikon: Lock },
] as const;

const LABEL_SUMBER: Record<VersionSource, string> = {
  generate: "Generate awal",
  "edit-bagian": "Edit bagian",
  "prompt-bagian": "Prompt per bagian",
  "versi-baru": "Versi baru",
  "kembali-versi": "Kembali ke versi",
};

interface StateAwal {
  step: number;
  idea: string;
  answers: Record<string, string>;
  dilewatiSemua: boolean;
  sections: PrdSection[];
  versions: PrdVersion[];
  versionAktifId: string | null;
  terkunci: boolean;
  finalPada: string | null;
  modeTampil: "preview" | "markdown";
}

const STATE_AWAL: StateAwal = {
  step: 0,
  idea: "",
  answers: {},
  dilewatiSemua: false,
  sections: [],
  versions: [],
  versionAktifId: null,
  terkunci: false,
  finalPada: null,
  modeTampil: "preview",
};

function formatTanggal(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function simpanVersi(
  versions: PrdVersion[],
  sections: PrdSection[],
  sumber: VersionSource,
  catatan: string,
): { versions: PrdVersion[]; aktif: PrdVersion } {
  const versi: PrdVersion = {
    id: buatId(),
    nomor: versions.length + 1,
    dibuatPada: new Date().toISOString(),
    sumber,
    catatan,
    sections: sections.map((s) => ({ ...s })),
  };
  return { versions: [...versions, versi], aktif: versi };
}

export default function WorkspaceFlow() {
  const [state, setState] = useState<StateAwal>(() => muatState(STATE_AWAL));
  const [notice, setNotice] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [promptBagian, setPromptBagian] = useState<Record<string, string>>({});

  useSimpanLokal(state);

  const ideValid = state.idea.trim().length > 0;
  const terjawab = useMemo(
    () =>
      CLARIFICATION_QUESTIONS.filter((q) => (state.answers[q.id] ?? "").trim())
        .length,
    [state.answers],
  );

  function ubah(patch: Partial<StateAwal>) {
    setState((s) => ({ ...s, ...patch }));
    setNotice(null);
  }

  function keLangkah(n: number) {
    setState((s) => ({ ...s, step: n }));
    setNotice(null);
    setEditId(null);
  }

  function buatDraft() {
    if (state.terkunci) {
      setNotice("PRD sudah Final dan terkunci. Buat versi baru untuk melanjutkan.");
      return;
    }
    if (!ideValid) {
      setNotice("Tulis ide produk dulu sebelum membuat draft.");
      setState((s) => ({ ...s, step: 0 }));
      return;
    }
    const sections = generateDraft(state.idea, state.answers);
    const { versions, aktif } = simpanVersi(
      state.versions,
      sections,
      "generate",
      `Draft dari ide + ${terjawab} jawaban (${state.dilewatiSemua ? "sisanya dilewati" : terjawab < 5 ? `${5 - terjawab} pertanyaan belum dijawab (ditulis sebagai asumsi)` : "semua pertanyaan dijawab"}).`,
    );
    setState((s) => ({
      ...s,
      sections,
      versions,
      versionAktifId: aktif.id,
      step: 2,
    }));
    setNotice(null);
  }

  function simpanEditBagian(sectionId: string) {
    if (state.terkunci) {
      setNotice("PRD terkunci. Buat versi baru untuk melanjutkan.");
      return;
    }
    const sections = state.sections.map((s) =>
      s.id === sectionId ? { ...s, body: editBody } : s,
    );
    const judul =
      state.sections.find((s) => s.id === sectionId)?.title ?? sectionId;
    const { versions, aktif } = simpanVersi(
      state.versions,
      sections,
      "edit-bagian",
      `Edit manual bagian "${judul}".`,
    );
    setState((s) => ({
      ...s,
      sections,
      versions,
      versionAktifId: aktif.id,
    }));
    setEditId(null);
  }

  function terapkanPromptBagian(sectionId: string) {
    if (state.terkunci) {
      setNotice("PRD terkunci. Buat versi baru untuk melanjutkan.");
      return;
    }
    const instruksi = (promptBagian[sectionId] ?? "").trim();
    if (!instruksi) {
      setNotice("Tulis instruksi dulu untuk prompt per bagian ini.");
      return;
    }
    const target = state.sections.find((s) => s.id === sectionId);
    if (!target) return;
    const sections = state.sections.map((s) =>
      s.id === sectionId
        ? { ...s, body: regenerateSection(s, instruksi, state.answers) }
        : s,
    );
    const { versions, aktif } = simpanVersi(
      state.versions,
      sections,
      "prompt-bagian",
      `Prompt ulang bagian "${target.title}": ${instruksi}`,
    );
    setState((s) => ({
      ...s,
      sections,
      versions,
      versionAktifId: aktif.id,
    }));
    setPromptBagian((p) => ({ ...p, [sectionId]: "" }));
  }

  function kembaliKeVersi(v: PrdVersion) {
    if (state.terkunci) {
      // Setelah Final, kembali ke versi lama hanya lewat versi baru (turunan).
      const salinan = v.sections.map((s) => ({ ...s }));
      const { versions, aktif } = simpanVersi(
        state.versions,
        salinan,
        "kembali-versi",
        `Turunan dari v${v.nomor} (PRD Final dibuka sebagai versi baru).`,
      );
      setState((s) => ({
        ...s,
        sections: salinan,
        versions,
        versionAktifId: aktif.id,
        terkunci: false,
        finalPada: null,
      }));
      setNotice(`v${v.nomor} disalin menjadi v${aktif.nomor}. Kunci Final dicabut untuk versi baru ini.`);
      return;
    }
    setState((s) => ({
      ...s,
      sections: v.sections.map((x) => ({ ...x })),
      versionAktifId: v.id,
    }));
    setNotice(`Isi dikembalikan persis ke v${v.nomor}.`);
  }

  function buatVersiBaru() {
    if (state.sections.length === 0) return;
    const salinan = state.sections.map((s) => ({ ...s }));
    const { versions, aktif } = simpanVersi(
      state.versions,
      salinan,
      "versi-baru",
      "Versi baru dari PRD Final — kunci Final dicabut.",
    );
    setState((s) => ({
      ...s,
      versions,
      versionAktifId: aktif.id,
      terkunci: false,
      finalPada: null,
      step: 3,
    }));
    setNotice(`v${aktif.nomor} dibuat dan bisa diedit. Versi Final sebelumnya tetap tersimpan.`);
  }

  function kunciFinal() {
    if (state.versions.length === 0) {
      setNotice("Belum ada draft. Buat draft dulu sebelum mengunci Final.");
      return;
    }
    setState((s) => ({
      ...s,
      terkunci: true,
      finalPada: new Date().toISOString(),
      step: 5,
    }));
    setNotice(null);
  }

  function mulaiUlang() {
    hapusStateLokal();
    setState(STATE_AWAL);
    setEditId(null);
    setPromptBagian({});
    setNotice("Workspace dikosongkan. Mulai dari ide baru.");
  }

  const versiAktif = state.versions.find((v) => v.id === state.versionAktifId);
  const markdown = useMemo(
    () => sectionsToMarkdown(state.sections),
    [state.sections],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Penanda demo */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>Demo frontend — generasi AI belum tersambung. Draft dirangkai lokal dari ide + jawaban Anda.</p>
      </div>

      {state.terkunci && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          <p className="font-medium">
            PRD FINAL — terkunci{state.finalPada ? ` pada ${formatTanggal(state.finalPada)}` : ""}.
            Edit lanjutan hanya lewat versi baru.
          </p>
          <button
            type="button"
            onClick={buatVersiBaru}
            className="ml-auto rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Buat versi baru
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-4 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-800" role="status">
          {notice}
        </div>
      )}

      {/* Stepper — semua langkah bisa diklik */}
      <nav aria-label="Langkah PRD" className="mb-8">
        <ol className="flex items-start gap-1 overflow-x-auto sm:gap-2">
          {LANGKAH.map((l, i) => {
            const Ikon = l.ikon;
            const aktif = state.step === l.id;
            return (
              <li key={l.id} className="flex min-w-0 flex-1 items-start">
                <button
                  type="button"
                  onClick={() => keLangkah(l.id)}
                  aria-current={aktif ? "step" : undefined}
                  className={cn(
                    "flex w-full flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-center text-xs font-medium sm:text-sm",
                    aktif
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
                      aktif
                        ? "border-white bg-white text-zinc-950"
                        : "border-zinc-300 bg-white text-zinc-700",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ikon className="h-3.5 w-3.5" aria-hidden />
                    {l.nama}
                  </span>
                </button>
                {i < LANGKAH.length - 1 && (
                  <span aria-hidden className="mx-0.5 mt-5 h-px w-3 shrink-0 bg-zinc-300 sm:w-6" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* LANGKAH 1 — Ide */}
      {state.step === 0 && (
        <section aria-label="Langkah 1 Ide" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-zinc-950">1. Tulis ide produk</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Boleh berantakan dan tidak lengkap. Tulis seperti Anda bercerita ke rekan kerja.
          </p>
          <textarea
            value={state.idea}
            onChange={(e) => ubah({ idea: e.target.value })}
            rows={7}
            placeholder="Contoh: aplikasi pencatat keuangan pribadi untuk karyawan muda…"
            className="mt-4 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                ubah({ idea: DUITKU_IDEA });
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Isi contoh DuitKu
            </button>
            <button
              type="button"
              onClick={() => ideValid && keLangkah(1)}
              disabled={!ideValid}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lanjut ke pertanyaan
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {!ideValid && (
            <p className="mt-2 text-xs text-zinc-500">Isi ide dulu untuk melanjutkan (atau pakai contoh DuitKu).</p>
          )}
        </section>
      )}

      {/* LANGKAH 2 — Pertanyaan */}
      {state.step === 1 && (
        <section aria-label="Langkah 2 Pertanyaan" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-950">2. Jawab pertanyaan klarifikasi</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Setiap pertanyaan boleh dijawab atau dilewati. Bagian yang tidak dijawab akan ditulis eksplisit sebagai asumsi.
              </p>
            </div>
            <p className="ml-auto rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700" aria-live="polite">
              Terjawab {terjawab} dari {CLARIFICATION_QUESTIONS.length}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {CLARIFICATION_QUESTIONS.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-zinc-200 p-4">
                <label htmlFor={`tanya-${q.id}`} className="block text-sm font-semibold text-zinc-900">
                  {i + 1}. {q.label}
                </label>
                <textarea
                  id={`tanya-${q.id}`}
                  value={state.answers[q.id] ?? ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      answers: { ...s.answers, [q.id]: e.target.value },
                    }))
                  }
                  rows={2}
                  placeholder={q.hint}
                  className="mt-2 w-full rounded-lg border border-zinc-300 p-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => keLangkah(0)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali ke ide
            </button>
            <button
              type="button"
              onClick={() => ubah({ dilewatiSemua: true })}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Lewati semua
            </button>
            <button
              type="button"
              onClick={buatDraft}
              disabled={!ideValid || state.terkunci}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Buat draft PRD
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 3 — Draft */}
      {state.step === 2 && (
        <section aria-label="Langkah 3 Draft" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-950">3. Draft PRD</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Gabungan ide + jawaban Anda. Tanda &gt; berarti asumsi — bukan hasil validasi.
              </p>
            </div>
            <div className="ml-auto flex rounded-lg border border-zinc-300 p-0.5 text-sm" role="group" aria-label="Mode tampil">
              <button
                type="button"
                onClick={() => ubah({ modeTampil: "preview" })}
                aria-pressed={state.modeTampil === "preview"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium",
                  state.modeTampil === "preview" ? "bg-zinc-950 text-white" : "text-zinc-600",
                )}
              >
                <Eye className="h-4 w-4" aria-hidden />
                Preview
              </button>
              <button
                type="button"
                onClick={() => ubah({ modeTampil: "markdown" })}
                aria-pressed={state.modeTampil === "markdown"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium",
                  state.modeTampil === "markdown" ? "bg-zinc-950 text-white" : "text-zinc-600",
                )}
              >
                <Code className="h-4 w-4" aria-hidden />
                Markdown
              </button>
            </div>
          </div>

          {state.sections.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-center">
              <p className="text-sm text-zinc-600">Belum ada draft. Isi ide lalu buat draft terlebih dahulu.</p>
              <button
                type="button"
                onClick={() => keLangkah(0)}
                className="mt-3 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Kembali ke ide
              </button>
            </div>
          ) : state.modeTampil === "preview" ? (
            <article className="mt-5 space-y-6">
              {state.sections.map((s) => (
                <div key={s.id} className="border-b border-zinc-100 pb-5 last:border-0">
                  <h3 className="text-base font-bold text-zinc-950">{s.title}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-800">{s.body}</p>
                </div>
              ))}
            </article>
          ) : (
            <pre className="mt-5 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              {markdown}
            </pre>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => keLangkah(1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali ke pertanyaan
            </button>
            {state.sections.length > 0 && (
              <button
                type="button"
                onClick={() => keLangkah(3)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Review per bagian
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </section>
      )}

      {/* LANGKAH 4 — Review per bagian */}
      {state.step === 3 && (
        <section aria-label="Langkah 4 Review" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-zinc-950">4. Review per bagian</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Edit langsung atau prompt ulang satu bagian saja. Bagian lain tidak ikut berubah.
            {state.terkunci ? " PRD terkunci — buat versi baru untuk mengedit." : " Setiap penyimpanan membuat versi baru."}
          </p>

          {state.sections.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-center">
              <p className="text-sm text-zinc-600">Belum ada draft untuk direview.</p>
              <button
                type="button"
                onClick={() => keLangkah(0)}
                className="mt-3 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Kembali ke ide
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {state.sections.map((s) => (
                <div key={s.id} className="rounded-lg border border-zinc-200 p-4">
                  <h3 className="text-sm font-bold text-zinc-950">{s.title}</h3>
                  {editId === s.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-zinc-900 p-2.5 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => simpanEditBagian(s.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
                        >
                          <Check className="h-4 w-4" aria-hidden />
                          Simpan (versi baru)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-800">{s.body}</p>
                  )}

                  {editId !== s.id && (
                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={state.terkunci}
                          onClick={() => {
                            setEditId(s.id);
                            setEditBody(s.body);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit bagian ini
                        </button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={promptBagian[s.id] ?? ""}
                          onChange={(e) =>
                            setPromptBagian((p) => ({ ...p, [s.id]: e.target.value }))
                          }
                          placeholder={`Instruksi khusus untuk "${s.title}"…`}
                          aria-label={`Instruksi prompt untuk ${s.title}`}
                          disabled={state.terkunci}
                          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900 disabled:opacity-40"
                        />
                        <button
                          type="button"
                          disabled={state.terkunci}
                          onClick={() => terapkanPromptBagian(s.id)}
                          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Prompt ulang bagian ini
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => keLangkah(2)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali ke draft
            </button>
            <button
              type="button"
              onClick={() => keLangkah(4)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Lihat versi
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 5 — Versi */}
      {state.step === 4 && (
        <section aria-label="Langkah 5 Versi" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-zinc-950">5. Riwayat versi</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Setiap generate/edit menyimpan versi baru. Kembali ke versi lama mengembalikan isi versi itu apa adanya.
          </p>

          {state.versions.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-zinc-300 p-6 text-center">
              <p className="text-sm text-zinc-600">Belum ada versi tersimpan.</p>
              <button
                type="button"
                onClick={() => keLangkah(0)}
                className="mt-3 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Kembali ke ide
              </button>
            </div>
          ) : (
            <ol className="mt-5 space-y-3">
              {[...state.versions].reverse().map((v) => {
                const sedangAktif = v.id === state.versionAktifId;
                return (
                  <li
                    key={v.id}
                    className={cn(
                      "rounded-lg border p-4",
                      sedangAktif ? "border-zinc-900 bg-zinc-50" : "border-zinc-200",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-zinc-950">
                        v{v.nomor} — {LABEL_SUMBER[v.sumber]}
                      </p>
                      {sedangAktif && (
                        <span className="rounded-full bg-zinc-950 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          Aktif
                        </span>
                      )}
                      <span className="ml-auto text-xs text-zinc-500">{formatTanggal(v.dibuatPada)}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{v.catatan}</p>
                    {!sedangAktif && (
                      <button
                        type="button"
                        onClick={() => kembaliKeVersi(v)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                      >
                        <History className="h-3.5 w-3.5" aria-hidden />
                        {state.terkunci ? `Jadikan versi baru dari v${v.nomor}` : `Kembalikan ke v${v.nomor}`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => keLangkah(3)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali ke review
            </button>
            <button
              type="button"
              onClick={() => keLangkah(5)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Lanjut ke Final
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {/* LANGKAH 6 — Final */}
      {state.step === 5 && (
        <section aria-label="Langkah 6 Final" className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-zinc-950">6. Final</h2>
          {state.versions.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-6 text-center">
              <p className="text-sm text-zinc-600">Belum ada PRD untuk dikunci.</p>
              <button
                type="button"
                onClick={() => keLangkah(0)}
                className="mt-3 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Kembali ke ide
              </button>
            </div>
          ) : state.terkunci ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-zinc-100">
              <p className="flex items-center gap-2 font-bold">
                <Lock className="h-4 w-4" aria-hidden />
                PRD dikunci sebagai Final{versiAktif ? ` (v${versiAktif.nomor})` : ""}
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Supaya turunan PRD tidak rusak diam-diam, edit lanjutan hanya bisa lewat versi baru.
              </p>
              <button
                type="button"
                onClick={buatVersiBaru}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
              >
                Buat versi baru untuk melanjutkan
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-zinc-700">
                Mengunci Final berarti isi saat ini{versiAktif ? ` (v${versiAktif.nomor})` : ""} tidak bisa diubah lagi.
                Perubahan berikutnya wajib lewat versi baru.
              </p>
              <button
                type="button"
                onClick={kunciFinal}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                <Lock className="h-4 w-4" aria-hidden />
                Kunci Final
              </button>
            </div>
          )}

          <div className="mt-5">
            <button
              type="button"
              onClick={() => keLangkah(4)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Kembali ke versi
            </button>
          </div>
        </section>
      )}

      {/* Utilitas */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={mulaiUlang}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Mulai ulang (hapus tersimpan)
        </button>
        <p className="ml-auto text-xs text-zinc-500">
          Tersimpan otomatis di browser ini (localStorage) — tanpa server, tanpa akun.
        </p>
      </div>
    </div>
  );
}
