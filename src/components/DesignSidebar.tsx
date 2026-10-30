"use client";

/**
 * Figma-style frame list for the Design tab. Design-system previews on
 * top, then every planned page with its status. Per-page actions live in
 * an overflow menu so the canvas and mobile list stay easy to scan.
 */

import type { CanvasFrame } from "./DesignCanvas";
import MoreActionsMenu from "@/components/MoreActionsMenu";
import type { PlannedPage } from "@/lib/design-system";
import { pageFilePath } from "@/lib/design-system";
import type { CodeFile } from "@/lib/types";
import LoadingSticker from "@/stickers/LoadingSticker";

interface DesignSidebarProps {
  /** Design-system preview frames at the head of the canvas row. */
  dsFrames: CanvasFrame[];
  /** Planned pages in build order. */
  pages: PlannedPage[];
  /** Slugs that already have a generated frame. */
  doneSlugs: ReadonlySet<string>;
  /** Slugs currently generating. */
  busySlugs: ReadonlySet<string>;
  /** Frame id the canvas last jumped to, if any. */
  focusedId: string | null;
  onFocus: (frameId: string) => void;
  onGenerate: (slug: string) => void;
  onDownloadPage: (slug: string) => void;
  onGenerateAll: () => void;
  onSuggest: () => void;
  suggesting: boolean;
  pendingCount: number;
  planDone: boolean;
  planTotal: number;
  /** Per-page generation failure or local-draft notice, keyed by slug. */
  pageErrors?: Record<string, string>;
  /** Where each generated page came from, keyed by slug. */
  pageSources?: Record<string, CodeFile["source"]>;
  /** Showcase generation failure or local-draft notice, if any. */
  showcaseError?: string;
  /** True while the showcase frame is being drawn. */
  showcaseBusy?: boolean;
  /** Explicit retry for the showcase frame; no silent auto-loops. */
  onRetryShowcase?: () => void;
  /** Generate-all progress; null when idle. */
  allProgress?: { done: number; total: number; currentTitle: string } | null;
}

