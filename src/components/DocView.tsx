"use client";

/**
 * One plan document: an editable markdown surface with a preview, like a
 * small code editor. AI-kind documents get a Generate button while empty;
 * custom notes are freeform.
 */

import { useEffect, useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import Markdown from "@/components/Markdown";
import type { ProjectDoc } from "@/lib/types";

interface DocViewProps {
  doc: ProjectDoc;
  canGenerate: boolean;
  generating: boolean;
  modelLabel: string;
  onMarkdown: (markdown: string) => void;
  onGenerate: () => void;
}

export default function DocView({
  doc,
  canGenerate,
  generating,
  modelLabel,
  onMarkdown,
  onGenerate,
}: DocViewProps) {
  const [mode, setMode] = useState<"edit" | "preview">(
    doc.markdown.trim() ? "preview" : "edit",
  );
  const [draft, setDraft] = useState(doc.markdown);
  const [prevDocId, setPrevDocId] = useState(doc.id);
  const [savedMarkdown, setSavedMarkdown] = useState(doc.markdown);

  // Keep the editor in lockstep without effects: when the open document
  // changes, reset to it; when outside content arrives (AI generation),
  // adopt it only if it matches neither what was saved nor what is being
  // typed. This is React's documented adjust-during-render pattern.
  if (prevDocId !== doc.id) {
    setPrevDocId(doc.id);
    setSavedMarkdown(doc.markdown);
    setDraft(doc.markdown);
    setMode(doc.markdown.trim() ? "preview" : "edit");
  } else if (doc.markdown !== savedMarkdown && doc.markdown !== draft) {
    setSavedMarkdown(doc.markdown);
    setDraft(doc.markdown);
    if (doc.markdown.trim()) setMode("preview");
  }

  useEffect(() => {
    if (draft === savedMarkdown) return;
    const timer = setTimeout(() => {
      setSavedMarkdown(draft);
      onMarkdown(draft);
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, savedMarkdown]);

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-7">
      <div className="flex justify-center">
        <SegmentedControl
          label="Document mode"
          value={mode}
          onChange={(next) => {
            if (next === "edit" || next === "preview") setMode(next);
          }}
          size="sm"
        >
          <SegmentedControlItem label="Edit" value="edit" />
          <SegmentedControlItem label="Preview" value="preview" />
        </SegmentedControl>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#17181d] p-5 sm:p-6">
        {mode === "preview" ? (
          doc.markdown.trim() ? (
            <div data-pick-scope="document">
              <Markdown text={doc.markdown} />
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-[#9aa0ae]">
                {canGenerate
                  ? `Nothing here yet. Generate it with ${modelLabel}, or switch to Edit and write it yourself.`
                  : "Nothing here yet. Switch to Edit and write it yourself."}
              </p>
              {canGenerate && (
                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={generating}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90 disabled:opacity-50"
                >
                  {generating
                    ? "Writing…"
                    : `Generate with ${modelLabel}`}
                </button>
              )}
            </div>
          )
        ) : (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Document markdown"
            placeholder={"# Title\n\nWrite markdown here…"}
            rows={24}
            spellCheck={false}
            className="w-full resize-y bg-transparent font-mono text-[13px] leading-relaxed text-[#e8ebf0] placeholder:text-[#5b6472] focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
