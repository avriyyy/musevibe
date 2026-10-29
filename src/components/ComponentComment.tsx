"use client";

/**
 * Comment composer attached to a picked prototype component: shows the
 * node's selector-like path, a short message field, and Cancel/Add.
 * Add sends "[Component] message" straight to the workspace chat, so no
 * long explanatory prompt is needed.
 */

import { useState } from "react";
import { nodeLabel, type InspectedNode } from "@/lib/prototypeInspect";

function nodePath(node: InspectedNode): string {
  const id = node.id ? `#${node.id}` : "";
  const classes = node.classes.map((c) => `.${c}`).join("");
  return `${node.tag}${id}${classes}`;
}

export default function ComponentComment({
  node,
  onCancel,
  onAdd,
}: {
  node: InspectedNode;
  onCancel: () => void;
  onAdd: (message: string) => void;
}) {
  const [message, setMessage] = useState("");

  const submit = () => {
    const text = message.trim();
    if (!text) return;
    onAdd(text);
  };

  return (
    <div className="absolute bottom-20 left-1/2 z-10 w-[min(360px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#17181d]/95 p-3 shadow-2xl backdrop-blur">
      <p className="truncate font-mono text-[11px] text-[#9aa0ae]" title={nodePath(node)}>
        <span className="mr-1 inline-block -translate-y-px text-[9px] text-[#5b6472]">▸</span>
        {nodePath(node)}
      </p>
      <p className="mt-1 truncate text-[12px] font-medium text-[#f5f6f8]">
        {nodeLabel(node)}
      </p>
      <input
        autoFocus
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") submit();
          if (event.key === "Escape") onCancel();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        placeholder="Write a message…"
        aria-label="Comment on the selected component"
        className="mt-2 h-9 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] text-[#f5f6f8] placeholder:text-[#5b6472] focus:border-white/30 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-xl px-3 text-[12px] font-medium text-[#c9cdd6] hover:bg-white/10 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!message.trim()}
          className="h-8 rounded-xl bg-white px-4 text-[12px] font-semibold text-[#0b0c10] hover:bg-white/90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
