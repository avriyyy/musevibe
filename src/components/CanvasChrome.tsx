"use client";

/**
 * Canvas chrome for the custom design canvas: a two-button navigation rail
 * (select + pan) centered at the top, and a top-right cluster with the
 * overview map next to compact zoom controls. Dark pills on the workspace
 * background.
 */

import type { ReactElement, ReactNode } from "react";
import Minimap from "./Minimap";
import type { CanvasShape, Transform } from "@/lib/canvas";

interface ToolDef {
  id: string;
  label: string;
  icon: ReactElement;
}

function strokeIcon(path: ReactNode): ReactElement {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

const TOOLS: ToolDef[] = [
  {
    id: "hand",
    label: "Pan",
    icon: strokeIcon(
      <>
        <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10" />
        <path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10" />
        <path d="M14 10V6a1.5 1.5 0 0 1 3 0v8" />
        <path d="M8 11l-1.2-1.4a1.5 1.5 0 0 0-2.3 1.9l3.4 4.7A6 6 0 0 0 12.7 19H15a5 5 0 0 0 5-5v-3a1.5 1.5 0 0 0-3 0" />
      </>,
    ),
  },
  {
    id: "select",
    label: "Select",
    icon: strokeIcon(<path d="M6 3l13 9-7 1.5L8.5 21 6 3z" />),
  },
];

export default function CanvasChrome({
  tool,
  onTool,
  onZoomIn,
  onZoomOut,
  onFit,
  shapes,
  transform,
  viewport,
  onNavigate,
}: {
  tool: string;
  onTool: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  shapes: readonly CanvasShape[];
  transform: Transform;
  viewport: { w: number; h: number };
  onNavigate: (worldX: number, worldY: number) => void;
}) {
  return (
    <>
      {/* Navigation rail, top center. */}
      <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <div
          role="toolbar"
          aria-label="Canvas tools"
          className="flex items-center gap-0.5 rounded-2xl border border-white/10 bg-[#17181d]/95 p-1.5 shadow-xl"
        >
          {TOOLS.map((entry) => {
            const selected = tool === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                title={entry.label}
                aria-label={entry.label}
                aria-pressed={selected}
                onClick={() => onTool(entry.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  selected
                    ? "bg-white text-black"
                    : "text-[#c9cdd6] hover:bg-white/10 hover:text-white"
                }`}
              >
                {entry.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview map + zoom, top right. */}
      <div className="absolute right-3 top-3 z-10 flex items-start gap-2">
        <Minimap
          shapes={shapes}
          transform={transform}
          viewport={viewport}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#17181d]/95 p-1 shadow-xl">
          <button
            type="button"
            title="Zoom in"
            aria-label="Zoom in"
            onClick={onZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[16px] leading-none text-[#c9cdd6] hover:bg-white/10 hover:text-white"
          >
            +
          </button>
          <button
            type="button"
            title="Zoom out"
            aria-label="Zoom out"
            onClick={onZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[16px] leading-none text-[#c9cdd6] hover:bg-white/10 hover:text-white"
          >
            −
          </button>
          <button
            type="button"
            title="Fit to screen"
            aria-label="Fit to screen"
            onClick={onFit}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#c9cdd6] hover:bg-white/10 hover:text-white"
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
              strokeLinejoin="round"
            >
              <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
