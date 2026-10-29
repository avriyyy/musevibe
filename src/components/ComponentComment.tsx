"use client";

/**
 * Picked-component card: shows the node's selector path and label with
 * Add to chat / Cancel. Add queues the component as a chat mention so
 * several picks can stack up before sending — no message needed here.
 */

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
  onAdd: () => void;
}) {
  return (
    <div className="absolute bottom-20 left-1/2 z-10 w-[min(360px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#17181d]/95 p-3 shadow-2xl backdrop-blur">
      <p className="truncate font-mono text-[11px] text-[#9aa0ae]" title={nodePath(node)}>
        <span className="mr-1 inline-block -translate-y-px text-[9px] text-[#5b6472]">▸</span>
        {nodePath(node)}
      </p>
      <p className="mt-1 truncate text-[12px] font-medium text-[#f5f6f8]">
        {nodeLabel(node)}
      </p>
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
          onClick={onAdd}
          className="flex h-8 items-center gap-1.5 rounded-xl bg-white px-4 text-[12px] font-semibold text-[#0b0c10] hover:bg-white/90"
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
          Add to chat
        </button>
      </div>
    </div>
  );
}
