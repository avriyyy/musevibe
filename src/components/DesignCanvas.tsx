"use client";

/**
 * tldraw canvas for one design screen. Loaded with ssr:false by the caller
 * because tldraw touches the window at import time. Snapshots are debounced
 * back to the caller, which persists them in the project store.
 */

import { useEffect, useRef } from "react";
import {
  Tldraw,
  type Editor,
  type TLEditorSnapshot,
  type TLShapeId,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { HtmlPrototypeShapeUtil } from "./HtmlShape";

const PROTOTYPE_SHAPE_ID = "shape:html-prototype" as TLShapeId;

interface DesignCanvasProps {
  initialSnapshot: TLEditorSnapshot | null;
  /** Current prototype.html content; the canvas keeps one shape in sync. */
  html: string;
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
    const current =
      existing.type === "html-prototype"
        ? (existing.props as { html?: unknown }).html
        : null;
    if (typeof current === "string" && current !== html) {
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
  onSnapshot,
}: DesignCanvasProps) {
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
    const editor = editorRef.current;
    if (editor && html) syncPrototypeShape(editor, html);
  }, [html]);

  useEffect(
    () => () => {
      unlistenRef.current?.();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div className="h-full w-full">
      <Tldraw
        snapshot={initialSnapshot ?? undefined}
        shapeUtils={[HtmlPrototypeShapeUtil]}
        onMount={(editor: Editor) => {
          editorRef.current = editor;
          // Match the MuseVibe dark workspace. User prefs live in the
          // editor, so this only needs to run once per canvas mount.
          try {
            editor.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
          const pending = htmlRef.current;
          if (pending) syncPrototypeShape(editor, pending);
          unlistenRef.current = editor.store.listen(() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
              try {
                callbackRef.current(editor.getSnapshot());
              } catch {
                // A snapshot that will not serialize is not worth keeping.
              }
            }, 800);
          });
        }}
      />
    </div>
  );
}
