"use client";

/**
 * tldraw canvas for one design screen. Loaded with ssr:false by the caller
 * because tldraw touches the window at import time. The canvas is
 * uncontrolled after mount: the snapshot prop only seeds the first paint,
 * so later store writes never remount it. Snapshots are debounced back to
 * the caller, which persists them in the project store. The stock tldraw UI
 * is hidden in favor of the shared canvas chrome.
 */

import { useEffect, useRef, useState } from "react";
import {
  Tldraw,
  type Editor,
  type TLEditorSnapshot,
  type TLShapeId,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { HTML_SHAPE_UTILS } from "./HtmlShape";
import CanvasChrome from "./CanvasChrome";

const PROTOTYPE_SHAPE_ID = "shape:html-prototype" as TLShapeId;

interface DesignCanvasProps {
  /** Snapshot used only to seed the first paint, never re-fed afterwards. */
  initialSnapshot: TLEditorSnapshot | null;
  ready: boolean;
  /** Current prototype.html content; the canvas keeps one shape in sync. */
  html: string;
  onSnapshot: (snapshot: TLEditorSnapshot) => void;
}

function syncPrototypeShape(editor: Editor, html: string) {
  try {
    const existing = editor.getShape(PROTOTYPE_SHAPE_ID);
    const props = {
      html,
      w: 960,
      h: 640,
      title: "Prototype",
      slug: "/",
    };
    if (!existing) {
      const viewport = editor.getViewportPageBounds();
      editor.createShape({
        id: PROTOTYPE_SHAPE_ID,
        type: "html-prototype",
        x: Math.max(0, viewport.center.x - 480),
        y: Math.max(0, viewport.center.y - 320),
        props,
      });
      return;
    }
    if (existing.type === "html-prototype") {
      const current = (existing.props as Record<string, unknown>) ?? {};
      if (
        current.html !== props.html ||
        current.w !== props.w ||
        current.h !== props.h ||
        current.title !== props.title ||
        current.slug !== props.slug
      ) {
        editor.updateShape({
          id: existing.id,
          type: "html-prototype",
          props,
        });
      }
    }
  } catch {
    // A canvas that cannot host the prototype still works as a drawing board.
  }
}

export default function DesignCanvas({
  initialSnapshot,
  ready,
  html,
  onSnapshot,
}: DesignCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const callbackRef = useRef(onSnapshot);
  const htmlRef = useRef(html);
  const editorRef = useRef<Editor | null>(null);
  const snapshotRef = useRef<TLEditorSnapshot | null>(initialSnapshot);
  const unlistenRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paintedRef = useRef(false);
  const touchedRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);
  useEffect(() => {
    if (initialSnapshot) snapshotRef.current = initialSnapshot;
  }, [initialSnapshot]);

  // Keep the prototype shape in sync when a regeneration replaces the file.
  useEffect(() => {
    const instance = editorRef.current;
    if (instance && html) syncPrototypeShape(instance, html);
  }, [html]);

  // First paint only: load the saved snapshot when the store has one and
  // the user has not drawn anything yet. Later store updates never touch
  // the live canvas, so a save echo can never remount it.
  useEffect(() => {
    if (!editor || !ready || paintedRef.current) return;
    paintedRef.current = true;
    const snap = snapshotRef.current;
    if (snap && !touchedRef.current) {
      try {
        editor.loadSnapshot(snap);
      } catch {
        // A snapshot that will not load is simply skipped.
      }
    }
    const pending = htmlRef.current;
    if (pending) syncPrototypeShape(editor, pending);
    if (!snap) {
      try {
        editor.zoomToFit();
      } catch {
        // Default camera is fine.
      }
    }
  }, [editor, ready]);

  useEffect(
    () => () => {
      unlistenRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
      paintedRef.current = false;
      touchedRef.current = false;
    },
    [],
  );

  return (
    <div className="relative h-full w-full">
      <Tldraw
        shapeUtils={HTML_SHAPE_UTILS}
        hideUi
        onMount={(instance: Editor) => {
          setEditor(instance);
          editorRef.current = instance;
          try {
            instance.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
          unlistenRef.current = instance.store.listen(() => {
            touchedRef.current = true;
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
      <CanvasChrome editor={editor} />
    </div>
  );
}
