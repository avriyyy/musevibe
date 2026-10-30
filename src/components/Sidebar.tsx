"use client";

/**
 * Shared project sidebar. The project list never scrolls: it shows only the
 * rows that fit the available height, and a "See all projects" button below
 * leads to /projects for the full list. The New project button sits above
 * search; it is disabled on the page that already creates projects.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useVibe } from "@/lib/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { initials } from "@/lib/logo";
import { platformLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";

/** Open a project the same way everywhere: drafts resume, ready ones open. */
export function useOpenProject() {
  const router = useRouter();
  return (id: string, onNavigate?: () => void) => {
    const { projects, touchProject } = useVibe.getState();
    const project = projects.find((p) => p.id === id);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onNavigate?.();
    }
    if (project?.status === "draft") {
      router.push(`/form-wizard?id=${id}`);
      return;
    }
    touchProject(id);
    router.push(`/project/${id}`);
  };
}

interface SidebarProps {
  open: boolean;
  pinned: boolean;
  onDismiss: () => void;
  newProjectDisabled: boolean;
  onNewProject: () => void;
  onSeeAll?: () => void;
}

export default function Sidebar({
  open,
  pinned,
  onDismiss,
  newProjectDisabled,
  onNewProject,
  onSeeAll,
}: SidebarProps) {
  const projects = useVibe((state) => state.projects);
  const openProject = useOpenProject();
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const auth = useAuthSession();
  const [authError, setAuthError] = useState("");

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

  const signOut = async () => {
    setAuthError("");
    try {
      const { error } = await supabaseBrowser().auth.signOut();
      if (error) throw error;
      setProfileOpen(false);
    } catch {
      setAuthError("Could not sign out. Please try again.");
    }
  };

  const visible = [...projects]
    .sort((a, b) => (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""))
    .filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.idea.toLowerCase().includes(q);
    });

  // Fit rows to the available height instead of scrolling: measure one row,
  // then render only as many as fit. Rows are uniform (single-line fields).
  const listRef = useRef<HTMLDivElement>(null);
  const [fitCount, setFitCount] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const compute = () => {
      const row = el.querySelector("li");
      const rowHeight = row?.getBoundingClientRect().height ?? 0;
      if (!rowHeight) return;
      setFitCount(
        Math.max(0, Math.floor(el.getBoundingClientRect().height / rowHeight)),
      );
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible.length]);

  const shown = fitCount == null ? visible : visible.slice(0, fitCount);
  const hiddenCount = visible.length - shown.length;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Dismiss sidebar"
          onClick={onDismiss}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
      <aside
        id="sidebar"
        aria-label="Projects"
        onMouseLeave={() => {
          if (!pinned) onDismiss();
        }}
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 overflow-hidden border-r bg-[#0b0c10] transition-[transform,width] duration-200 ease-out md:static md:translate-x-0 ${
          open
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
              onClick={onDismiss}
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
          <button
            type="button"
            onClick={onNewProject}
            disabled={newProjectDisabled}
            aria-label={
              newProjectDisabled
                ? "New project (already on the home screen)"
                : "New project"
            }
            title={
              newProjectDisabled
                ? "You are already on the home screen"
                : "Start a new project from the home screen"
            }
            className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-meta text-[14px] font-semibold text-white hover:bg-meta-hover active:bg-meta-pressed disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden className="text-[18px] leading-none">
              +
            </span>
            New project
          </button>
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
            <>
              <div
                ref={listRef}
                className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#17181d]"
              >
                <ul className="divide-y divide-white/10">
                  {shown.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => openProject(p.id, onDismiss)}
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
                          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#5b6472]">
                            {p.status === "draft" && (
                              <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-medium text-[#c9cdd6]">
                                Draft
                              </span>
                            )}
                            <span className="truncate">
                              {p.platform
                                ? `${platformLabel(p.platform)}${p.framework ? ` · ${frameworkLabel(p.platform, p.framework)}` : ""}`
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
                </ul>
              </div>
              {onSeeAll && (
                <button
                  type="button"
                  onClick={onSeeAll}
                  className="w-full shrink-0 rounded-xl px-3 py-2 text-center text-[13px] font-medium text-[#9aa0ae] hover:bg-white/5 hover:text-white"
                >
                  See all projects
                  {hiddenCount > 0 ? ` (${hiddenCount} more)` : ""}
                </button>
              )}
            </>
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
                  {auth.ready ? (auth.user?.email ?? "Local workspace") : "Checking account…"}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[#9aa0ae]">
                  {auth.user
                    ? "Signed in · projects stay local"
                    : `${projects.length} ${projects.length === 1 ? "project" : "projects"} · saved here`}
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
                    {auth.user?.email ?? "Local workspace"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#9aa0ae]">
                    Projects are saved in this browser. Sign-in is optional; cloud sync is not enabled yet.
                  </p>
                </div>
                {auth.configured ? (
                  <Link
                    href="/account"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] text-[#c9cdd6] hover:bg-white/5 hover:text-white"
                  >
                    {auth.user ? "Account settings" : "Sign in or create account"}
                    <span aria-hidden className="text-[#5b6472]">→</span>
                  </Link>
                ) : (
                  <p className="px-3 py-2 text-[12px] text-[#7f8795]">
                    Account sign-in is not configured in this build.
                  </p>
                )}
                {auth.user && (
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="w-full rounded-xl px-3 py-2 text-left text-[13px] text-[#c9cdd6] hover:bg-white/5 hover:text-white"
                  >
                    Sign out
                  </button>
                )}
                {authError && (
                  <p role="alert" className="px-3 py-2 text-[12px] text-[#ff9c9c]">
                    {authError}
                  </p>
                )}
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
    </>
  );
}
