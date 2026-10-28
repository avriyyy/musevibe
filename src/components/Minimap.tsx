"use client";

/**
 * Small overview map for the custom design canvas. Shows the prototype
 * frame and every shape scaled into a thumbnail, with a box for the
 * current viewport. Clicking or dragging the map centers the canvas
 * there. Dark pill styling matches the rest of the canvas chrome.
 */

import { useRef } from "react";
import { bboxOf, type CanvasShape, type Transform } from "@/lib/canvas";
import { FRAME_H, FRAME_W } from "./DesignCanvas";

interface MinimapProps {
  shapes: readonly CanvasShape[];
  transform: Transform;
  viewport: { w: number; h: number };
  onNavigate: (worldX: number, worldY: number) => void;
}

const MM_W = 168;
const MM_H = 112;

export default function Minimap({
  shapes,
  transform,
  viewport,
  onNavigate,
}: MinimapProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // World bounds: the frame plus every shape, with breathing room.
  let minX = 0;
  let minY = 0;
  let maxX = FRAME_W;
  let maxY = FRAME_H;
  for (const shape of shapes) {
    const box = bboxOf(shape);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  const pad = 120;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const scale = Math.min(MM_W / (maxX - minX), MM_H / (maxY - minY));
  const offX = (MM_W - (maxX - minX) * scale) / 2;
  const offY = (MM_H - (maxY - minY) * scale) / 2;

  const toMini = (x: number, y: number) => ({
    x: (x - minX) * scale + offX,
    y: (y - minY) * scale + offY,
  });

  const frame = {
    x: toMini(0, 0).x,
    y: toMini(0, 0).y,
    w: FRAME_W * scale,
    h: FRAME_H * scale,
  };

  // Current viewport in world coordinates, drawn as a box.
  const vx = -transform.x / transform.k;
  const vy = -transform.y / transform.k;
  const vw = viewport.w / transform.k;
  const vh = viewport.h / transform.k;
  const v0 = toMini(vx, vy);
  const v1 = toMini(vx + vw, vy + vh);

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
      className="hidden cursor-crosshair overflow-hidden rounded-2xl border border-white/10 bg-[#17181d]/95 shadow-xl sm:block"
      style={{ width: MM_W, height: MM_H }}
    >
      <svg width={MM_W} height={MM_H} className="block">
        {/* Prototype frame. */}
        <rect
          x={frame.x}
          y={frame.y}
          width={frame.w}
          height={frame.h}
          rx={2}
          fill="rgba(255,255,255,0.10)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1}
        />
        {/* Shapes. */}
        {shapes.map((shape) => {
          const box = bboxOf(shape);
          const p = toMini(box.x, box.y);
          return (
            <rect
              key={shape.id}
              x={p.x}
              y={p.y}
              width={Math.max(2, box.w * scale)}
              height={Math.max(2, box.h * scale)}
              rx={1}
              fill="rgba(232,235,240,0.75)"
            />
          );
        })}
        {/* Viewport box. */}
        <rect
          x={v0.x}
          y={v0.y}
          width={Math.max(4, v1.x - v0.x)}
          height={Math.max(4, v1.y - v0.y)}
          rx={3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
