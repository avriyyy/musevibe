"use client";

/**
 * Figma-style frame list for the Design tab. Design-system previews on
 * top, then every planned page with its status: generated frames jump
 * the canvas to that frame, pending ones carry their own Generate
 * button. Generate-all and Refresh live here, so the canvas stays a
 * pure row of content frames.
 */

import type { CanvasFrame } from "./DesignCanvas";
import type { PlannedPage } from "@/lib/design-system";
import { pageFilePath } from "@/lib/design-system";

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
  onGenerateAll: () => void;
  onSuggest: () => void;
  suggesting: boolean;
  pendingCount: number;
  planDone: boolean;
  planTotal: number;
}

export default function DesignSidebar({
  dsFrames,
  pages,
  doneSlugs,
  busySlugs,
  focusedId,
  onFocus,
  onGenerate,
  onGenerateAll,
  onSuggest,
  suggesting,
  pendingCount,
  planDone,
  planTotal,
}: DesignSidebarProps) {
  return (
    <aside
      aria-label="Design frames"
      className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b0c10]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
          Design system
        </p>
        <ul className="space-y-0.5">
          {dsFrames.map((frame) => (
            <li key={frame.id}>
              <button
                type="button"
                onClick={() => onFocus(frame.id)}
                aria-current={focusedId === frame.id || undefined}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
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
              </button>
            </li>
          ))}
        </ul>

        <p className="px-2 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
          Pages · {doneSlugs.size}/{planTotal}
        </p>
        <ul className="space-y-0.5">
          {pages.map((page) => {
            const done = doneSlugs.has(page.slug);
            const busy = busySlugs.has(page.slug);
            const path = pageFilePath(page.slug);
            return (
              <li
                key={page.slug}
                className="group flex items-center gap-1 rounded-xl transition-colors hover:bg-white/5"
              >
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => done && onFocus(path)}
                  aria-current={focusedId === path || undefined}
                  title={done ? page.brief || page.title : "Not generated yet"}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
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
                  </span>
                  {!done && (
                    <span className="shrink-0 font-mono text-[10px] text-[#5b6472]">
                      {busy ? "drawing" : "todo"}
                    </span>
                  )}
                </button>
                {!done && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onGenerate(page.slug)}
                    aria-label={`Generate the ${page.title} page`}
                    title={`Generate the ${page.title} page`}
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#c9cdd6] transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    <svg
                      aria-hidden
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
          {pages.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-[#5b6472]">
              {suggesting ? "Suggesting pages…" : "No pages yet."}
            </li>
          )}
        </ul>
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
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
            Done — every page has a frame
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onGenerateAll}
                className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90"
              >
                {`Generate all ${pendingCount}`}
              </button>
            )}
            <button
              type="button"
              disabled={suggesting}
              onClick={onSuggest}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/15 px-4 text-[13px] font-medium text-[#c9cdd6] hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {suggesting
                ? "Suggesting…"
                : pages.length > 0
                  ? "Refresh suggestions"
                  : "Suggest pages"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
