"use client";

/**
 * Overview map for the design canvas. The map always frames the prototype
 * page with a fixed margin, so the page keeps the same size and place no
 * matter where the vectors sit. Marks on the page are light, and the part
 * currently on screen is boxed in blue. Clicking or dragging the map
 * centers the canvas there.
 */

import { useRef } from "react";
import {
  FRAME_H,
  FRAME_W,
  bboxOf,
  type CanvasShape,
  type Transform,
} from "@/lib/canvas";

interface MinimapProps {
  shapes: readonly CanvasShape[];
  transform: Transform;
  viewport: { w: number; h: number };
  onNavigate: (worldX: number, worldY: number) => void;
}

const MM_W = 168;
const MM_H = 108;
/** Breathing room around the page, as a share of the page size. */
const MARGIN = 0.2;

const minX = -FRAME_W * MARGIN;
const minY = -FRAME_H * MARGIN;
const maxX = FRAME_W + FRAME_W * MARGIN;
const maxY = FRAME_H + FRAME_H * MARGIN;
const scale = Math.min(MM_W / (maxX - minX), MM_H / (maxY - minY));
const offX = (MM_W - (maxX - minX) * scale) / 2;
const offY = (MM_H - (maxY - minY) * scale) / 2;

function toMini(x: number, y: number) {
  return { x: (x - minX) * scale + offX, y: (y - minY) * scale + offY };
}

const page = {
  x: toMini(0, 0).x,
  y: toMini(0, 0).y,
  w: FRAME_W * scale,
  h: FRAME_H * scale,
};

export default function Minimap({
  shapes,
  transform,
  viewport,
  onNavigate,
}: MinimapProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Current viewport in world coordinates, drawn as a box.
  const vx = -transform.x / transform.k;
  const vy = -transform.y / transform.k;
  const vw = viewport.w / transform.k;
  const vh = viewport.h / transform.k;
  const v0 = toMini(vx, vy);
  const v1 = toMini(vx + vw, vy + vh);
  // The box only helps when the view is a window into a larger map. Once
  // the view holds the whole map it would just trace the edges and read as
  // a selection, so it stays out of the way.
  const showViewport =
    vx >= minX && vy >= minY && vx + vw <= maxX && vy + vh <= maxY;

  const jump = (clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const wx = minX + (mx - offX) / scale;
    const wy = minY + (my - offY) / scale;
    onNavigate(wx, wy);
  };

  return (
    <div
      ref={boxRef}
      role="application"
      aria-label="Canvas overview. Activate to move the canvas view."
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        (event.target as Element).setPointerCapture?.(event.pointerId);
        jump(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        jump(event.clientX, event.clientY);
      }}
      className="hidden cursor-crosshair overflow-hidden rounded-2xl border border-white/10 bg-[#131419] shadow-xl transition-colors hover:border-white/25 sm:block"
      style={{ width: MM_W, height: MM_H }}
    >
      <svg width={MM_W} height={MM_H} className="block" aria-hidden>
        <defs>
          <pattern
            id="minimap-grid"
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={1} cy={1} r={0.5} fill="rgba(255,255,255,0.12)" />
          </pattern>
        </defs>

        <rect width={MM_W} height={MM_H} fill="url(#minimap-grid)" />

        {/* Prototype page. */}
        <rect
          x={page.x}
          y={page.y}
          width={page.w}
          height={page.h}
          rx={2.5}
          fill="rgba(255,255,255,0.14)"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth={1}
        />

        {/* Marks drawn on the page. */}
        {shapes.map((shape) => {
          const box = bboxOf(shape);
          if (box.x + box.w < 0 || box.y + box.h < 0) return null;
          if (box.x > FRAME_W || box.y > FRAME_H) return null;
          const p = toMini(box.x, box.y);
          return (
            <rect
              key={shape.id}
              x={p.x}
              y={p.y}
              width={Math.max(1.5, box.w * scale)}
              height={Math.max(1.5, box.h * scale)}
              rx={1}
              fill="rgba(255,255,255,0.5)"
            />
          );
        })}

        {/* Viewport box. */}
        {showViewport && (
          <rect
            x={v0.x}
            y={v0.y}
            width={Math.max(4, v1.x - v0.x)}
            height={Math.max(4, v1.y - v0.y)}
            rx={2.5}
            fill="rgba(138,180,255,0.12)"
            stroke="#8ab4ff"
            strokeWidth={1.25}
          />
        )}
      </svg>
    </div>
  );
}
