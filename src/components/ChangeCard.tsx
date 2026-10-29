"use client";

/**
 * The change request that opens on a picked component. It names the
 * element, takes one sentence about what should change, and hands the
 * text back so the caller can quote it into the chat input.
 */

import { useEffect, useRef, useState } from "react";

interface ChangeCardProps {
  label: string;
  text: string;
  left: number;
  top: number;
  width: number;
  /** Fixed keeps the card in viewport space, used outside the canvas. */
  fixed?: boolean;
  onAdd: (comment: string) => void;
  onClose: () => void;
}

export default function ChangeCard({
  label,
  text,
  left,
  top,
  width,
  fixed = false,
  onAdd,
  onClose,
}: ChangeCardProps) {
  const [comment, setComment] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const note = comment.trim();
    if (!note) return;
    onAdd(note);
  };

  return (
    <div
      role="dialog"
      aria-label="Describe the change"
      onPointerDown={(event) => event.stopPropagation()}
      className={`${fixed ? "fixed" : "absolute"} z-50 select-text rounded-2xl border border-white/15 bg-[#17181d] p-2.5 shadow-2xl`}
      style={{ left, top, width }}
    >
      <p className="truncate px-1 font-mono text-[11px] text-[#8ab4ff]">
        {label}
      </p>
      {!!text && (
        <p className="mt-0.5 truncate px-1 text-[11px] text-[#9aa0ae]">
          {text}
        </p>
      )}
      <textarea
        ref={inputRef}
        rows={2}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="What should change here?"
        aria-label="Change request"
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#0b0c10] px-2.5 py-2 text-[13px] leading-5 text-[#f5f6f8] placeholder:text-[#5b6472] focus:border-white/25 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="h-7 rounded-full px-2.5 text-[12px] text-[#9aa0ae] hover:bg-white/5 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!comment.trim()}
          className="h-7 rounded-full bg-white px-3 text-[12px] font-medium text-[#0b0c10] hover:bg-white/90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