export default function DesignSidebar({
  dsFrames,
  pages,
  doneSlugs,
  busySlugs,
  focusedId,
  onFocus,
  onGenerate,
  onDownloadPage,
  onGenerateAll,
  onSuggest,
  suggesting,
  pendingCount,
  planDone,
  planTotal,
  pageErrors = {},
  pageSources = {},
  showcaseError = "",
  showcaseBusy = false,
  onRetryShowcase,
  allProgress = null,
}: DesignSidebarProps) {
  const generateAllRunning = allProgress !== null;
  return (
    <aside
      aria-label="Design frames"
      className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#0b0c10] md:w-60 md:border-b-0 md:border-r"
    >
      <div className="max-h-[24dvh] min-h-0 flex-1 overflow-y-auto p-3 md:max-h-none">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
          Style preview
        </p>
        <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-0.5 md:overflow-visible md:pb-0">
          {dsFrames.map((frame) => (
            <li key={frame.id} className="min-w-[200px] shrink-0 md:min-w-0">
              <button
                type="button"
                onClick={() => onFocus(frame.id)}
                aria-current={focusedId === frame.id || undefined}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] md:min-h-0 ${
                  focusedId === frame.id
                    ? "bg-white/10 text-white"
                    : "text-[#c9cdd6] hover:bg-white/5 hover:text-white"
                }`}
              >
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
                  className="shrink-0 text-[#8ab4ff]"
                >
                  <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                  <path d="M3.5 9h17" />
                </svg>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                  {frame.title.replace(/^Design system · /, "")}
                </span>
                {frame.busy && (
                  <span className="shrink-0 text-[11px] text-[#8ab4ff]">
                    drawing…
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {(showcaseBusy || showcaseError) && (
          <div
            role={showcaseError ? "alert" : "status"}
            className={`mt-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
              showcaseError
                ? "border border-[#f0a6a6]/30 bg-[#f0a6a6]/10 text-[#f0a6a6]"
                : "text-[#9aa0ae]"
            }`}
          >
            {showcaseBusy && (
              <span aria-hidden="true">
                <LoadingSticker size={28} />
              </span>
            )}
            <p className="min-w-0 flex-1">
              {showcaseBusy ? "Loading the style preview…" : showcaseError}
            </p>
            {showcaseError && !showcaseBusy && onRetryShowcase && (
              <div className="mt-1.5 flex justify-end">
                <MoreActionsMenu
                  label="Style preview actions"
                  actions={[
                    { label: "Regenerate style preview", onSelect: onRetryShowcase },
                  ]}
                />
              </div>
            )}
          </div>
        )}

        <p className="px-2 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
          Pages · {doneSlugs.size} of {planTotal} ready
        </p>
        <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-0.5 md:overflow-visible md:pb-0">
          {pages.map((page) => {
            const done = doneSlugs.has(page.slug);
            const busy = busySlugs.has(page.slug);
            const path = pageFilePath(page.slug);
            const error = pageErrors[page.slug];
            const source = pageSources[page.slug];
            return (
              <li key={page.slug} className="min-w-[220px] shrink-0 md:min-w-0">
                <div
                  className={`group flex items-center gap-1 rounded-xl transition-colors hover:bg-white/5 ${
                    error ? "border border-[#f0a6a6]/30" : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => done && onFocus(path)}
                    aria-current={focusedId === path || undefined}
                    title={done ? page.brief || page.title : "Not generated yet"}
                    className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] md:min-h-0 ${
                      focusedId === path
                        ? "bg-white/10 text-white"
                        : done
                          ? "text-[#c9cdd6] hover:text-white"
                          : "cursor-default text-[#5b6472]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${
                        done
                          ? "bg-[#7ee2a8]"
                          : busy
                            ? "animate-pulse bg-[#8ab4ff]"
                            : "bg-white/20"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {page.title}
                      {source === "local" && done && (
                        <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-px text-[10px] font-normal text-[#9aa0ae]">
                          local preview
                        </span>
                      )}
                    </span>
                  </button>
                  <MoreActionsMenu
                    label={`${page.title} page actions`}
                    disabled={busy}
                    actions={[
                      {
                        label: done ? `Regenerate ${page.title}` : `Generate ${page.title}`,
                        onSelect: () => onGenerate(page.slug),
                        disabled: busy,
                      },
                      ...(done
                        ? [
                            {
                              label: `Download ${page.title} as HTML`,
                              onSelect: () => onDownloadPage(page.slug),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
                {busy && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1.5 px-3 pb-1 pt-0.5 text-[11px] text-[#8ab4ff]"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 animate-spin rounded-full border border-[#8ab4ff]/35 border-t-[#8ab4ff]"
                    />
                    Generating {page.title}…
                  </p>
                )}
                {error && (
                  <p
                    role="alert"
                    className="px-3 pb-1.5 pt-1 text-[11px] leading-relaxed text-[#f0a6a6]"
                  >
                    {error}
                  </p>
                )}
              </li>
            );
          })}
          {pages.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-[#5b6472]">
              {suggesting ? "Preparing page suggestions…" : "No pages suggested yet."}
            </li>
          )}
        </ul>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        {allProgress && (
          <p
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[12px] text-[#9aa0ae]"
          >
            <span aria-hidden="true">
              <LoadingSticker size={24} />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-[#c9cdd6]">
                Generating page {Math.min(allProgress.done + 1, allProgress.total)} of {allProgress.total}
              </span>
              <span className="block truncate text-[11px]">
                {allProgress.currentTitle}
              </span>
            </span>
          </p>
        )}
        {planDone ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-xl bg-[#7ee2a8]/10 px-3 py-2.5 text-[12px] font-medium text-[#7ee2a8]"
          >
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
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            All {planTotal} pages are ready
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 md:flex-col">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onGenerateAll}
                disabled={generateAllRunning}
                aria-label={
                  generateAllRunning
                  ? `Generating ${allProgress.currentTitle}, page ${allProgress.done + 1} of ${allProgress.total}`
                  : `Generate ${pendingCount} remaining pages`
                }
                className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-white px-3 text-[12px] font-medium text-[#0b0c10] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] disabled:opacity-50 md:min-h-0 md:h-9 md:flex-none md:px-4 md:text-[13px]"
              >
                {generateAllRunning
                  ? `Generating ${allProgress.done + 1}/${allProgress.total}…`
                  : `Generate ${pendingCount} remaining`}
              </button>
            )}
            <button
              type="button"
              disabled={suggesting}
              onClick={onSuggest}
              className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-white/15 px-3 text-[12px] font-medium text-[#c9cdd6] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] disabled:opacity-50 md:min-h-0 md:h-9 md:flex-none md:px-4 md:text-[13px]"
            >
              {suggesting
                ? "Suggesting…"
                : pages.length > 0
                  ? "Update page list"
                  : "Suggest pages"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
