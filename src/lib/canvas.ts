"use client";

/**
 * Minimal shape model for the custom design canvas. Everything lives in
 * scene coordinates (drawing units, y down); the canvas maps them to the
 * screen with a pan + zoom transform. One stroke style on purpose: light
 * lines on the dark workspace, no picker to maintain.
 */

export type CanvasShape =
  | {
      id: string;
      type: "rectangle" | "ellipse";
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      id: string;
      type: "line" | "arrow";
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | {
      id: string;
      type: "freedraw";
      points: { x: number; y: number }[];
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      fontSize: number;
    };

export const SHAPE_STROKE = "#e8ebf0";
export const SHAPE_WIDTH = 2;
export const TEXT_COLOR = "#f5f6f8";

/** Size of the prototype frame the canvas holds, in canvas units. */
export const FRAME_W = 960;
export const FRAME_H = 640;

/** Pan + zoom mapping scene coordinates to the screen. */
export interface Transform {
  x: number;
  y: number;
  k: number;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `shape-${crypto.randomUUID()}`;
  }
  return `shape-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Axis-aligned bounds of a shape, used for selection and fit-to-screen. */
export function bboxOf(shape: CanvasShape): BBox {
  switch (shape.type) {
    case "freedraw": {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const point of shape.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "text": {
      // Monospace-free estimate; only drives the selection box and hit test.
      const lines = shape.text.split("\n");
      const longest = lines.reduce((acc, line) => Math.max(acc, line.length), 0);
      return {
        x: shape.x,
        y: shape.y,
        w: Math.max(8, longest * shape.fontSize * 0.6),
        h: Math.max(shape.fontSize * 1.2, lines.length * shape.fontSize * 1.2),
      };
    }
    default:
      return {
        x: Math.min(shape.x, shape.x + shape.w),
        y: Math.min(shape.y, shape.y + shape.h),
        w: Math.abs(shape.w),
        h: Math.abs(shape.h),
      };
  }
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Topmost shape under a scene point, or null. Tolerance is in scene units. */
export function shapeAt(
  shapes: readonly CanvasShape[],
  px: number,
  py: number,
  tol: number,
): CanvasShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (shape.type === "freedraw") {
      const pts = shape.points;
      for (let j = 1; j < pts.length; j++) {
        if (
          distToSegment(px, py, pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y) <=
          tol
        ) {
          return shape;
        }
      }
      continue;
    }
    if (shape.type === "line" || shape.type === "arrow") {
      if (
        distToSegment(px, py, shape.x, shape.y, shape.x + shape.w, shape.y + shape.h) <=
        tol
      ) {
        return shape;
      }
      continue;
    }
    const box = bboxOf(shape);
    if (
      px >= box.x - tol &&
      px <= box.x + box.w + tol &&
      py >= box.y - tol &&
      py <= box.y + box.h + tol
    ) {
      return shape;
    }
  }
  return null;
}

/** Normalize a drag into x/y/w/h that may extend into negative space. */
export function normalizeRect(ax: number, ay: number, bx: number, by: number) {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: bx - ax, h: by - ay };
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object") return false;
  const p = value as { x?: unknown; y?: unknown };
  return isNum(p.x) && isNum(p.y);
}

/** Guard for persisted payloads: plain objects with a known shape type
 *  and the numeric fields that type needs. Anything else (including old
 *  tldraw and Excalidraw snapshots) is rejected so the canvas restarts. */
export function isCanvasShape(value: unknown): value is CanvasShape {
  if (!value || typeof value !== "object") return false;
  const entry = value as {
    id?: unknown;
    type?: unknown;
    x?: unknown;
    y?: unknown;
    w?: unknown;
    h?: unknown;
    points?: unknown;
    text?: unknown;
    fontSize?: unknown;
  };
  if (typeof entry.id !== "string") return false;
  switch (entry.type) {
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
      return (
        isNum(entry.x) && isNum(entry.y) && isNum(entry.w) && isNum(entry.h)
      );
    case "freedraw":
      return (
        Array.isArray(entry.points) &&
        entry.points.length > 0 &&
        entry.points.every(isPoint)
      );
    case "text":
      return (
        isNum(entry.x) &&
        isNum(entry.y) &&
        typeof entry.text === "string" &&
        isNum(entry.fontSize)
      );
    default:
      return false;
  }
}

/** Parse persisted canvas JSON into shapes; old formats restart fresh. */
export function parseCanvasShapes(raw: string): CanvasShape[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed as { elements?: unknown; shapes?: unknown })?.elements ??
        (parsed as { shapes?: unknown })?.shapes;
    if (!Array.isArray(list)) return null;
    const valid = list.filter(isCanvasShape);
    if (valid.length === 0) return null;
    return [...valid];
  } catch {
    return null;
  }
}
