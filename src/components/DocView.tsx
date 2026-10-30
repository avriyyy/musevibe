"use client";

/**
 * One plan document: an editable markdown surface with a preview, like a
 * small code editor. AI-kind documents get Generate/Regenerate actions in an
 * overflow menu; custom notes are freeform.
 */

import { useEffect, useState } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import Markdown from "@/components/Markdown";
import MoreActionsMenu from "@/components/MoreActionsMenu";
import LoadingSticker from "@/stickers/LoadingSticker";
import { downloadTextFile } from "@/lib/download";
import type { ProjectDoc } from "@/lib/types";

interface DocViewProps {
  doc: ProjectDoc;
  canGenerate: boolean;
  generating: boolean;
  modelLabel: string;
  /** Latest generation failure or local-draft notice for this doc, if any. */
  error?: string;
  onMarkdown: (markdown: string) => void;
  onGenerate: () => void;
}

export default function DocView({
  doc,
  canGenerate,
  generating,
  modelLabel,
  error = "",
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

  const dirty = draft !== savedMarkdown;

  useEffect(() => {
    if (draft === savedMarkdown) return;
    const timer = setTimeout(() => {
      setSavedMarkdown(draft);
      onMarkdown(draft);
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, savedMarkdown]);

  // Switching to Preview must show what was just typed, not the last
  // saved value: flush any pending debounced save first.
  const switchMode = (next: "edit" | "preview") => {
    if (next === "preview" && draft !== savedMarkdown) {
      setSavedMarkdown(draft);
      onMarkdown(draft);
    }
    setMode(next);
  };

  const filled = draft.trim().length > 0;
  // Never silently discard unsaved typing: hold regeneration until the
  // pending save lands so the model output replaces the latest text.
  const generateBlockedByUnsaved = dirty;
  const sourceLabel =
    doc.source === "ai"
      ? "Model draft"
      : doc.source === "edited"
        ? "Edited by you"
        : doc.source === "local"
          ? "Local draft"
          : null;

  // The preview always renders the draft so Edit → Preview shows the
  // latest keystrokes even before the debounced save fires.
  const visible = mode === "preview" ? draft : doc.markdown;
  const downloadDocument = () => {
    if (draft !== savedMarkdown) {
      setSavedMarkdown(draft);
      onMarkdown(draft);
    }
    const fileSlug = (doc.title || doc.kind)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    downloadTextFile(`${fileSlug || "document"}.md`, draft, "text/markdown;charset=utf-8");
  };
  const documentActions = [
    ...(canGenerate
      ? [
          {
            label: generating
              ? `Generating ${doc.title}…`
              : filled
                ? `Regenerate ${doc.title} with ${modelLabel}`
                : `Generate ${doc.title} with ${modelLabel}`,
            onSelect: onGenerate,
            disabled: generating || generateBlockedByUnsaved,
          },
        ]
      : []),
    ...(filled
      ? [{ label: "Download as Markdown (.md)", onSelect: downloadDocument }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-7">
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          label="Document mode"
          value={mode}
          onChange={(next) => {
            if (next === "edit" || next === "preview") switchMode(next);
          }}
          size="sm"
        >
          <SegmentedControlItem label="Edit" value="edit" />
          <SegmentedControlItem label="Preview" value="preview" />
        </SegmentedControl>
        {documentActions.length > 0 && (
          <MoreActionsMenu
            label={`Actions for ${doc.title || doc.kind}`}
            actions={documentActions}
          />
        )}
      </div>
      <div className="mt-2 flex min-h-4 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-[#9aa0ae]">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5"
        >
          {dirty ? (
            <span>Saving changes…</span>
          ) : filled ? (
            <span>Saved</span>
          ) : null}
          {sourceLabel && <span aria-label="Document source">· {sourceLabel}</span>}
        </div>
      </div>

      {generating && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mt-3 flex max-w-[560px] items-center gap-2 rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/[0.06] px-3 py-2"
        >
          <span aria-hidden="true">
            <LoadingSticker size={30} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-[#c9d9ff]">
              Generating {doc.title}…
            </span>
            <span className="block text-[11px] leading-relaxed text-[#9aa0ae]">
              Your current document stays in place until the new draft is ready.
            </span>
          </span>
        </div>
      )}

      {generateBlockedByUnsaved && (
        <p className="mt-2 text-center text-[11px] text-[#9aa0ae]">
          Save your latest edits before regenerating this document.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mx-auto mt-3 max-w-[560px] rounded-xl border border-[#f0a6a6]/30 bg-[#f0a6a6]/10 px-3 py-2 text-center text-[12px] leading-relaxed text-[#f0a6a6]"
        >
          {error}
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#17181d] p-5 sm:p-6">
        {mode === "preview" ? (
          visible.trim() ? (
            <div data-pick-scope="document" data-doc-kind={doc.kind} data-doc-title={doc.title}>
              <Markdown text={visible} />
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-[13px] text-[#9aa0ae]">
                {canGenerate
                  ? "This document is empty. Use ⋯ to generate a draft, or switch to Edit and write it yourself."
                  : "Nothing here yet. Switch to Edit and write it yourself."}
              </p>
            </div>
          )
        ) : (
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Document markdown"
            aria-busy={generating}
            readOnly={generating}
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
