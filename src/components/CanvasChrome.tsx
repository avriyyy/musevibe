"use client";

/**
 * Tool rail and zoom controls floating over the custom design canvas.
 * Same eight tools as before, now driving canvas state instead of a
 * library editor. Dark pills on the workspace background.
 */

import type { ReactElement, ReactNode } from "react";

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
    id: "select",
    label: "Select",
    icon: strokeIcon(<path d="M6 3l13 9-7 1.5L8.5 21 6 3z" />),
  },
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
    id: "rectangle",
    label: "Rectangle",
    icon: strokeIcon(<rect x="4" y="6" width="16" height="12" rx="1.5" />),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    icon: strokeIcon(<circle cx="12" cy="12" r="8" />),
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: strokeIcon(
      <>
        <line x1="5" y1="19" x2="19" y2="5" />
        <path d="M9 5h10v10" />
      </>,
    ),
  },
  {
    id: "text",
    label: "Text",
    icon: strokeIcon(
      <>
        <line x1="5" y1="6" x2="19" y2="6" />
        <line x1="12" y1="6" x2="12" y2="20" />
      </>,
    ),
  },
  {
    id: "draw",
    label: "Draw",
    icon: strokeIcon(
      <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" />,
    ),
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: strokeIcon(
      <path d="M7 20h11M6.5 15.5l8-8a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5l-6.5 6.5H9l-2.5-2.5z" />,
    ),
  },
];

export default function CanvasChrome({
  tool,
  onTool,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  tool: string;
  onTool: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <>
      {/* Tool rail, left. */}
      <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
        <div
          role="toolbar"
          aria-label="Canvas tools"
          className="flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-[#17181d]/95 p-1.5 shadow-xl"
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

      {/* Zoom controls, bottom left. */}
      <div className="absolute bottom-4 left-3 z-10">
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
