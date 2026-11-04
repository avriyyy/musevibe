"use client";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import AccountShortcut from "@/components/AccountShortcut";
import IdeaComposer from "@/components/IdeaComposer";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { DOC_TYPES } from "@/lib/docs";
import { useLandingMotion } from "./motion";
import { KanbanFragment, KanbanSlot, PagesFragment, PrdFragment, WizardStepsFragment } from "./fragments";
import "./landing.css";

const SHOWCASE_CHIPS = [
  "A habit tracker that never guilt-trips",
  "An invoice tracker for solo founders",
  "A portfolio site for a freelance designer",
];

const STAGES = [
  {
    title: "Describe it",
    duration: "About a minute",
    clause: "First, write one sentence about the app.",
    grow: 1,
    ground: "#0064e0",
    ink: "#ffffff",
  },
  {
    title: "Answer four steps",
    duration: "About five minutes",
    clause: "Then pick a stack and answer the setup.",
    grow: 3,
    ground: "#1c2b33",
    ink: "#ffffff",
  },
  {
    title: "Build together",
    duration: "From then on",
    clause: "Finally, edit docs, tasks, design, and code in one place.",
    grow: 8,
    ground: "#ffffff",
    ink: "#1c2b33",
  },
];

const FAQS = [
  {
    q: "Do I need an account to try it?",
    a: "No. Type an idea and walk the whole demo as a guest; work stays in this browser. A free account syncs it and unlocks AI documents.",
  },
  {
    q: "Do I need my own AI key?",
    a: "No. Every step ships a local draft, so naming, questions, documents, and page previews work with no key configured. Add a key for live generation.",
  },
  {
    q: "Where does my work live?",
    a: "Guest work stays in this browser. Signed-in workspaces sync to your own Neon database, and every read and write is owner-scoped.",
  },
  {
    q: "What can it build?",
    a: "Small web apps. The workspace produces planning documents, a task board, page prototypes, and starter code that share one context.",
  },
  {
    q: "What does it cost?",
    a: "The demo is free. You bring your own model key only if you want live AI generation.",
  },
];

function stagger(index: number): CSSProperties {
  return { "--mv-d": index } as CSSProperties;
}

