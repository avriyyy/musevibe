"use client";

/**
 * Documents view: a clean reading room in three columns. The left rail
 * lists every document, the center shows the active one rendered as
 * markdown (code fences through Astryx, mermaid diagrams as SVG), and the
 * right rail holds the table of contents built from the headings in use.
 * Only the center column scrolls; the page itself stays fixed.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown, { extractHeadings } from "@/components/Markdown";
import DocView from "@/components/DocView";
import { docFullName, docLabel } from "@/lib/docs";
import type { ProjectDoc } from "@/lib/types";

export const BRIEF_KEY = "brief";

interface DocumentsViewProps {
  brief: string;
  briefLocal: boolean;
  briefWords: number;
  docs: ProjectDoc[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onAddDoc: () => void;
  activeDoc: ProjectDoc | null;
  canGenerate: boolean;
  generating: boolean;
  modelLabel: string;
  onMarkdown: (markdown: string) => void;
  onGenerate: () => void;
}

export default function DocumentsView({
  brief,
  briefLocal,
  briefWords,
  docs,
  selectedKey,
  onSelect,
  onAddDoc,
  activeDoc,
  canGenerate,
  generating,
  modelLabel,
  onMarkdown,
  onGenerate,
}: DocumentsViewProps) {
  const centerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const shownMarkdown =
    selectedKey === BRIEF_KEY ? brief : (activeDoc?.markdown ?? "");
  const headings = useMemo(
    () => extractHeadings(shownMarkdown).filter((h) => h.level >= 2),
    [shownMarkdown],
  );

  // Start each document at the top with no stale highlight.
  useEffect(() => {
    centerRef.current?.scrollTo({ top: 0 });
    // Resetting the highlight is part of switching documents.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(null);
  }, [selectedKey]);

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

  const listButton = (
    key: string,
    primary: string,
    secondary: string,
  ) => {
    const selected = selectedKey === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onSelect(key)}
        aria-current={selected || undefined}
        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
          selected
            ? "border-white/25 bg-white/10"
            : "border-transparent hover:border-white/10 hover:bg-white/5"
        }`}
      >
        <span className="block truncate text-[13px] font-semibold text-[#f5f6f8]">
          {primary}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-[#5b6472]">
          {secondary}
        </span>
      </button>
    );
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
          <DocChip
            label="Brief"
            selected={selectedKey === BRIEF_KEY}
            onClick={() => onSelect(BRIEF_KEY)}
          />
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
          className="hidden min-h-0 flex-col gap-1 overflow-y-auto border-r border-white/10 p-3 lg:flex"
        >
          {listButton(BRIEF_KEY, "Product brief", "brief.md")}
          <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
            Documents · {docs.length}
          </p>
          {docs.map((entry) =>
            listButton(
              entry.id,
              entry.title || docLabel(entry.kind),
              docFullName(entry.kind),
            ),
          )}
          <button
            type="button"
            onClick={onAddDoc}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[13px] text-[#9aa0ae] hover:border-white/25 hover:text-white"
          >
            <span aria-hidden className="text-[15px] leading-none">
              +
            </span>
            New document
          </button>
        </aside>

        {/* Preview. Only this column scrolls. */}
        <div ref={centerRef} className="min-h-0 min-w-0 overflow-y-auto">
          {selectedKey === BRIEF_KEY || !activeDoc ? (
            <div className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-7 sm:px-8">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#5b6472]">
                Documents
              </p>
              <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[#f5f6f8]">
                Product brief
              </h2>
              <p className="mt-1 font-mono text-[11px] text-[#5b6472]">
                brief.md
                {briefWords > 0 ? ` · ${briefWords} words` : ""}
              </p>
              {briefLocal && (
                <p className="mt-2 text-[11px] text-[#9aa0ae]">
                  Drafted locally from your setup answers, without the model.
                </p>
              )}
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#17181d] p-5 sm:p-6">
                {brief.trim() ? (
                  <Markdown text={brief} />
                ) : (
                  <p
                    role="status"
                    className="py-6 text-center text-[13px] text-[#9aa0ae]"
                  >
                    Writing the brief from your idea and answers…
                  </p>
                )}
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-[#5b6472]">
                The brief stays in lockstep with the PRD document: editing one
                updates the other.
              </p>
            </div>
          ) : (
            <DocView
              doc={activeDoc}
              canGenerate={canGenerate}
              generating={generating}
              modelLabel={modelLabel}
              onMarkdown={onMarkdown}
              onGenerate={onGenerate}
            />
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
