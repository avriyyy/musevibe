"use client";

/**
 * Documents view: a clean reading room in three columns. The left rail
 * lists every document, the center shows the active one rendered as
 * markdown (code fences through Astryx, mermaid diagrams as SVG), and the
 * right rail holds the table of contents built from the headings in use.
 * Only the center column scrolls; the page itself stays fixed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DocView from "@/components/DocView";
import { extractHeadings } from "@/components/Markdown";
import { docFullName, docLabel } from "@/lib/docs";
import type { ProjectDoc } from "@/lib/types";

interface DocumentsViewProps {
  docs: ProjectDoc[];
  selectedKey: string;
  onSelect: (key: string) => void;
  activeDoc: ProjectDoc | null;
  canGenerate: boolean;
  generating: boolean;
  modelLabel: string;
  bottomPad?: number;
  onQuote?: (label: string, text: string) => void;
  onMarkdown: (markdown: string) => void;
  onGenerate: () => void;
}

export default function DocumentsView({
  docs,
  selectedKey,
  onSelect,
  activeDoc,
  canGenerate,
  generating,
  modelLabel,
  bottomPad = 0,
  onQuote,
  onMarkdown,
  onGenerate,
}: DocumentsViewProps) {
  const centerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ text: string; x: number; y: number } | null>(null);

  const shownMarkdown = activeDoc?.markdown ?? "";
  const headings = useMemo(
    () => extractHeadings(shownMarkdown).filter((h) => h.level >= 2),
    [shownMarkdown],
  );

  // Start each document at the top with no stale highlight or quote button.
  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0 });
    // Resetting the highlight is part of switching documents.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(null);
    setQuote(null);
  }, [selectedKey]);

  const quoteLabel = activeDoc
    ? activeDoc.title || docLabel(activeDoc.kind)
    : "Document";

  const onSelectText = useCallback(() => {
    const container = centerRef.current;
    const selection = typeof window === "undefined" ? null : window.getSelection();
    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setQuote(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setQuote(null);
      return;
    }
    const text = selection.toString().trim().replace(/\s+/g, " ");
    if (text.length < 3) {
      setQuote(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const outer = container.getBoundingClientRect();
    setQuote({
      text: text.length > 500 ? `${text.slice(0, 500)}…` : text,
      x: Math.min(Math.max(8, rect.left - outer.left), Math.max(8, outer.width - 160)),
      y: rect.bottom - outer.top + 8,
    });
  }, []);

  // Scroll spy: the last heading at or above the viewport edge wins.
  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const container = centerRef.current;
        if (!container) return;
        const nodes = Array.from(
          container.querySelectorAll("h2[id], h3[id]"),
        ) as HTMLElement[];
        const top = container.getBoundingClientRect().top + 96;
        let current: string | null = null;
        for (const node of nodes) {
          if (node.getBoundingClientRect().top <= top) current = node.id;
          else break;
        }
        setActiveId(current);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [selectedKey, shownMarkdown]);

  const jumpTo = (id: string) => {
    centerRef.current
      ?.querySelector(`#${CSS.escape(id)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Mobile document switcher. */}
      <div className="shrink-0 border-b border-white/10 px-4 py-2 lg:hidden">
        <div
          role="tablist"
          aria-label="Documents"
          className="flex gap-2 overflow-x-auto"
        >
          {docs.map((entry) => (
            <DocChip
              key={entry.id}
              label={entry.title || docLabel(entry.kind)}
              selected={selectedKey === entry.id}
              onClick={() => onSelect(entry.id)}
            />
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_220px]">
        {/* Document list. */}
        <aside
          aria-label="Document list"
          className="hidden min-h-0 flex-col border-r border-white/10 bg-[#0b0c10] lg:flex"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
              Documents · {docs.length}
            </p>
            <ul className="space-y-0.5">
              {docs.map((entry) => {
                const selected = selectedKey === entry.id;
                const filled = entry.markdown.trim().length > 0;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(entry.id)}
                      aria-current={selected || undefined}
                      title={docFullName(entry.kind)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                        selected
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </svg>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {entry.title || docLabel(entry.kind)}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[#5b6472]">
                          {docFullName(entry.kind)}
                          {!filled ? " · empty" : ""}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        title={filled ? "Generated" : "Not generated yet"}
                        className={`size-1.5 shrink-0 rounded-full ${
                          filled ? "bg-[#7ee2a8]" : "bg-white/20"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Preview. Only this column scrolls; it pads its bottom edge
            so the last lines clear the chat, capped to keep the page
            compact when the panel is tall (collapse the chat to read
            the very bottom). */}
        <div className="relative min-h-0 min-w-0">
          <div
            ref={centerRef}
            onMouseUp={onSelectText}
            onScroll={() => setQuote(null)}
            className="h-full min-h-0 min-w-0 overflow-y-auto"
            style={
              bottomPad > 0
                ? { paddingBottom: Math.min(bottomPad + 16, 240) }
                : undefined
            }
          >
            {activeDoc ? (
              <DocView
                doc={activeDoc}
                canGenerate={canGenerate}
                generating={generating}
                modelLabel={modelLabel}
                onMarkdown={onMarkdown}
                onGenerate={onGenerate}
              />
            ) : (
              <p
                role="status"
                className="mx-auto max-w-md px-5 py-24 text-center text-[13px] text-[#9aa0ae]"
              >
                Preparing the documents…
              </p>
            )}
          </div>
          {quote && onQuote && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onQuote(quoteLabel, quote.text);
                window.getSelection()?.removeAllRanges();
                setQuote(null);
              }}
              aria-label="Add selection to chat"
              title="Add selection to chat"
              className="absolute z-10 flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-[#17181d] px-3 text-[12px] font-medium text-[#f5f6f8] shadow-xl hover:border-white/30"
              style={{ left: quote.x, top: quote.y }}
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
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Chat
            </button>
          )}
        </div>

        {/* Table of contents. */}
        <aside
          aria-label="Table of contents"
          className="hidden min-h-0 flex-col overflow-hidden border-l border-white/10 p-4 lg:flex"
        >
          <p className="px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
            On this page
          </p>
          {headings.length === 0 ? (
            <p className="px-2 pt-2 text-[12px] leading-relaxed text-[#5b6472]">
              No headings yet.
            </p>
          ) : (
            <nav className="mt-1 flex flex-col gap-0.5">
              {headings.map((heading) => {
                const active = heading.id === activeId;
                return (
                  <button
                    key={heading.id}
                    type="button"
                    onClick={() => jumpTo(heading.id)}
                    aria-current={active || undefined}
                    className={`rounded-lg px-2 py-1.5 text-left text-[12px] leading-snug transition-colors ${
                      heading.level >= 3 ? "pl-5" : ""
                    } ${
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-[#9aa0ae] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {heading.text}
                  </button>
                );
              })}
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}

function DocChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
        selected ? "bg-white text-black" : "bg-white/5 text-[#9aa0ae]"
      }`}
    >
      {label}
    </button>
  );
}
