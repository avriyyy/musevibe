"use client";

import React, { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  DEMO_PROMPT,
  DEMO_CLARIFICATIONS,
} from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Save } from "lucide-react";

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function TabPrompt({
  onNextTab,
}: {
  onNextTab?: () => void;
}) {
  // Each question tracks which options are selected
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      DEMO_CLARIFICATIONS.map((c) => [c.id, [...c.selected]])
    )
  );
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [techChoice, setTechChoice] = useState<"ai" | "custom">("ai");
  const [savedDraft, setSavedDraft] = useState(false);

  const totalAnswered = DEMO_CLARIFICATIONS.filter(
    (c) => skipped[c.id] || answers[c.id]?.length > 0
  ).length;

  function toggleOption(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const already = current.includes(option);
      return {
        ...prev,
        [questionId]: already
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
  }

  function handleSkip(questionId: string) {
    setSkipped((prev) => ({ ...prev, [questionId]: true }));
    setAnswers((prev) => ({ ...prev, [questionId]: [] }));
  }

  function handleSaveDraft() {
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Ide asli — selalu terlihat */}
      <motion.div
        custom={0}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        className="rounded-xl bg-[#0E1017] border border-white/8 p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E6BFF] mb-2">
          Ide Asli
        </p>
        <p className="text-base text-[#F4F4F5] leading-relaxed">
          {DEMO_PROMPT}
        </p>
      </motion.div>

      {/* Penghitung progres */}
      <motion.div
        custom={1}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        className="flex items-center gap-3"
      >
        <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#1E6BFF]"
            initial={{ width: 0 }}
            animate={{
              width: `${(totalAnswered / DEMO_CLARIFICATIONS.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-sm text-[#A1A1AA] shrink-0 tabular-nums">
          {totalAnswered}/{DEMO_CLARIFICATIONS.length} dijawab
        </span>
      </motion.div>

      {/* 5 Pertanyaan klarifikasi */}
      <div className="flex flex-col gap-6">
        {DEMO_CLARIFICATIONS.map((q, idx) => {
          const isSkipped = skipped[q.id];
          const selected = answers[q.id] ?? [];

          return (
            <motion.div
              key={q.id}
              custom={idx + 2}
              variants={FADE_UP}
              initial="hidden"
              animate="show"
              className={`rounded-xl border p-5 transition-colors ${
                isSkipped
                  ? "bg-[#0E1017] border-white/5 opacity-50"
                  : "bg-[#0E1017] border-white/8"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <p className="text-sm font-medium text-[#F4F4F5] leading-snug">
                  <span className="text-[#A1A1AA] mr-2">{idx + 1}.</span>
                  {q.question}
                </p>
                {!isSkipped && (
                  <button
                    onClick={() => handleSkip(q.id)}
                    className="shrink-0 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors py-0.5"
                  >
                    Lewati
                  </button>
                )}
              </div>

              {isSkipped ? (
                <p className="text-sm text-[#71717A] italic">Dilewati</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const active = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleOption(q.id, opt)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                          transition-all duration-150 border ${
                          active
                            ? "bg-[#1E6BFF]/15 border-[#1E6BFF]/50 text-[#F4F4F5]"
                            : "bg-white/5 border-white/8 text-[#A1A1AA] hover:border-white/16 hover:text-[#F4F4F5]"
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-[#1E6BFF]" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Pilihan teknologi */}
      <motion.div
        custom={8}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        className="rounded-xl bg-[#0E1017] border border-white/8 p-5"
      >
        <p className="text-sm font-medium text-[#F4F4F5] mb-4">
          Teknologi stack
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setTechChoice("ai")}
            className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all border ${
              techChoice === "ai"
                ? "bg-[#1E6BFF]/15 border-[#1E6BFF]/50 text-[#F4F4F5]"
                : "bg-white/5 border-white/8 text-[#A1A1AA] hover:border-white/16"
            }`}
          >
            Biarkan AI pilih
          </button>
          <button
            onClick={() => setTechChoice("custom")}
            className={`flex-1 py-2.5 rounded-[10px] text-sm font-medium transition-all border ${
              techChoice === "custom"
                ? "bg-[#1E6BFF]/15 border-[#1E6BFF]/50 text-[#F4F4F5]"
                : "bg-white/5 border-white/8 text-[#A1A1AA] hover:border-white/16"
            }`}
          >
            Pilih sendiri
          </button>
        </div>
        {techChoice === "ai" && (
          <p className="mt-3 text-sm text-[#A1A1AA]">
            MuseVibe akan memilih: Next.js 16 + TypeScript + Tailwind v4 + Zustand
          </p>
        )}
        {techChoice === "custom" && (
          <p className="mt-3 text-sm text-[#A1A1AA]">
            Pilihan custom tersedia setelah menekan Lanjut ke Spesifikasi.
          </p>
        )}
      </motion.div>

      {/* Aksi */}
      <motion.div
        custom={9}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <Button
          onClick={onNextTab}
          className="flex-1 sm:flex-none h-11 px-8 text-base font-semibold group"
        >
          <span>Lanjut ke Spesifikasi</span>
          <ChevronRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
        </Button>
        <button
          onClick={handleSaveDraft}
          className="inline-flex items-center justify-center gap-2 h-11 px-5
            rounded-[10px] border border-white/10 text-[#A1A1AA] text-sm
            hover:border-white/20 hover:text-[#F4F4F5] transition-colors"
        >
          {savedDraft ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Draf tersimpan</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan draf</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
