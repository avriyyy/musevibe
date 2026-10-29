"use client";

/**
 * Custom design canvas in the MuseVibe style: a dark dot-grid world holding
 * the generated prototype.html in a Figma-style frame, with a small vector
 * toolset (shapes, arrow, text, freehand, eraser) drawn on an SVG overlay.
 * No canvas library, no license key, no watermark.
 *
 * The canvas is uncontrolled after mount: initialShapes only seeds the first
 * paint, later store writes never touch the live shapes. Edits are debounced
 * back to the caller and persisted as JSON in the project store.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CanvasChrome from "./CanvasChrome";
import {
  SHAPE_STROKE,
  SHAPE_WIDTH,
  TEXT_COLOR,
  bboxOf,
  createId,
  normalizeRect,
  shapeAt,
  type BBox,
  type CanvasShape,
  type Transform,
} from "@/lib/canvas";
import {
  injectInspector,
  nodeLabel,
  type InspectedNode,
} from "@/lib/prototypeInspect";

export const FRAME_W = 960;
export const FRAME_H = 640;

interface DesignCanvasProps {
  /** Shapes used only to seed the first paint, never re-fed afterwards. */
  initialShapes: readonly CanvasShape[] | null;
  /** Current prototype.html content; the frame iframe follows it directly. */
  html: string;
  onShapes: (shapesJson: string) => void;
}

type Gesture =
  | { kind: "pan"; startX: number; startY: number; origX: number; origY: number }
  | { kind: "draw"; id: string; startX: number; startY: number }
  | {
      kind: "move";
      id: string;
      offsetX: number;
      offsetY: number;
      orig: CanvasShape;
    }
  | { kind: "resize"; id: string; corner: number; orig: BBox }
  | { kind: "stroke"; id: string }
  | { kind: "erase" }
  | { kind: "pendingText"; x: number; y: number }
  | { kind: "pressSelect"; id: string; x: number; y: number }
  | null;

const GRID = 28;

