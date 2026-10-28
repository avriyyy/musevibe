"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { createDraftProject } from "@/lib/draft";
import { platformLabel, timelineLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";
import ScrollArea from "@/components/ScrollArea";

const PHRASES = [
  "A habit tracker that never guilt-trips",
  "A portfolio site for a freelance designer",
  "An invoice tracker for solo founders",
  "A Discord bot for async standups",
];

export default function Home() {
  const router = useRouter();
  const { projects, touchProject } = useVibe();
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
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

  const submit = async () => {
    const text = idea.trim();
    if (!text || submitInFlight.current) return;
    submitInFlight.current = true;
    setNaming(true);

    let id = "";
    try {
      id = await createDraftProject(text);
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
    if (!navOpen || navPinned) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navOpen, navPinned]);

  const visible = [...projects]
    .sort((a, b) => (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""))
    .filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.idea.toLowerCase().includes(q);
    });

  return (
    <div className="h-screen flex bg-[#0b0c10] text-[#f5f6f8] overflow-hidden">
      <div
        aria-hidden
        onMouseEnter={() => setNavOpen(true)}
        className="fixed inset-y-0 left-0 z-30 hidden w-3 md:block"
      />
      {navOpen && !navPinned && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside
        id="sidebar"
        aria-label="Projects"
        onMouseLeave={() => {
          if (!navPinned) setNavOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-hidden border-r border-white/10 bg-[#0b0c10] transition-transform duration-200 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full w-72 flex-col gap-3 px-4 py-4">
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
                <li key={p.id} className="flex items-center gap-2 px-3 py-3">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-[#c9cdd6]"
                    >
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[#f5f6f8] truncate">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[#9aa0ae] truncate">
                      {p.idea}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#5b6472] truncate">
                      {p.status === "draft" ? "Draft · continue setup" : ""}
                      {p.platform && p.timeline
                        ? `${p.status === "draft" ? " · " : ""}${platformLabel(p.platform)}${p.framework ? ` · ${frameworkLabel(p.platform, p.framework)}` : ""} · ${timelineLabel(p.timeline)}`
                        : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => openProject(p.id, p.idea)}
                    aria-label={p.status === "draft" ? `Continue setting up ${p.name}` : `Open ${p.name}`}
                    className="shrink-0 px-3 py-1 rounded-full bg-white/10 text-[12px] font-medium text-[#c9cdd6] hover:bg-meta hover:text-white"
                  >
                    {p.status === "draft" ? "Continue" : "Open"}
                  </button>
                </li>
              ))}
            </ScrollArea>
          )}
          <div ref={profileRef} className="relative mt-auto shrink-0">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              aria-controls="profile-menu"
              className="w-9 h-9 rounded-full border border-white/15 bg-white/5 text-[#c9cdd6] flex items-center justify-center hover:bg-white/10 hover:text-white"
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
              >
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M5.5 19.5c0-3.2 2.9-5.2 6.5-5.2s6.5 2 6.5 5.2" />
              </svg>
            </button>

            {profileOpen && (
              <div
                id="profile-menu"
                className="absolute bottom-full right-0 z-50 mb-2 w-60 rounded-2xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
              >
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-[#f5f6f8]">
                    Local session
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#9aa0ae]">
                    {projects.length}{" "}
                    {projects.length === 1 ? "project" : "projects"}. Resets when
                    you reload.
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
        <header className="px-5 py-3 shrink-0 flex items-center gap-4">
          <button
            type="button"
            onClick={toggleNav}
            aria-label={navOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={navOpen}
            aria-controls="sidebar"
            className="w-9 h-9 rounded-full border border-white/15 bg-white/5 text-[#c9cdd6] flex items-center justify-center hover:bg-white/10 hover:text-white"
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
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </header>

        <main className="flex-1 min-h-0 flex flex-col items-center px-5 pt-10 pb-6">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-center shrink-0">
          MuseVibe, what are we building?
        </h1>

        <div className="w-full max-w-[680px] mt-8 rounded-2xl border border-white/10 bg-[#17181d] shadow-2xl transition-colors focus-within:border-white/25">
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
            <div>
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
            </div>
            <button
              onClick={submit}
              disabled={!idea.trim() || naming}
              aria-label={naming ? "Naming your project" : "Create project from this idea"}
              className="w-9 h-9 rounded-full bg-meta text-white text-[18px] leading-none hover:bg-meta-hover active:bg-meta-pressed disabled:opacity-40"
            >
              {naming ? "…" : "↑"}
            </button>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}