function StartButton({ className }: { className?: string }) {
  return (
    <a
      href="#start"
      className={`inline-flex h-[52px] items-center rounded-full bg-meta px-8 text-[16px] font-semibold text-white hover:bg-meta-hover ${className ?? ""}`}
    >
      Start building
    </a>
  );
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const auth = useAuthSession();
  const [ctaIdea, setCtaIdea] = useState("");
  const [seed, setSeed] = useState({ text: "", nonce: 0 });
  useLandingMotion(rootRef);

  const sendToComposer = () => {
    const text = ctaIdea.trim();
    if (!text) return;
    setSeed({ text, nonce: Date.now() });
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => document.getElementById("idea")?.focus({ preventScroll: true }), 450);
  };

  return (
    <div ref={rootRef} className="mv-landing">
      <header className="flex items-center gap-6 px-[var(--mv-margin)] py-6">
        <a href="#top" className="text-[15px] font-semibold tracking-tight">
          MuseVibe
        </a>
        <nav aria-label="Sections" className="ml-auto hidden items-center gap-7 text-[14px] text-[#c9cdd6] md:flex">
          <a className="hover:text-white" href="#process">Process</a>
          <a className="hover:text-white" href="#workspace">Workspace</a>
          <a className="hover:text-white" href="#faq">FAQ</a>
        </nav>
        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {auth.user ? (
            <AccountShortcut />
          ) : (
            <Link href="/sign-in" className="text-[14px] text-[#c9cdd6] hover:text-white">
              Sign in
            </Link>
          )}
          <a
            href="#start"
            className="inline-flex h-10 items-center rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover"
          >
            Start building
          </a>
        </div>
      </header>

      <main id="top">
        <section aria-labelledby="hero-title" className="flex min-h-[92svh] flex-col px-[var(--mv-margin)] pb-14 pt-10">
          <h1 id="hero-title" className="mv-hero-h1 mv-reveal my-auto" style={stagger(0)}>
            <span className="block md:inline">Type an idea, get a</span>{" "}
            <span className="mv-slot mv-shutter" role="img" aria-label="Task board preview">
              <span className="mv-slot-inner">
                <KanbanSlot />
              </span>
            </span>{" "}
            <span className="block md:inline">workspace</span>
          </h1>
          <div className="flex flex-col gap-8 pt-12 md:flex-row md:items-end md:justify-between">
            <p className="mv-reveal max-w-xl text-[18px] leading-relaxed text-[#c9cdd6]" style={stagger(1)}>
              MuseVibe turns one sentence into a PRD, task board, designs, and
              starter code that all read the same context.
            </p>
            <div className="mv-reveal shrink-0" style={stagger(2)}>
              <StartButton />
            </div>
          </div>
        </section>

        <div className="mv-ribbon" aria-label="Documents: PRD, TRD, AFD, DBD, BSD, and IPD">
          <div className="mv-ribbon-track py-3.5 text-[19px] font-semibold tracking-tight">
            {[0, 1].map((half) => (
              <div key={half} aria-hidden className="flex shrink-0 items-center">
                {[0, 1].map((repeat) => (
                  <span key={repeat} className="flex shrink-0 items-center">
                    {DOC_TYPES.map((entry) => (
                      <span key={`${half}-${repeat}-${entry.kind}`} className="flex shrink-0 items-center">
                        <span className="px-8">{entry.label}</span>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section id="workspace" aria-labelledby="workspace-title" className="px-[var(--mv-margin)] py-32 md:py-44">
          <h2 id="workspace-title" className="mv-reveal text-[clamp(48px,7vw,110px)] font-bold leading-[0.95] tracking-[-0.03em]" style={stagger(0)}>
            What are we building?
          </h2>
          <div id="start" className="mv-reveal mt-12 max-w-[680px] scroll-mt-8" style={stagger(1)}>
            <div data-ui>
              <IdeaComposer chips={SHOWCASE_CHIPS} seed={seed} />
            </div>
          </div>
          <div className="mv-reveal mt-16 max-w-[560px] space-y-4" style={stagger(2)}>
            <KanbanFragment />
            <PrdFragment />
            <PagesFragment />
            <WizardStepsFragment />
            <p className="pt-2 text-[13px] leading-relaxed text-[#9aa0ae]">
              Example output for “A habit tracker that never guilt-trips”,
              shown at true size.
            </p>
          </div>
        </section>

        <section id="process" aria-labelledby="process-title" className="scroll-mt-8 bg-[var(--mv-field)] px-[var(--mv-margin)] py-32 text-[var(--mv-field-ink)] md:py-44">
          <h2 id="process-title" className="mv-reveal text-[clamp(48px,6.4vw,104px)] font-bold leading-[0.95] tracking-[-0.03em]" style={stagger(0)}>
            Idea to workspace
          </h2>
          <div data-ui className="mv-reveal mt-16 hidden gap-1.5 md:flex" style={stagger(1)}>
            {STAGES.map((stage) => (
              <div
                key={stage.title}
                className="min-h-[22vh] min-w-[12%] p-5"
                style={{ flexGrow: stage.grow, background: stage.ground, color: stage.ink }}
              >
                <p className="text-[clamp(20px,2vw,30px)] font-semibold leading-tight tracking-tight">
                  {stage.duration}
                </p>
              </div>
            ))}
          </div>
          <div className="mv-reveal mt-6 hidden gap-1.5 md:flex" style={stagger(2)}>
            {STAGES.map((stage) => (
              <p
                key={stage.title}
                className="min-w-[12%] text-[17px] leading-snug"
                style={{ flexGrow: stage.grow, maxWidth: "22ch" }}
              >
                {stage.clause}
              </p>
            ))}
          </div>
          <div className="mv-reveal mt-12 space-y-1.5 md:hidden" style={stagger(1)}>
            {STAGES.map((stage) => (
              <div
                key={stage.title}
                className="min-h-[72px] p-5"
                style={{ background: stage.ground, color: stage.ink }}
              >
                <p className="text-[22px] font-semibold tracking-tight">{stage.duration}</p>
                <p className="mt-1 text-[16px] leading-snug">{stage.clause}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="proof-title" className="bg-[var(--mv-field)] px-[var(--mv-margin)] pb-32 text-[var(--mv-field-ink)] md:pb-44">
          <h2 id="proof-title" className="mv-reveal text-[clamp(34px,5vw,76px)] font-bold leading-[1.0] tracking-[-0.03em] [text-wrap:balance]" style={stagger(0)}>
            Six docs. Three views. One context.
          </h2>
        </section>

        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-8 bg-[var(--mv-field)] px-[var(--mv-margin)] pb-32 text-[var(--mv-field-ink)] md:pb-44">
          <div className="grid grid-cols-12 items-baseline gap-y-14 md:gap-y-20">
            <h2 id="faq-title" className="mv-reveal col-span-12 text-[24px] font-medium leading-[1.1] text-[var(--mv-field-soft)] md:col-span-6 md:text-[clamp(26px,2.6vw,40px)]" style={stagger(0)}>
              Questions
            </h2>
            {FAQS.map((item) => (
              <div key={item.q} className="col-span-12 grid grid-cols-12 gap-3 md:contents">
                <h3 className="mv-reveal col-span-12 text-[24px] font-medium leading-[1.1] md:col-span-6 md:text-[clamp(26px,2.6vw,40px)]" style={stagger(0)}>
                  {item.q}
                </h3>
                <p className="mv-reveal col-span-12 max-w-[40ch] text-[17px] leading-[1.55] md:col-span-4 md:col-start-8" style={stagger(1)}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-title" className="px-[var(--mv-margin)] py-32 md:py-44">
          <h2 id="cta-title" className="sr-only">Start building</h2>
          <p className="mv-reveal text-[24px] leading-[1.35] font-bold tracking-[-0.02em] md:text-[clamp(40px,6vw,96px)] md:leading-[1.02] md:tracking-[-0.03em]" style={stagger(0)} aria-label="Your idea becomes a workspace">
            <span aria-hidden>
              Your idea,{" "}
              <input
                value={ctaIdea}
                onChange={(event) => setCtaIdea(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendToComposer();
                }}
                placeholder="a habit tracker"
                aria-label="Your idea"
                className="mx-1 inline-block h-[1.25em] w-[5em] rounded-full bg-white/10 px-[0.4em] text-[0.9em] font-medium text-white placeholder:text-[#5b6472] focus:outline-none md:h-[1lh] md:w-[7em] md:px-[0.35em] md:text-[1em]"
              />{" "}
              becomes a workspace.
            </span>
          </p>
          <div className="mv-reveal mt-10 flex flex-col gap-4" style={stagger(1)}>
            <div>
              <button
                type="button"
                onClick={sendToComposer}
                className="inline-flex h-[52px] items-center rounded-full bg-meta px-8 text-[16px] font-semibold text-white hover:bg-meta-hover"
              >
                Start building
              </button>
            </div>
            <p className="text-[16px] text-[#9aa0ae]">
              {ctaIdea.trim()
                ? "Sending your words to the composer at the top of this page."
                : "No setup. The composer is ready at the top of this page."}
            </p>
          </div>
        </section>
      </main>

      <footer className="flex flex-col bg-meta px-[var(--mv-margin)] pb-8 pt-10 text-white">
        <div className="mv-reveal flex flex-col gap-2 text-[15px] md:flex-row md:gap-10" style={stagger(0)}>
          <p className="max-w-md">MuseVibe — from idea to code for indie devs.</p>
          <p>Built for a 10-day hackathon.</p>
          <a href="#top" className="md:ml-auto md:text-right" aria-label="Back to top">
            Back to top
          </a>
        </div>
        <div className="mt-[clamp(200px,30svh,400px)]">
          <a
            href="#start"
            className="mv-reveal block text-[clamp(48px,8.5vw,150px)] font-bold leading-[0.95] tracking-[-0.04em]"
            style={stagger(1)}
          >
            Start building
          </a>
          <div className="mv-reveal mt-8 flex flex-col gap-2 text-[14px] md:flex-row md:items-center" style={stagger(2)}>
            <p className="flex gap-6">
              <a className="underline decoration-white/40 underline-offset-4 hover:decoration-white" href="https://github.com/avriyyy/musevibe">
                Source
              </a>
              <Link className="underline decoration-white/40 underline-offset-4 hover:decoration-white" href="/sign-in">
                Sign in
              </Link>
            </p>
            <p className="md:mx-auto">Built in the open</p>
            <p>MuseVibe, 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
