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
import ChangeCard from "./ChangeCard";
import {
  boxOf,
  describeElement,
  type ChatQuote,
  type PickBox,
} from "@/lib/pick";
import {
  FRAME_H,
  FRAME_W,
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
export { FRAME_H, FRAME_W };

/** Gap between frames on the shared canvas. */
export const FRAME_GAP = 120;

/** One frame on the shared canvas: a generated page, a pending page, or the suggestion card. */
export interface CanvasFrame {
  /** File path for pages, "suggest" for the suggestion card. */
  id: string;
  /** Page slug for pending pages, so the parent can generate them. */
  slug?: string;
  title: string;
  subtitle: string;
  /** Null while the page has no HTML yet. */
  html: string | null;
  /** Same-origin URL rendered instead of srcDoc (template preview pages). */
  src?: string;
  kind: "page" | "suggest";
  /** One-line content note for pending pages. */
  brief?: string;
  /** True while this frame's HTML is being generated. */
  busy?: boolean;
}

/** Left edge of a frame in canvas space. */
export function frameLeft(index: number): number {
  return index * (FRAME_W + FRAME_GAP);
}

interface DesignCanvasProps {
  /** Shapes used only to seed the first paint, never re-fed afterwards. */
  initialShapes: readonly CanvasShape[] | null;
  /** Every frame on the shared canvas, left to right. */
  frames: CanvasFrame[];
  /** Center the canvas on this frame; bump seq to re-trigger. */
  focusRequest?: { id: string; seq: number } | null;
  onShapes: (shapesJson: string) => void;
  /** Quoted annotation text goes into the chat input (never auto-sent). */
  onQuoteToChat: (quote: ChatQuote) => void;
  /** Whether the chat's component picker is armed. */
  picking: boolean;
  /** Bumped on every arm so a previous pick never resurfaces. */
  pickSession: number;
  onPickingChange: (picking: boolean) => void;
  /** Height covered by the chat drawer, kept clear of the comment card. */
  bottomInset: number;
}

interface PickedComponent {
  label: string;
  text: string;
  box: PickBox;
  session: number;
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

/** Transparent placeholder shown while a page generates, with a looping
    scan bar so the wait reads as progress instead of a blank frame. */
function GeneratingCard({ left, title }: { left: number; title: string }) {
  return (
    <div
      className="absolute"
      style={{ left, top: 0, width: FRAME_W, height: FRAME_H }}
    >
      <style>
        {`@keyframes musevibe-scan { 0% { top: -18%; } 100% { top: 108%; } }`}
      </style>
      <div className="pointer-events-none absolute -top-9 left-0 flex items-center gap-2 whitespace-nowrap">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#c9cdd6]">
          <svg
            aria-hidden
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse text-[#8ab4ff]"
          >
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <path d="M3.5 9h17" />
          </svg>
          {title}
        </span>
        <span aria-hidden className="h-3 w-px bg-white/15" />
        <span className="font-mono text-[11px] tabular-nums text-[#5b6472]">
          drawing…
        </span>
      </div>
      <div
        role="status"
        aria-label={`Generating the ${title} page`}
        className="relative h-full w-full overflow-hidden rounded-2xl border border-[#8ab4ff]/30 bg-[#8ab4ff]/[0.03]"
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-[#8ab4ff]/25 to-transparent"
          style={{ animation: "musevibe-scan 1.8s linear infinite" }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <p className="animate-pulse text-[13px] font-medium text-[#9aa0ae]">
            Drawing {title}…
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesignCanvas({
  initialShapes,
  frames,
  focusRequest,
  onShapes,
  onQuoteToChat,
  picking,
  pickSession,
  onPickingChange,
  bottomInset,
}: DesignCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef(new Map<string, HTMLIFrameElement>());
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
  const [hoverBox, setHoverBox] = useState<PickBox | null>(null);
  const [picked, setPicked] = useState<PickedComponent | null>(null);

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

  // One wheel implementation for the canvas and every frame: plain
  // scroll pans (two-finger swipe on a touchpad), pinch-to-zoom arrives
  // as ctrl+wheel and zooms to the cursor.
  const applyWheel = useCallback(
    (event: {
      deltaX: number;
      deltaY: number;
      deltaMode: number;
      ctrlKey: boolean;
      metaKey: boolean;
      clientX: number;
      clientY: number;
    }) => {
      const el = containerRef.current;
      if (!el) return;
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
    },
    [zoomBy],
  );

  // Component picking binds straight into each same-origin frame
  // document, so the hover box and the pick line up with the real element
  // instead of the outer iframe. A click in pick mode describes a change;
  // it never runs the prototype. Boxes are offset by the frame's origin so
  // the shared overlay lines up across frames.
  const framesKey = frames
    .map((frame) => `${frame.id}:${frame.src ?? ""}:${frame.html?.length ?? 0}`)
    .join("|");
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    frames.forEach((frame, index) => {
      if (!frame.html && !frame.src) return;
      const el = iframeRefs.current.get(frame.id);
      if (!el) return;
      const originX = frameLeft(index);
      let unbind: (() => void) | null = null;
      const bind = () => {
        unbind?.();
        unbind = null;
        const doc = el.contentDocument;
        if (!doc) return;
        // A frame shows exactly one generated page: links never leave it.
        // Hash jumps stay, everything else is swallowed. Prototype scripts
        // still run because this never stops propagation.
        const blockLink = (event: Event) => {
          const target = event.target as Element | null;
          const anchor = target?.closest?.("a[href]");
          if (!anchor) return;
          const href = anchor.getAttribute("href") || "";
          if (!href.startsWith("#")) event.preventDefault();
        };
        // Forms never navigate away either; inline handlers still run.
        const blockSubmit = (event: Event) => event.preventDefault();
        // At the scroll edge the canvas takes the wheel, so the
        // browser's back gesture never triggers over a frame.
        const noOverscroll = doc.createElement("style");
        noOverscroll.textContent =
          "html,body{overscroll-behavior:none !important;}";
        doc.head.appendChild(noOverscroll);
        const forwardWheel = (event: WheelEvent) => {
          // Pinch always zooms the canvas.
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            event.stopPropagation();
            applyWheel(event);
            return;
          }
          // The page scrolls first; only at its scroll edge does the wheel
          // pan the canvas. preventDefault keeps the browser's back
          // gesture from ever triggering over a frame.
          const scroller = doc.scrollingElement;
          if (scroller) {
            const unit = event.deltaMode === 1 ? 16 : 1;
            const dx = event.deltaX * unit;
            const dy = event.deltaY * unit;
            const maxTop = scroller.scrollHeight - scroller.clientHeight;
            const maxLeft = scroller.scrollWidth - scroller.clientWidth;
            const top = scroller.scrollTop;
            const left = scroller.scrollLeft;
            const wantsY =
              maxTop > 1 && (dy > 0 ? top < maxTop - 1 : dy < 0 ? top > 1 : false);
            const wantsX =
              maxLeft > 1 &&
              (dx > 0 ? left < maxLeft - 1 : dx < 0 ? left > 1 : false);
            if (wantsY || wantsX) return;
          }
          event.preventDefault();
          event.stopPropagation();
          applyWheel(event);
        };
        doc.addEventListener("click", blockLink, true);
        doc.addEventListener("submit", blockSubmit, true);
        doc.addEventListener("wheel", forwardWheel, {
          passive: false,
          capture: true,
        });
        const baseUnbind = () => {
          noOverscroll.remove();
          doc.removeEventListener("click", blockLink, true);
          doc.removeEventListener("submit", blockSubmit, true);
          doc.removeEventListener("wheel", forwardWheel, { capture: true });
        };
        const targetOf = (event: Event) => {
          // Elements from the iframe belong to another realm, so instanceof
          // checks against the parent window's Element always fail here.
          const target = event.target as Node | null;
          if (!target || target.nodeType !== 1) return null;
          const node = target as Element;
          if (node === doc.body || node === doc.documentElement) return null;
          return node;
        };
        const shift = (box: PickBox): PickBox => ({ ...box, x: box.x + originX });
        const onMove = (event: MouseEvent) => {
          const target = targetOf(event);
          setHoverBox(target ? shift(boxOf(target)) : null);
        };
        const onLeave = () => setHoverBox(null);
        const onDown = (event: MouseEvent) => {
          // Block the prototype's own handlers for the duration of the pick,
          // including empty frame areas that pick the whole frame.
          event.preventDefault();
          event.stopPropagation();
        };
        const onClick = (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          const target = targetOf(event);
          if (!target) {
            // Empty frame area: the whole frame becomes the context.
            setPicked({
              label: `Frame: ${frame.title}`,
              text: frame.subtitle,
              box: { x: originX, y: 0, w: FRAME_W, h: FRAME_H },
              session: pickSession,
            });
            setHoverBox(null);
            return;
          }
          const { label, text } = describeElement(target);
          setPicked({ label, text, box: shift(boxOf(target)), session: pickSession });
          setHoverBox(null);
        };
        const onSubmit = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
        };
        // Crosshair inside frames, but only while picking is armed. The
        // effect rebinds when picking toggles, so the override never
        // lingers after the mode is off.
        const cursorStyle = picking ? doc.createElement("style") : null;
        if (cursorStyle) {
          cursorStyle.textContent =
            "*, *::before, *::after { cursor: crosshair !important; }";
          doc.head.appendChild(cursorStyle);
        }
        if (picking) {
          doc.addEventListener("mousemove", onMove, true);
          doc.addEventListener("mouseleave", onLeave, true);
          doc.addEventListener("mousedown", onDown, true);
          doc.addEventListener("click", onClick, true);
          doc.addEventListener("submit", onSubmit, true);
        }
        unbind = () => {
          baseUnbind();
          cursorStyle?.remove();
          doc.removeEventListener("mousemove", onMove, true);
          doc.removeEventListener("mouseleave", onLeave, true);
          doc.removeEventListener("mousedown", onDown, true);
          doc.removeEventListener("click", onClick, true);
          doc.removeEventListener("submit", onSubmit, true);
        };
      };
      if (el.contentDocument?.readyState === "complete") bind();
      el.addEventListener("load", bind);
      cleanups.push(() => {
        el.removeEventListener("load", bind);
        unbind?.();
      });
    });
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
    // Rebind when frame HTML swaps; origins come from the same order.
    // applyWheel is stable, so it never rebuilds the bindings on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framesKey, picking, pickSession, applyWheel]);

  // Escape backs out one level: the comment card first, then the mode.
  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (picked && picked.session === pickSession) {
        setPicked(null);
        return;
      }
      onPickingChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, picked, pickSession, onPickingChange]);

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

  // Right edge of the frame row, mirrored for fit without re-centering
  // on every generation.
  const framesEnd =
    frames.length > 0 ? frameLeft(frames.length - 1) + FRAME_W : FRAME_W;
  const framesEndRef = useRef(framesEnd);
  useEffect(() => {
    framesEndRef.current = framesEnd;
  }, [framesEnd]);
  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    let minX = 0;
    let minY = 0;
    let maxX = framesEndRef.current;
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

  // First paint only: center the frame row.
  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar jumps: center the canvas on one frame when asked. Bump seq
  // to revisit the same frame twice in a row.
  const lastFocusSeq = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest.seq === lastFocusSeq.current) return;
    lastFocusSeq.current = focusRequest.seq;
    const index = frames.findIndex((frame) => frame.id === focusRequest.id);
    if (index < 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const pad = 72;
    const k = Math.min(
      1.5,
      rect.width / (FRAME_W + pad * 2),
      rect.height / (FRAME_H + pad * 2),
    );
    setTransform({
      k,
      x: rect.width / 2 - (frameLeft(index) + FRAME_W / 2) * k,
      y: rect.height / 2 - (FRAME_H / 2) * k,
    });
  }, [focusRequest, frames]);

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

  const resetZoom = useCallback(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    if (!rect) return;
    setTransform((prev) => {
      const cx = (rect.width / 2 - prev.x) / prev.k;
      const cy = (rect.height / 2 - prev.y) / prev.k;
      return { k: 1, x: rect.width / 2 - cx, y: rect.height / 2 - cy };
    });
  }, []);

  // React attaches wheel as passive, so this needs a non-passive listener
  // to preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      applyWheel(event);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyWheel]);

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
        setSelectedId(null);
      }
    },
    [editingId, eraseAt, toScene, tool, selectedId],
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
        setSelectedId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editingId, selectedId, commitDraft]);

  const cursor = useMemo(() => {
    if (picking) return "crosshair";
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
  }, [picking, tool, panning]);

  const gridSize = transform.k * GRID;
  const gridX = ((transform.x % gridSize) + gridSize) % gridSize;
  const gridY = ((transform.y % gridSize) + gridSize) % gridSize;
  // A coarser grid every five cells adds depth without adding noise.
  const majorSize = gridSize * 5;
  const gridXMajor = ((transform.x % majorSize) + majorSize) % majorSize;
  const gridYMajor = ((transform.y % majorSize) + majorSize) % majorSize;

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

  // Picks from an earlier arming never resurface.
  const activePick = picked && picked.session === pickSession ? picked : null;
  // The hover box wins until a component is picked.
  const pickBox = activePick?.box ?? hoverBox;
  // The comment card sits under the picked element, flipping above it when
  // the chat drawer would cover it. Kept inside the canvas either way.
  const card = useMemo(() => {
    if (!activePick) return null;
    const height = 172;
    const gap = 10;
    const margin = 12;
    const width = Math.min(320, Math.max(220, viewport.w - margin * 2));
    const left = Math.min(
      Math.max(margin, transform.x + activePick.box.x * transform.k),
      Math.max(margin, viewport.w - width - margin),
    );
    const below =
      transform.y + (activePick.box.y + activePick.box.h) * transform.k + gap;
    const above = transform.y + activePick.box.y * transform.k - height - gap;
    const maxTop = Math.max(margin, viewport.h - bottomInset - height - margin);
    const top =
      below <= maxTop ? below : Math.min(Math.max(margin, above), maxTop);
    return { left, top, width };
  }, [activePick, transform, viewport, bottomInset]);

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
            "radial-gradient(circle, rgba(255,255,255,0.13) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: `${majorSize}px ${majorSize}px, ${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridXMajor}px ${gridYMajor}px, ${gridX}px ${gridY}px`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.5)_100%)]"
      />

      {/* World: pan + zoom. */}
      <div
        aria-hidden={false}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        }}
      >
        {/* Frames share one canvas, Figma-style: the design system first,
            then a frame per planned page, then the suggestion card. Iframes
            stay interactive (same-origin) so the component picker can read
            and highlight the elements inside them; canvas gestures start
            from the gaps around the frames or the wheel. */}
        {frames.map((frame, index) =>
          frame.html || frame.src ? (
            <div
              key={frame.id}
              className="absolute"
              style={{ left: frameLeft(index), top: 0, width: FRAME_W, height: FRAME_H }}
            >
              <div
                role={picking ? "button" : undefined}
                tabIndex={picking ? 0 : undefined}
                aria-label={picking ? `Pick the ${frame.title} frame` : undefined}
                onPointerDown={
                  picking
                    ? (event) => {
                        event.stopPropagation();
                      }
                    : undefined
                }
                onClick={
                  picking
                    ? (event) => {
                        event.stopPropagation();
                        setPicked({
                          label: `Frame: ${frame.title}`,
                          text: frame.subtitle,
                          box: {
                            x: frameLeft(index),
                            y: 0,
                            w: FRAME_W,
                            h: FRAME_H,
                          },
                          session: pickSession,
                        });
                        setHoverBox(null);
                      }
                    : undefined
                }
                onKeyDown={
                  picking
                    ? (event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        setPicked({
                          label: `Frame: ${frame.title}`,
                          text: frame.subtitle,
                          box: {
                            x: frameLeft(index),
                            y: 0,
                            w: FRAME_W,
                            h: FRAME_H,
                          },
                          session: pickSession,
                        });
                        setHoverBox(null);
                      }
                    : undefined
                }
                className={`absolute -top-9 left-0 flex items-center gap-2 whitespace-nowrap ${
                  picking
                    ? "cursor-crosshair rounded-lg px-1 hover:bg-white/5"
                    : "pointer-events-none"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#c9cdd6]">
                  <svg
                    aria-hidden
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#8ab4ff]"
                  >
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <path d="M3.5 9h17" />
                  </svg>
                  {frame.title}
                </span>
                <span aria-hidden className="h-3 w-px bg-white/15" />
                <span className="font-mono text-[11px] tabular-nums text-[#5b6472]">
                  {frame.subtitle}
                </span>
              </div>
              <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.45),0_20px_50px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
                <iframe
                  ref={(el) => {
                    if (el) iframeRefs.current.set(frame.id, el);
                    else iframeRefs.current.delete(frame.id);
                  }}
                  title={frame.title}
                  {...(frame.src
                    ? { src: frame.src }
                    : { srcDoc: frame.html ?? "" })}
                  sandbox="allow-scripts allow-same-origin"
                  tabIndex={-1}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : frame.busy ? (
            <GeneratingCard
              key={frame.id}
              left={frameLeft(index)}
              title={frame.title}
            />
          ) : null,
        )}

        {/* Pick highlight, drawn in frame space so it tracks pan and zoom. */}
        {picking && pickBox && (
          <div
            aria-hidden
            className="pointer-events-none absolute border-2 border-[#8ab4ff] bg-[#8ab4ff]/10"
            style={{
              left: pickBox.x,
              top: pickBox.y,
              width: pickBox.w,
              height: pickBox.h,
            }}
          />
        )}

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

      {/* Change request for the picked component. The quote lands in the
          chat input and never sends on its own, so picks stack. */}
      {picking && activePick && card && (
        <ChangeCard
          key={`${activePick.session}:${activePick.label}:${activePick.box.x}:${activePick.box.y}`}
          label={activePick.label}
          text={activePick.text}
          left={card.left}
          top={card.top}
          width={card.width}
          onAdd={(note) => {
            onQuoteToChat({
              label: activePick.label,
              text: activePick.text,
              comment: note,
            });
            setPicked(null);
          }}
          onClose={() => setPicked(null)}
        />
      )}

      {/* Picking indicator: picking turns the cursor into a crosshair
          and swallows clicks, so the mode must be obvious and one click
          away from off. */}
      {picking && (
        <div className="absolute left-3 top-3 z-10">
          <div
            className="flex items-center gap-2 rounded-2xl border border-[#8ab4ff]/40 bg-[#17181d]/95 py-1.5 pl-3 pr-1.5 shadow-xl"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#c9cdd6]">
              <svg
                aria-hidden
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#8ab4ff]"
              >
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              Picking — click a component or a frame
            </span>
            <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#9aa0ae]">
              Esc
            </kbd>
            <button
              type="button"
              onClick={() => onPickingChange(false)}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Stop picking"
              title="Stop picking"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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
        </div>
      )}

      <CanvasChrome
        tool={tool}
        onTool={(next) => {
          if (editingId) commitDraft();
          setTool(next);
        }}
        zoom={transform.k}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(1 / 1.25)}
        onResetZoom={resetZoom}
        onFit={fitToScreen}
      />
    </div>
  );
}
