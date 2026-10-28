"use client";

/**
 * Design canvas on Excalidraw (MIT licensed: no license key, no watermark).
 * The generated prototype.html lives on the canvas as an embeddable frame
 * rendered through renderEmbeddable as a live iframe, so it pans and zooms
 * with everything else. The canvas is uncontrolled after mount: the elements
 * prop only seeds the first paint, so later store writes never remount it.
 * Element edits are debounced back to the caller and persisted in the store.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw, restoreElements } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawEmbeddableElement,
} from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import CanvasChrome from "./CanvasChrome";

const FRAME_ID = "musevibe-prototype";
const FRAME_LINK = "https://musevibe.local/prototype";
const FRAME_W = 960;
const FRAME_H = 640;

interface DesignCanvasProps {
  /** Elements used only to seed the first paint, never re-fed afterwards. */
  initialElements: readonly ExcalidrawElement[] | null;
  /** Current prototype.html content; the frame re-renders when it changes. */
  html: string;
  onElements: (elementsJson: string) => void;
}

/** A fixed embeddable element that hosts the prototype iframe. */
function frameSkeleton(x = 0, y = 0) {
  return {
    id: FRAME_ID,
    type: "embeddable",
    x,
    y,
    width: FRAME_W,
    height: FRAME_H,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roundness: null,
    roughness: 0,
    opacity: 100,
    seed: 20261028,
    version: 1,
    versionNonce: 20261028,
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: 1,
    link: FRAME_LINK,
    locked: false,
    customData: { musevibe: "prototype-frame" },
  };
}

/** A fresh canvas: only the prototype frame, normalized by Excalidraw. */
function freshElements() {
  try {
    return restoreElements(
      [frameSkeleton(0, 0)] as unknown as ExcalidrawElement[],
      null,
    );
  } catch {
    return null;
  }
}

/** Old tldraw snapshots and corrupt payloads restart as a fresh canvas. */
function coerceElements(raw: readonly ExcalidrawElement[] | null) {
  if (!Array.isArray(raw)) return null;
  const kept = raw.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string" &&
      typeof (entry as { type?: unknown }).type === "string" &&
      (entry as { id?: string }).id !== FRAME_ID,
  );
  if (kept.length !== raw.length && kept.length === 0 && raw.length > 0) {
    return null;
  }
  const previous = (
    raw as readonly { id?: unknown; x?: unknown; y?: unknown }[]
  ).find((entry) => entry?.id === FRAME_ID);
  const px = typeof previous?.x === "number" ? previous.x : 0;
  const py = typeof previous?.y === "number" ? previous.y : 0;
  try {
    return restoreElements(
      [frameSkeleton(px, py), ...kept] as unknown as ExcalidrawElement[],
      null,
    );
  } catch {
    return null;
  }
}

export default function DesignCanvas({
  initialElements,
  html,
  onElements,
}: DesignCanvasProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [tool, setTool] = useState("selection");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const htmlRef = useRef(html);
  const callbackRef = useRef(onElements);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onElements;
  }, [onElements]);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  // Re-render the prototype iframe when a regeneration replaces the file.
  // Bumping the frame's version forces Excalidraw to call renderEmbeddable
  // again; every other element is passed through untouched.
  useEffect(() => {
    const instance = apiRef.current;
    if (!instance || !html) return;
    try {
      const current = instance.getSceneElements();
      if (!current.some((entry) => entry.id === FRAME_ID)) return;
      instance.updateScene({
        elements: current.map((entry) =>
          entry.id === FRAME_ID
            ? {
                ...entry,
                version: entry.version + 1,
                versionNonce: Math.floor(Math.random() * 2 ** 31),
                updated: Date.now(),
              }
            : entry,
        ),
      });
    } catch {
      // A frame that will not refresh still shows the previous render.
    }
  }, [html, api]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const initialData = useMemo(() => {
    const restored = coerceElements(initialElements) ?? freshElements();
    return {
      elements: restored ?? undefined,
      appState: { viewBackgroundColor: "#0b0c10" },
      scrollToContent: true,
    };
    // Seeds the first paint only; later element updates flow through
    // onElements instead of re-seeding the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPrototype = (element: ExcalidrawEmbeddableElement) => {
    if (element?.id !== FRAME_ID) return null;
    return (
      <div className="relative h-full w-full">
        <iframe
          title="Prototype"
          srcDoc={htmlRef.current}
          sandbox="allow-scripts"
          className="h-full w-full rounded-xl border border-white/15 bg-white"
        />
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white/90">
          Prototype · /
        </p>
      </div>
    );
  };

  return (
    <div className="musevibe-design relative h-full w-full">
      <Excalidraw
        excalidrawAPI={(instance) => {
          setApi(instance);
          apiRef.current = instance;
        }}
        initialData={initialData}
        theme="dark"
        zenModeEnabled
        validateEmbeddable={() => true}
        renderEmbeddable={renderPrototype}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
        }}
        onChange={(elements, appState) => {
          const next = appState.activeTool?.type;
          if (typeof next === "string") {
            setTool((previous) => (previous === next ? previous : next));
          }
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            try {
              callbackRef.current(
                JSON.stringify({ version: 1, elements }),
              );
            } catch {
              // Elements that will not serialize are not worth keeping.
            }
          }, 800);
        }}
      />
      <CanvasChrome api={api} tool={tool} />
    </div>
  );
}
