"use client";

/**
 * Full project list. The sidebar on this page keeps its fit-to-height
 * preview, and its New project button leads back to the home composer,
 * which is the only place new projects start.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { useOpenProject } from "@/components/Sidebar";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { platformLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useVibe((state) => state.projects);
  const openProject = useOpenProject();
  const [navOpen, setNavOpen] = useState(false);
  const [navPinned, setNavPinned] = useState(false);

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

  const sorted = [...projects].sort((a, b) =>
    (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""),
  );

  return (
    <div className="h-screen flex bg-[#0b0c10] text-[#f5f6f8] overflow-hidden">
      <Sidebar
        open={navOpen}
        pinned={navPinned}
        onDismiss={() => {
          setNavOpen(false);
          setNavPinned(false);
        }}
        newProjectDisabled={false}
        onNewProject={() => router.push("/")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => {
              if (navPinned) {
                setNavPinned(false);
                setNavOpen(false);
              } else {
                setNavPinned(true);
                setNavOpen(true);
              }
            }}
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
          <h1 className="text-[15px] font-semibold tracking-tight">
            Projects
          </h1>
          <span className="text-[13px] text-[#5b6472]">
            {sorted.length} {sorted.length === 1 ? "project" : "projects"}
          </span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 md:px-8">
          <div className="mx-auto w-full max-w-[880px]">
            {sorted.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-[15px] font-semibold">
                  No projects yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#9aa0ae]">
                  Describe an idea in the home chat to start your first one.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mt-6 h-10 rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover active:bg-meta-pressed"
                >
                  + New project
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {sorted.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openProject(p.id)}
                      aria-label={p.status === "draft" ? `Continue setting up ${p.name}` : `Open ${p.name}`}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#17181d] px-4 py-3 text-left hover:border-white/25"
                    >
                      {p.logoUrl ? (
                        <img
                          src={p.logoUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[14px] font-semibold text-[#c9cdd6]"
                        >
                          {initials(p.name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-[#f5f6f8]">
                            {p.name}
                          </span>
                          {p.status === "draft" && (
                            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#c9cdd6]">
                              Draft
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[#9aa0ae]">
                          {p.idea}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-[11px] text-[#5b6472] sm:block">
                        {p.platform
                          ? `${platformLabel(p.platform)}${p.framework ? ` · ${frameworkLabel(p.platform, p.framework)}` : ""}`
                          : p.status === "draft"
                            ? "Continue setup"
                            : ""}
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
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