export default function DesignCanvas({
  initialShapes,
  html,
  onShapes,
}: DesignCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<CanvasShape[]>(() =>
    initialShapes ? [...initialShapes] : [],
  );
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [tool, setTool] = useState("hand");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [panning, setPanning] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [inspected, setInspected] = useState<InspectedNode | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const shapesRef = useRef(shapes);
  const transformRef = useRef(transform);
  const callbackRef = useRef(onShapes);
  const gestureRef = useRef<Gesture>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    dist: number;
    midX: number;
    midY: number;
    k: number;
    x: number;
    y: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const seedRef = useRef(
    JSON.stringify({ version: 1, shapes: initialShapes ?? [] }),
  );
  // Refs mirror the latest state for pointer handlers without rebinding.
  useEffect(() => {
    shapesRef.current = shapes;
    transformRef.current = transform;
    callbackRef.current = onShapes;
    draftRef.current = draft;
  });

  // Prototype inspector: Select mode picks components inside the frame.
  const inspectedHtml = useMemo(() => injectInspector(html), [html]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = (event.data ?? {}) as {
        type?: unknown;
      } & Partial<InspectedNode>;
      if (data.type === "musevibe-select" && typeof data.tag === "string") {
        setInspected({
          tag: data.tag,
          text: typeof data.text === "string" ? data.text : "",
          id: typeof data.id === "string" ? data.id : null,
          classes: Array.isArray(data.classes)
            ? data.classes.filter((c): c is string => typeof c === "string")
            : [],
        });
      } else if (data.type === "musevibe-deselect") {
        setInspected(null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Leaving Select mode or swapping the prototype clears the pick.
  // Render-phase update (no effect): adjusting to new props during render
  // never loops because the guard goes false on the immediate re-render.
  const [prevHtml, setPrevHtml] = useState(html);
  if (prevHtml !== html) {
    setPrevHtml(html);
    setInspected(null);
  }

  const clearInspected = useCallback(() => {
    setInspected(null);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "musevibe-clear" },
        "*",
      );
    } catch {
      // A frame that will not clear keeps its outline; harmless.
    }
  }, []);

  // Persist edits, debounced. The seed echo is skipped so mounting never
  // dirties the store.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify({ version: 1, shapes: shapesRef.current });
        if (serialized !== seedRef.current) callbackRef.current(serialized);
      } catch {
        // Shapes that will not serialize are not worth keeping.
      }
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [shapes]);

  const toScene = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const t = transformRef.current;
      return {
        x: (clientX - (rect?.left ?? 0) - t.x) / t.k,
        y: (clientY - (rect?.top ?? 0) - t.y) / t.k,
      };
    },
    [],
  );

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    let minX = 0;
    let minY = 0;
    let maxX = FRAME_W;
    let maxY = FRAME_H;
    for (const shape of shapesRef.current) {
      const box = bboxOf(shape);
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.w);
      maxY = Math.max(maxY, box.y + box.h);
    }
    const pad = 96;
    const bw = Math.max(1, maxX - minX + pad * 2);
    const bh = Math.max(1, maxY - minY + pad * 2);
    const k = Math.min(1.25, Math.min(rect.width / bw, rect.height / bh));
    setTransform({
      k,
      x: rect.width / 2 - ((minX + maxX) / 2) * k,
      y: rect.height / 2 - ((minY + maxY) / 2) * k,
    });
  }, []);

  // First paint only: center the prototype frame.
  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the visible size so the overview map draws the viewport box.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setViewport((prev) =>
        prev.w === rect.width && prev.h === rect.height
          ? prev
          : { w: rect.width, h: rect.height },
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const navigateTo = useCallback(
    (worldX: number, worldY: number) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      if (!rect) return;
      setTransform((prev) => ({
        ...prev,
        x: rect.width / 2 - worldX * prev.k,
        y: rect.height / 2 - worldY * prev.k,
      }));
    },
    [],
  );

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const px = cx ?? (rect?.width ?? 0) / 2;
    const py = cy ?? (rect?.height ?? 0) / 2;
    setTransform((prev) => {
      const k = Math.min(3, Math.max(0.1, prev.k * factor));
      const s = k / prev.k;
      return { k, x: px - (px - prev.x) * s, y: py - (py - prev.y) * s };
    });
  }, []);

  // Wheel: plain scroll pans the canvas (two-finger swipe on a
  // touchpad), while pinch-to-zoom arrives as ctrl+wheel and zooms to
  // the cursor. React attaches wheel as passive, so this needs a
  // non-passive listener to preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        const unit = event.deltaMode === 1 ? 16 : 1;
        zoomBy(
          Math.exp(-event.deltaY * unit * 0.004),
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        return;
      }
      const unit = event.deltaMode === 1 ? 16 : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;
      setTransform((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoomBy]);

  const eraseAt = useCallback((sx: number, sy: number) => {
    const hit = shapeAt(shapesRef.current, sx, sy, 8 / transformRef.current.k);
    if (hit) {
      setShapes((prev) => prev.filter((entry) => entry.id !== hit.id));
      setSelectedId((prev) => (prev === hit.id ? null : prev));
    }
  }, []);

  const commitDraft = useCallback(() => {
    const id = editingId;
    const value = draftRef.current;
    setEditingId(null);
    if (!id) return;
    if (!value.trim()) {
      setShapes((prev) => prev.filter((entry) => entry.id !== id));
      setSelectedId(null);
      return;
    }
    setShapes((prev) =>
      prev.map((entry) =>
        entry.id === id && entry.type === "text"
          ? { ...entry, text: value }
          : entry,
      ),
    );
  }, [editingId]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (editingId) return;
      // Second touch finger starts a pinch: it takes over whatever the
      // first finger was doing (a tap becomes a zoom, not a click).
      if (event.pointerType !== "mouse") {
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        if (pointersRef.current.size === 2) {
          const [a, b] = [...pointersRef.current.values()];
          const t = transformRef.current;
          pinchRef.current = {
            dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
            midX: (a.x + b.x) / 2,
            midY: (a.y + b.y) / 2,
            k: t.k,
            x: t.x,
            y: t.y,
          };
          gestureRef.current = null;
          return;
        }
        if (pointersRef.current.size > 2) return;
      }
      if (event.button === 1) {
        gestureRef.current = {
          kind: "pan",
          startX: event.clientX,
          startY: event.clientY,
          origX: transformRef.current.x,
          origY: transformRef.current.y,
        };
        setPanning(true);
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }
      // Touch contacts may report a non-zero button; only the mouse
      // is gated on it.
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const pt = toScene(event.clientX, event.clientY);

      if (tool === "hand") {
        gestureRef.current = {
          kind: "pan",
          startX: event.clientX,
          startY: event.clientY,
          origX: transformRef.current.x,
          origY: transformRef.current.y,
        };
        setPanning(true);
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }

      if (tool === "eraser") {
        eraseAt(pt.x, pt.y);
        gestureRef.current = { kind: "erase" };
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }

      if (tool === "text") {
        // Created on release: opening the editor while the mouse button is
        // still down races the browser's own focus handling and the fresh
        // input loses focus immediately. Deferring to pointer-up avoids it.
        gestureRef.current = { kind: "pendingText", x: pt.x, y: pt.y };
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }

      if (
        tool === "rectangle" ||
        tool === "ellipse" ||
        tool === "line" ||
        tool === "arrow"
      ) {
        const id = createId();
        const shape: CanvasShape =
          tool === "rectangle" || tool === "ellipse"
            ? { id, type: tool, x: pt.x, y: pt.y, w: 0, h: 0 }
            : { id, type: tool, x: pt.x, y: pt.y, w: 0, h: 0 };
        setShapes((prev) => [...prev, shape]);
        setSelectedId(id);
        gestureRef.current = { kind: "draw", id, startX: pt.x, startY: pt.y };
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }

      if (tool === "draw") {
        const id = createId();
        setShapes((prev) => [
          ...prev,
          { id, type: "freedraw", points: [pt] },
        ]);
        setSelectedId(id);
        gestureRef.current = { kind: "stroke", id };
        (event.target as Element).setPointerCapture?.(event.pointerId);
        return;
      }

      // Select tool.
      const handle = (event.target as Element).closest?.("[data-handle]");
      if (handle) {
        const id = handle.getAttribute("data-shape") ?? "";
        const corner = Number(handle.getAttribute("data-handle") ?? 0);
        const target = shapesRef.current.find((entry) => entry.id === id);
        if (target && target.type !== "text" && target.type !== "freedraw") {
          gestureRef.current = { kind: "resize", id, corner, orig: bboxOf(target) };
          (event.target as Element).setPointerCapture?.(event.pointerId);
          return;
        }
      }
      const hit = shapeAt(
        shapesRef.current,
        pt.x,
        pt.y,
        6 / transformRef.current.k,
      );
      if (hit) {
        // Clicking the selected text again opens the inline editor, but on
        // release: opening it while the button is down loses focus the same
        // way creating text does. A drag still moves the shape.
        if (hit.type === "text" && hit.id === selectedId) {
          gestureRef.current = {
            kind: "pressSelect",
            id: hit.id,
            x: pt.x,
            y: pt.y,
          };
          (event.target as Element).setPointerCapture?.(event.pointerId);
          return;
        }
        setSelectedId(hit.id);
        const box = bboxOf(hit);
        gestureRef.current = {
          kind: "move",
          id: hit.id,
          offsetX: pt.x - box.x,
          offsetY: pt.y - box.y,
          orig: hit,
        };
        (event.target as Element).setPointerCapture?.(event.pointerId);
      } else {
        clearInspected();
        setSelectedId(null);
      }
    },
    [editingId, eraseAt, toScene, tool, clearInspected],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      // Pinch: keep the world point under the gesture-start midpoint
      // under the current midpoint, scaled by the finger spread.
      if (event.pointerType !== "mouse" && pinchRef.current) {
        if (pointersRef.current.has(event.pointerId)) {
          pointersRef.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
        }
        if (pointersRef.current.size >= 2) {
          const pinch = pinchRef.current;
          const [a, b] = [...pointersRef.current.values()].slice(0, 2);
          const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
          const el = containerRef.current;
          const rect = el?.getBoundingClientRect();
          const k = Math.min(3, Math.max(0.1, pinch.k * (dist / pinch.dist)));
          const sx0 = pinch.midX - (rect?.left ?? 0);
          const sy0 = pinch.midY - (rect?.top ?? 0);
          const wx = (sx0 - pinch.x) / pinch.k;
          const wy = (sy0 - pinch.y) / pinch.k;
          const mx = (a.x + b.x) / 2 - (rect?.left ?? 0);
          const my = (a.y + b.y) / 2 - (rect?.top ?? 0);
          setTransform({ k, x: mx - wx * k, y: my - wy * k });
        }
        return;
      }
      const gesture = gestureRef.current;
      if (!gesture) return;
      const pt = toScene(event.clientX, event.clientY);

      if (gesture.kind === "pressSelect") {
        if (Math.hypot(pt.x - gesture.x, pt.y - gesture.y) * transformRef.current.k > 4) {
          const target = shapesRef.current.find(
            (entry) => entry.id === gesture.id,
          );
          if (target) {
            const box = bboxOf(target);
            gestureRef.current = {
              kind: "move",
              id: target.id,
              offsetX: pt.x - box.x,
              offsetY: pt.y - box.y,
              orig: target,
            };
          } else {
            gestureRef.current = null;
          }
        }
        return;
      }

      if (gesture.kind === "pan") {
        setTransform((prev) => ({
          ...prev,
          x: gesture.origX + (event.clientX - gesture.startX),
          y: gesture.origY + (event.clientY - gesture.startY),
        }));
        return;
      }
      if (gesture.kind === "erase") {
        eraseAt(pt.x, pt.y);
        return;
      }
      if (gesture.kind === "draw") {
        const { startX, startY } = gesture;
        const rect = normalizeRect(startX, startY, pt.x, pt.y);
        setShapes((prev) =>
          prev.map((entry) =>
            entry.id === gesture.id &&
            (entry.type === "rectangle" ||
              entry.type === "ellipse" ||
              entry.type === "line" ||
              entry.type === "arrow")
              ? { ...entry, ...rect }
              : entry,
          ),
        );
        return;
      }
      if (gesture.kind === "stroke") {
        setShapes((prev) =>
          prev.map((entry) =>
            entry.id === gesture.id && entry.type === "freedraw"
              ? { ...entry, points: [...entry.points, pt] }
              : entry,
          ),
        );
        return;
      }
      if (gesture.kind === "move") {
        const nx = pt.x - gesture.offsetX;
        const ny = pt.y - gesture.offsetY;
        setShapes((prev) =>
          prev.map((entry) => {
            if (entry.id !== gesture.id) return entry;
            if (entry.type === "freedraw") {
              const obox = bboxOf(gesture.orig);
              const dx = nx - obox.x;
              const dy = ny - obox.y;
              return {
                ...entry,
                points: gesture.orig.type === "freedraw" ? gesture.orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : entry.points,
              };
            }
            if (entry.type === "text") return { ...entry, x: nx, y: ny };
            const obox = bboxOf(gesture.orig);
            const dx = nx - obox.x;
            const dy = ny - obox.y;
            if (entry.type === "rectangle" || entry.type === "ellipse") {
              return { ...entry, x: entry.x + dx, y: entry.y + dy };
            }
            return { ...entry, x: entry.x + dx, y: entry.y + dy };
          }),
        );
        return;
      }
      if (gesture.kind === "resize") {
        const o = gesture.orig;
        const x2 = o.x + o.w;
        const y2 = o.y + o.h;
        // Corners: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left.
        const left = gesture.corner === 0 || gesture.corner === 3 ? pt.x : o.x;
        const right = gesture.corner === 1 || gesture.corner === 2 ? pt.x : x2;
        const top = gesture.corner === 0 || gesture.corner === 1 ? pt.y : o.y;
        const bottom = gesture.corner === 2 || gesture.corner === 3 ? pt.y : y2;
        const rect = normalizeRect(left, top, right, bottom);
        setShapes((prev) =>
          prev.map((entry) =>
            entry.id === gesture.id &&
            (entry.type === "rectangle" ||
              entry.type === "ellipse" ||
              entry.type === "line" ||
              entry.type === "arrow")
              ? { ...entry, ...rect }
              : entry,
          ),
        );
      }
    },
    [eraseAt, toScene],
  );

  const endGesture = useCallback((event?: React.PointerEvent) => {
    const pointer = event as React.PointerEvent | undefined;
    if (pointer && pointer.pointerType !== "mouse") {
      pointersRef.current.delete(pointer.pointerId);
      if (pointersRef.current.size > 0) {
        // Fingers still down: a tap turned into a gesture, so nothing
        // commits. A fresh press starts the next one.
        pinchRef.current = null;
        gestureRef.current = null;
        setPanning(false);
        return;
      }
      pinchRef.current = null;
    }
    const gesture = gestureRef.current;
    gestureRef.current = null;
    setPanning(false);
    if (!gesture) return;
    if (gesture.kind === "pendingText") {
      const id = createId();
      setShapes((prev) => [
        ...prev,
        { id, type: "text", x: gesture.x, y: gesture.y, text: "Text", fontSize: 20 },
      ]);
      setSelectedId(id);
      setDraft("Text");
      setEditingId(id);
      return;
    }
    if (gesture.kind === "pressSelect") {
      const target = shapesRef.current.find(
        (entry) => entry.id === gesture.id,
      );
      if (target && target.type === "text") {
        setDraft(target.text);
        setEditingId(target.id);
      }
    }
  }, []);

  // Delete / escape shortcuts, suspended while editing text.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (editingId) {
        if (event.key === "Escape") commitDraft();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        setShapes((prev) => prev.filter((entry) => entry.id !== selectedId));
        setSelectedId(null);
      } else if (event.key === "Escape") {
        clearInspected();
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingId, selectedId, commitDraft, clearInspected]);

  const cursor = useMemo(() => {
    if (panning) return "grabbing";
    switch (tool) {
      case "hand":
        return "grab";
      case "select":
        return "default";
      case "text":
        return "text";
      case "eraser":
        return "cell";
      default:
        return "crosshair";
    }
  }, [tool, panning]);

  const gridSize = transform.k * GRID;
  const gridX = ((transform.x % gridSize) + gridSize) % gridSize;
  const gridY = ((transform.y % gridSize) + gridSize) % gridSize;

  const selected = shapes.find((entry) => entry.id === selectedId) ?? null;
  const selectedBox = selected ? bboxOf(selected) : null;
  const showHandles =
    selected &&
    selectedBox &&
    (selected.type === "rectangle" ||
      selected.type === "ellipse" ||
      selected.type === "line" ||
      selected.type === "arrow");

  const editorPos =
    selected && selected.type === "text"
      ? {
          x: selected.x * transform.k + transform.x,
          y: selected.y * transform.k + transform.y,
        }
      : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      role="application"
      aria-label="Design canvas"
      className="relative h-full w-full touch-none overflow-hidden bg-[#0b0c10] select-none"
      style={{ cursor }}
    >
      {/* Dot grid, MuseVibe dark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridX}px ${gridY}px`,
        }}
      />

      {/* World: pan + zoom. */}
      <div
        aria-hidden={false}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        }}
      >
        {/* Prototype frame with a Figma-style label. The iframe is a
            live-rendered preview, never interactive, so pan, draw, and
            selection gestures work uniformly across the whole canvas. */}
        <div className="absolute" style={{ left: 0, top: 0, width: FRAME_W, height: FRAME_H }}>
          <p className="pointer-events-none absolute -top-8 left-0 flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[13px] font-semibold text-[#f5f6f8]">Prototype</span>
            <span className="font-mono text-[12px] text-[#5b6472]">/</span>
          </p>
          <div className="h-full w-full overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl">
            <iframe
              ref={iframeRef}
              title="Prototype"
              srcDoc={inspectedHtml}
              sandbox="allow-scripts"
              tabIndex={-1}
              className="h-full w-full"
              style={tool === "select" ? undefined : { pointerEvents: "none" }}
            />
          </div>
        </div>

        {/* Vector overlay. */}
        <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
          <defs>
            <marker
              id="musevibe-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" fill={SHAPE_STROKE} />
            </marker>
          </defs>
          {shapes.map((shape) => {
            const isSelected = shape.id === selectedId;
            const common = {
              stroke: SHAPE_STROKE,
              strokeWidth: SHAPE_WIDTH / transform.k + 1,
              fill: "none" as const,
              "data-shape-id": shape.id,
            };
            if (shape.type === "rectangle") {
              return (
                <rect
                  key={shape.id}
                  x={Math.min(shape.x, shape.x + shape.w)}
                  y={Math.min(shape.y, shape.y + shape.h)}
                  width={Math.abs(shape.w)}
                  height={Math.abs(shape.h)}
                  rx={8}
                  {...common}
                  strokeDasharray={isSelected ? `${6 / transform.k} ${4 / transform.k}` : undefined}
                />
              );
            }
            if (shape.type === "ellipse") {
              return (
                <ellipse
                  key={shape.id}
                  cx={shape.x + shape.w / 2}
                  cy={shape.y + shape.h / 2}
                  rx={Math.abs(shape.w / 2)}
                  ry={Math.abs(shape.h / 2)}
                  {...common}
                  strokeDasharray={isSelected ? `${6 / transform.k} ${4 / transform.k}` : undefined}
                />
              );
            }
            if (shape.type === "line" || shape.type === "arrow") {
              return (
                <line
                  key={shape.id}
                  x1={shape.x}
                  y1={shape.y}
                  x2={shape.x + shape.w}
                  y2={shape.y + shape.h}
                  {...common}
                  markerEnd={shape.type === "arrow" ? "url(#musevibe-arrow)" : undefined}
                  strokeDasharray={isSelected ? `${6 / transform.k} ${4 / transform.k}` : undefined}
                />
              );
            }
            if (shape.type === "freedraw") {
              const d =
                shape.points.length < 2
                  ? ""
                  : `M${shape.points.map((p) => `${p.x} ${p.y}`).join(" L")}`;
              return d ? <path key={shape.id} d={d} {...common} strokeLinecap="round" strokeLinejoin="round" /> : null;
            }
            // Text.
            if (shape.type !== "text") return null;
            return (
              <text
                key={shape.id}
                x={shape.x}
                y={shape.y + shape.fontSize}
                fontSize={shape.fontSize}
                fill={TEXT_COLOR}
                data-shape-id={shape.id}
              >
                {shape.text}
              </text>
            );
          })}

          {/* Selection: resize handles for shapes, dashed box for text. */}
          {showHandles && selectedBox && (
            <g>
              {[
                [selectedBox.x, selectedBox.y],
                [selectedBox.x + selectedBox.w, selectedBox.y],
                [selectedBox.x + selectedBox.w, selectedBox.y + selectedBox.h],
                [selectedBox.x, selectedBox.y + selectedBox.h],
              ].map(([hx, hy], corner) => (
                <rect
                  key={corner}
                  x={hx - 5 / transform.k}
                  y={hy - 5 / transform.k}
                  width={10 / transform.k}
                  height={10 / transform.k}
                  rx={2 / transform.k}
                  fill="#0b0c10"
                  stroke="#ffffff"
                  strokeWidth={1.5 / transform.k}
                  data-handle={corner}
                  data-shape={selected?.id}
                  style={{ cursor: "nwse-resize" }}
                />
              ))}
            </g>
          )}
          {selected?.type === "text" && selectedBox && (
            <rect
              x={selectedBox.x - 6 / transform.k}
              y={selectedBox.y - 6 / transform.k}
              width={selectedBox.w + 12 / transform.k}
              height={selectedBox.h + 12 / transform.k}
              rx={8 / transform.k}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.7}
              strokeWidth={1.5 / transform.k}
              strokeDasharray={`${6 / transform.k} ${4 / transform.k}`}
              data-shape-id={selected.id}
              pointerEvents="none"
            />
          )}
        </svg>
      </div>

      {/* Inline text editor, positioned in screen space. */}
      {editingId && editorPos && (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Shape text"
          placeholder="Type…"
          className="absolute z-20 rounded-lg border border-white/25 bg-[#17181d] px-2 py-1 text-[14px] text-[#f5f6f8] shadow-xl focus:outline-none"
          style={{
            left: Math.max(8, editorPos.x),
            top: Math.max(8, editorPos.y - 8),
            width: 220,
          }}
        />
      )}

      {/* Picked prototype component, above the chat pill. */}
      {inspected && !editingId && (
        <div className="absolute bottom-20 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#17181d]/95 py-1.5 pl-4 pr-1.5 shadow-xl">
          <span className="truncate text-[12px] font-medium text-[#f5f6f8]">
            {nodeLabel(inspected)}
          </span>
          <button
            type="button"
            onClick={clearInspected}
            aria-label="Clear selected component"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#9aa0ae] hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <CanvasChrome
        tool={tool}
        onTool={(next) => {
          if (editingId) commitDraft();
          if (next !== "select") clearInspected();
          setTool(next);
        }}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(1 / 1.25)}
        onFit={fitToScreen}
        shapes={shapes}
        transform={transform}
        viewport={viewport}
        onNavigate={navigateTo}
      />
    </div>
  );
}
