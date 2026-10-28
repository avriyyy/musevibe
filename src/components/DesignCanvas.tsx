"use client";

/**
 * tldraw canvas for one design screen. Loaded with ssr:false by the caller
 * because tldraw touches the window at import time. Snapshots are debounced
 * back to the caller, which persists them in the project store. The stock
 * tldraw UI is hidden in favor of the shared canvas chrome so the plan and
 * design canvases read as one workspace.
 */

import { useEffect, useRef, useState } from "react";
import {
  Tldraw,
  type Editor,
  type TLEditorSnapshot,
  type TLShapeId,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { HtmlPrototypeShapeUtil } from "./HtmlShape";
import CanvasChrome from "./CanvasChrome";

const PROTOTYPE_SHAPE_ID = "shape:html-prototype" as TLShapeId;

interface DesignCanvasProps {
  initialSnapshot: TLEditorSnapshot | null;
  /** Current prototype.html content; the canvas keeps one shape in sync. */
  html: string;
  status: string;
  onSnapshot: (snapshot: TLEditorSnapshot) => void;
}

function syncPrototypeShape(editor: Editor, html: string) {
  try {
    const existing = editor.getShape(PROTOTYPE_SHAPE_ID);
    if (!existing) {
      const viewport = editor.getViewportPageBounds();
      editor.createShape({
        id: PROTOTYPE_SHAPE_ID,
        type: "html-prototype",
        x: Math.max(0, viewport.center.x - 480),
        y: Math.max(0, viewport.center.y - 320),
        props: { html, w: 960, h: 640 },
      });
      return;
    }
    if (
      existing.type === "html-prototype" &&
      (existing.props as { html?: unknown }).html !== html
    ) {
      editor.updateShape({
        id: existing.id,
        type: "html-prototype",
        props: { html },
      });
    }
  } catch {
    // A canvas that cannot host the prototype still works as a drawing board.
  }
}

export default function DesignCanvas({
  initialSnapshot,
  html,
  status,
  onSnapshot,
}: DesignCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const callbackRef = useRef(onSnapshot);
  const htmlRef = useRef(html);
  const editorRef = useRef<Editor | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  useEffect(() => {
    const instance = editorRef.current;
    if (instance && html) syncPrototypeShape(instance, html);
  }, [html]);

  useEffect(
    () => () => {
      unlistenRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className="relative h-full w-full">
      <Tldraw
        snapshot={initialSnapshot ?? undefined}
        shapeUtils={[HtmlPrototypeShapeUtil]}
        hideUi
        onMount={(instance: Editor) => {
          setEditor(instance);
          editorRef.current = instance;
          // Match the MuseVibe dark workspace. User prefs live in the
          // editor, so this only needs to run once per canvas mount.
          try {
            instance.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
          const pending = htmlRef.current;
          if (pending) syncPrototypeShape(instance, pending);
          unlistenRef.current = instance.store.listen(() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              try {
                callbackRef.current(instance.getSnapshot());
              } catch {
                // A snapshot that will not serialize is not worth keeping.
              }
            }, 800);
          });
        }}
      />
      <CanvasChrome editor={editor} status={status} />
    </div>
  );
}
