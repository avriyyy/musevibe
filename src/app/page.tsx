"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { createDraftProject } from "@/lib/draft";
import { platformLabel, timelineLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";
import { blobToWav } from "@/lib/audio";
import {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  type AiModelOption,
} from "@/lib/models";
import ScrollArea from "@/components/ScrollArea";

const PHRASES = [
  "A habit tracker that never guilt-trips",
  "A portfolio site for a freelance designer",
  "An invoice tracker for solo founders",
  "A Discord bot for async standups",
];

type MicState = "idle" | "recording" | "transcribing";

export default function Home() {
  const router = useRouter();
  const { projects, touchProject } = useVibe();
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [models, setModels] = useState<AiModelOption[]>(FALLBACK_MODELS);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL);
  const [modelOpen, setModelOpen] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState("");
  // Default open: the initializer runs during prerender without a real
  // viewport, so a width check here would stick forever. The mount effect
  // below corrects it on small screens.
  const [navOpen, setNavOpen] = useState(true);
  const [navPinned, setNavPinned] = useState(true);

  useEffect(() => {
    if (window.innerWidth >= 768) return;
    const frame = requestAnimationFrame(() => {
      setNavOpen(false);
      setNavPinned(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const modelTouchedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/ai/models");
        if (!response.ok) return;
        const data = (await response.json()) as {
          models?: AiModelOption[];
          default?: string;
        };
        if (!alive) return;
        const list =
          Array.isArray(data.models) && data.models.length
            ? data.models
            : FALLBACK_MODELS;
        setModels(list);
        const fallback =
          typeof data.default === "string" &&
          list.some((entry) => entry.id === data.default)
            ? data.default
            : list[0].id;
        setDefaultModel(fallback);
        if (modelTouchedRef.current) return;
        let saved = "";
        try {
          saved = window.localStorage.getItem("musevibe:model") ?? "";
        } catch {
          // Private mode can block storage; the discovered default still wins.
        }
        setModel(list.some((entry) => entry.id === saved) ? saved : fallback);
      } catch {
        // The curated list is already on screen.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!modelOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!modelRef.current?.contains(event.target as Node)) {
        setModelOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modelOpen]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (idea || focused) return;
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = PHRASES[phrase];
      if (!deleting) {
        char += 1;
        setTyped(current.slice(0, char));
        if (char >= current.length) {
          deleting = true;
          timer = setTimeout(tick, 1400);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        char -= 1;
        setTyped(current.slice(0, char));
        if (char <= 0) {
          deleting = false;
          phrase = (phrase + 1) % PHRASES.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 20);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [idea, focused]);

  const submitInFlight = useRef(false);
  const [naming, setNaming] = useState(false);

  const pickModel = (id: string) => {
    modelTouchedRef.current = true;
    setModel(id);
    setModelOpen(false);
    try {
      window.localStorage.setItem("musevibe:model", id);
    } catch {
      // Storage can be blocked; the choice still applies to this session.
    }
  };

  const transcribeClip = async (mimeType: string) => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
    if (blob.size < 1200) {
      setMicError("Too short. Hold the mic and speak.");
      setMicState("idle");
      return;
    }

    setMicError("");
    setMicState("transcribing");
    try {
      const wav = await blobToWav(blob);
      const body = new FormData();
      body.append("audio", wav, "prompt.wav");
      const response = await fetch("/api/ai/transcribe", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as {
        transcript?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Transcription failed.",
        );
      }
      const transcript =
        typeof data.transcript === "string" ? data.transcript.trim() : "";
      if (!transcript) {
        setMicError("Nothing heard. Try again.");
        return;
      }
      setIdea((previous) =>
        previous.trim() ? `${previous.trimEnd()} ${transcript}` : transcript,
      );
    } catch (error) {
      setMicError(
        error instanceof Error && error.message
          ? error.message
          : "Could not transcribe. Try again.",
      );
    } finally {
      setMicState("idle");
    }
  };

  const toggleMic = async () => {
    if (micState === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (micState === "transcribing") return;

    setMicError("");
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMicError("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        void transcribeClip(recorder.mimeType);
      };
      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      setMicState("recording");
    } catch {
      setMicError("Microphone blocked. Allow access in the browser.");
    }
  };

  const submit = async () => {
    const text = idea.trim();
    if (!text || submitInFlight.current) return;
    submitInFlight.current = true;
    setNaming(true);

    let id = "";
    try {
      id = await createDraftProject(text, model);
    } catch {
      setNaming(false);
      submitInFlight.current = false;
      return;
    }

    setIdea("");
    if (fileRef.current) fileRef.current.value = "";
    setNaming(false);
    submitInFlight.current = false;
    router.push(`/form-wizard?id=${id}`);
  };

  const attach = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    setIdea((prev) => (prev ? prev + "\n\n" : "") + `--- ${f.name} ---\n` + text.slice(0, 2000));
  };

  const openProject = (id: string, ideaText: string) => {
    if (window.innerWidth < 768) {
      setNavOpen(false);
      setNavPinned(false);
    }
    const project = projects.find((p) => p.id === id);
    if (project?.status === "draft") {
      router.push(`/form-wizard?id=${id}`);
      return;
    }
    touchProject(id);
    setIdea(ideaText);
  };

  const toggleNav = () => {
    if (navPinned) {
      setNavPinned(false);
      setNavOpen(false);
    } else {
      setNavPinned(true);
      setNavOpen(true);
    }
  };

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        setNavPinned(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const visible = [...projects]
    .sort((a, b) => (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""))
    .filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.idea.toLowerCase().includes(q);
    });

  const activeModel = models.find((entry) => entry.id === model) ?? models[0];

  return (
    <div className="h-screen flex bg-[#0b0c10] text-[#f5f6f8] overflow-hidden">
      {navOpen && (
        <button
          type="button"
          aria-label="Dismiss sidebar"
          onClick={() => {
            setNavOpen(false);
            setNavPinned(false);
          }}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside
        id="sidebar"
        aria-label="Projects"
        onMouseLeave={() => {
          if (!navPinned) setNavOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-hidden border-r bg-[#0b0c10] transition-[transform,width] duration-200 ease-out md:static md:translate-x-0 ${
          navOpen
            ? "translate-x-0 border-white/10 md:w-72"
            : "-translate-x-full border-white/10 md:w-0 md:border-0"
        }`}
      >
        <div className="flex h-full w-72 flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between md:hidden">
            <span className="text-[13px] font-semibold tracking-tight text-[#f5f6f8]">
              Projects
            </span>
            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                setNavPinned(false);
              }}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#c9cdd6] hover:bg-white/10 hover:text-white"
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
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="relative shrink-0">
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b6472]"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Your Projects"
              aria-label="Search projects"
              className="w-full min-h-11 md:min-h-0 pl-10 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-[13px] placeholder:text-[#5b6472] focus:outline-none focus:border-white/25"
            />
          </div>
          {visible.length === 0 ? (
            <p className="mt-1 text-[14px] text-[#5b6472]">
              {projects.length === 0
                ? "No projects yet. Describe an idea in the chat to start one."
                : `No projects match "${query.trim()}".`}
            </p>
          ) : (
            <ScrollArea
              as="ul"
              className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-[#17181d]"
              viewportClassName="divide-y divide-white/10 rounded-xl"
            >
              {visible.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openProject(p.id, p.idea)}
                    aria-label={p.status === "draft" ? `Continue setting up ${p.name}` : `Open ${p.name}`}
                    className="group flex w-full items-center gap-2.5 px-3 py-3 text-left hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                  >
                    {p.logoUrl ? (
                      <img
                        src={p.logoUrl}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-[#c9cdd6]"
                      >
                        {initials(p.name)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#f5f6f8]">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-[#9aa0ae]">
                        {p.idea}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#5b6472]">
                        {p.status === "draft" && (
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-medium text-[#c9cdd6]">
                            Draft
                          </span>
                        )}
                        <span className="truncate">
                          {p.platform && p.timeline
                            ? `${platformLabel(p.platform)}${p.framework ? ` · ${frameworkLabel(p.platform, p.framework)}` : ""} · ${timelineLabel(p.timeline)}`
                            : p.status === "draft"
                              ? "Continue setup"
                              : ""}
                        </span>
                      </span>
                    </span>
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
                      className="shrink-0 text-[#5b6472] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ScrollArea>
          )}
          <div ref={profileRef} className="relative mt-auto shrink-0 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              aria-controls="profile-menu"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#c9cdd6]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="8.5" r="3.5" />
                  <path d="M5.5 19.5c0-3.2 2.9-5.2 6.5-5.2s6.5 2 6.5 5.2" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[#f5f6f8]">
                  Local workspace
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[#9aa0ae]">
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </span>
              </span>
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
                className="shrink-0 text-[#5b6472]"
              >
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>

            {profileOpen && (
              <div
                id="profile-menu"
                className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
              >
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-[#f5f6f8]">
                    Local workspace
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#9aa0ae]">
                    Projects live in this tab only and reset when you reload.
                  </p>
                </div>
                <div aria-hidden className="my-1 h-px bg-white/10" />
                <a
                  href="https://github.com/avriyyy/musevibe"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] text-[#c9cdd6] hover:bg-white/5 hover:text-white"
                >
                  GitHub repository
                  <svg
                    aria-hidden
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          <button
            type="button"
            onClick={toggleNav}
            onMouseEnter={() => setNavOpen(true)}
            aria-label={navOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={navOpen}
            aria-controls="sidebar"
            title={navOpen ? "Close sidebar" : "Open sidebar"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#c9cdd6] hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
              <line x1="9.5" y1="4.5" x2="9.5" y2="19.5" />
            </svg>
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col justify-center px-5 py-10">
            <h1 className="text-center text-[28px] font-semibold leading-tight tracking-tight">
              MuseVibe, what are we building?
            </h1>

            <div className="mt-8 w-full rounded-2xl border border-white/10 bg-[#17181d] shadow-2xl transition-colors focus-within:border-white/25">
              <div className="scroll-inset rounded-t-2xl">
                <textarea
                  id="idea"
                  aria-label="Describe your project idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={3}
                  placeholder={idea || focused ? "" : `${typed}▍`}
                  className="scroll-surface w-full bg-transparent px-5 pt-4 pb-2 text-[15px] placeholder:text-[#5b6472] focus:outline-none focus-visible:outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,.markdown"
                    className="hidden"
                    aria-hidden
                    tabIndex={-1}
                    onChange={(e) => {
                      attach(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach a text or markdown file to this idea"
                    title="Attach a .txt or .md file"
                    className="w-9 h-9 rounded-full bg-white/10 text-[20px] leading-none text-[#c9cdd6] hover:bg-white/15 hover:text-white"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={micState === "transcribing"}
                    aria-label={
                      micState === "recording"
                        ? "Stop recording and transcribe"
                        : micState === "transcribing"
                          ? "Transcribing your recording"
                          : "Dictate your idea with the microphone"
                    }
                    aria-pressed={micState === "recording"}
                    title={
                      micState === "recording"
                        ? "Stop and transcribe"
                        : "Speak your idea"
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      micState === "recording"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-white/5 text-[#c9cdd6] hover:bg-white/10 hover:text-white"
                    } disabled:opacity-60`}
                  >
                    {micState === "recording" ? (
                      <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    ) : micState === "transcribing" ? (
                      <svg
                        aria-hidden
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="animate-spin"
                      >
                        <circle cx="12" cy="12" r="9" opacity="0.25" />
                        <path d="M21 12a9 9 0 0 0-9-9" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="3" width="6" height="11" rx="3" />
                        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                        <line x1="12" y1="17.5" x2="12" y2="21" />
                        <line x1="8.5" y1="21" x2="15.5" y2="21" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  <div ref={modelRef} className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => setModelOpen((open) => !open)}
                      aria-haspopup="menu"
                      aria-expanded={modelOpen}
                      aria-label={`AI model: ${activeModel?.label ?? "Muse"}`}
                      title="Choose the Muse model for naming, questions, and plans"
                      className="flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[12px] text-[#c9cdd6] hover:bg-white/10 hover:text-white"
                    >
                      <svg
                        aria-hidden
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
                      </svg>
                      <span className="max-w-[96px] truncate sm:max-w-[160px]">
                        {activeModel?.label ?? "Muse model"}
                      </span>
                      <svg
                        aria-hidden
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 transition-transform ${modelOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M6 15l6-6 6 6" />
                      </svg>
                    </button>

                    {modelOpen && (
                      <div
                        role="menu"
                        aria-label="AI model"
                        className="absolute bottom-full right-0 z-50 mb-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
                      >
                        <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
                          Model
                        </p>
                        {models.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={entry.id === model}
                            onClick={() => pickModel(entry.id)}
                            className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5 ${
                              entry.id === model ? "bg-white/5" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-[13px] font-medium text-[#f5f6f8]">
                                  {entry.label}
                                </span>
                                {entry.id === defaultModel && (
                                  <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#9aa0ae]">
                                    Default
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-[#9aa0ae]">
                                {entry.hint}
                              </span>
                            </span>
                            {entry.id === model && (
                              <svg
                                aria-hidden
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mt-1 shrink-0 text-[#f5f6f8]"
                              >
                                <path d="M5 12l5 5L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                        <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-[#5b6472]">
                          Chat models only. Image and voice models stay on their own
                          steps.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={submit}
                    disabled={!idea.trim() || naming}
                    aria-label={naming ? "Naming your project" : "Create project from this idea"}
                    className="w-9 h-9 shrink-0 rounded-full bg-meta text-white text-[18px] leading-none hover:bg-meta-hover active:bg-meta-pressed disabled:opacity-40"
                  >
                    {naming ? "…" : "↑"}
                  </button>
                </div>
              </div>

              {micState === "recording" && (
                <p role="status" className="px-5 pb-3 text-[11px] text-[#9aa0ae]">
                  Listening. Tap stop when you finish.
                </p>
              )}
              {micState === "transcribing" && (
                <p role="status" className="px-5 pb-3 text-[11px] text-[#9aa0ae]">
                  Transcribing with Muse Voice.
                </p>
              )}
              {micError && (
                <p role="alert" className="px-5 pb-3 text-[11px] text-[#f0a6a6]">
                  {micError}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
