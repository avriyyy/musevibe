"use client";

/**
 * New-project composer. This is the only place new projects start: the
 * landing at / has no composer, so every "New project" entry point leads
 * here. The route gate in the root layout sends signed-out visitors to
 * sign-in with ?next=/new, and the composer restores any stashed idea.
 */

import Link from "next/link";
import AccountShortcut from "@/components/AccountShortcut";
import CreditBalance from "@/components/CreditBalance";
import IdeaComposer from "@/components/IdeaComposer";

const NEW_PROJECT_CHIPS = [
  "A habit tracker that never guilt-trips",
  "An invoice tracker for solo founders",
  "A portfolio site for a freelance designer",
];

export default function NewProjectPage() {
  return (
    <div className="min-h-dvh bg-[#0b0c10] text-[#f5f6f8]">
      <header className="flex h-14 items-center gap-3 px-4">
        <Link
          href="/projects"
          className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 text-[13px] font-medium text-[#c9cdd6] hover:bg-white/10 hover:text-white"
        >
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Projects
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <CreditBalance />
          <AccountShortcut />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-10 md:pt-16">
        <p className="text-[13px] font-medium text-[#9aa0ae]">New project</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight md:text-[34px]">
          Describe your idea in one sentence.
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-[#9aa0ae]">
          MuseVibe names it, then walks you through setup. Creating a project
          uses your daily credits.
        </p>
        <div className="mt-8">
          <IdeaComposer chips={NEW_PROJECT_CHIPS} />
        </div>
      </main>
    </div>
  );
}
