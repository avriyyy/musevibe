"use client";

/**
 * The plan canvas: one artboard per plan document, laid out in rows, with a
 * trailing board that creates a supporting note. Selecting a board opens it
 * in the editor. The canvas is uncontrolled after mount: the snapshot prop
 * only seeds the first paint, so later store writes never remount it.
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
import type { BoardSpec } from "@/lib/boardHtml";

const BOARD_PREFIX = "shape:board-";

interface PlanCanvasProps {
  /** Snapshot used only to seed the first paint, never re-fed afterwards. */
  initialSnapshot: TLEditorSnapshot | null;
  ready: boolean;
  boards: BoardSpec[];
  onOpenBoard: (key: string) => void;
  onSnapshot: (snapshot: TLEditorSnapshot) => void;
}

function syncBoards(editor: Editor, boards: BoardSpec[]) {
  try {
    for (const board of boards) {
      const shapeId = board.id as TLShapeId;
      const existing = editor.getShape(shapeId);
      const props = {
        html: board.html,
        w: board.w,
        h: board.h,
        title: board.title,
        slug: board.slug,
      };
      if (!existing) {
        editor.createShape({
          id: shapeId,
          type: "html-prototype",
          x: board.x,
          y: board.y,
          props,
        });
      } else if (existing.type === "html-prototype") {
        const current = (existing.props as Record<string, unknown>) ?? {};
        if (
          current.html !== props.html ||
          current.w !== props.w ||
          current.h !== props.h ||
          (current as Record<string, unknown>).title !== props.title ||
          (current as Record<string, unknown>).slug !== props.slug
        ) {
          editor.updateShape({ id: existing.id, type: "html-prototype", props });
        }
      }
    }
    // Drop boards whose document was deleted.
    const wanted = new Set(boards.map((board) => board.id));
    for (const shape of editor.getCurrentPageShapes()) {
      if (
        shape.type === "html-prototype" &&
        shape.id.startsWith(BOARD_PREFIX) &&
        !wanted.has(shape.id)
      ) {
        editor.deleteShape(shape.id);
      }
    }
  } catch {
    // A canvas that cannot host the boards still works as a drawing surface.
  }
}

export default function PlanCanvas({
  initialSnapshot,
  ready,
  boards,
  onOpenBoard,
  onSnapshot,
}: PlanCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const callbackRef = useRef(onSnapshot);
  const boardsRef = useRef(boards);
  const openRef = useRef(onOpenBoard);
  const snapshotRef = useRef<TLEditorSnapshot | null>(initialSnapshot);
  const unlistenRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef<string | null>(null);
  const paintedRef = useRef(false);
  const touchedRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);
  useEffect(() => {
    openRef.current = onOpenBoard;
  }, [onOpenBoard]);
  useEffect(() => {
    // Keep the latest snapshot for the one-time seeding below.
    if (initialSnapshot) snapshotRef.current = initialSnapshot;
  }, [initialSnapshot]);

  // First paint only: load the saved snapshot when the store has one and
  // the user has not drawn anything yet, otherwise lay out fresh boards and
  // fit them in view. Later store updates never touch the live canvas, so a
  // save echo can never remount it.
  useEffect(() => {
    if (!editor || !ready || paintedRef.current) return;
    paintedRef.current = true;
    const snap = snapshotRef.current;
    if (snap && !touchedRef.current) {
      try {
        editor.loadSnapshot(snap);
      } catch {
        // A snapshot that will not load is replaced by fresh boards below.
        syncBoards(editor, boardsRef.current);
        try {
          editor.zoomToFit();
        } catch {
          // Default camera is fine.
        }
        return;
      }
      const selected = editor.getSelectedShapeIds()[0];
      settledRef.current = typeof selected === "string" ? selected : null;
    }
    syncBoards(editor, boardsRef.current);
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
      settledRef.current = null;
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
          try {
            instance.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
          unlistenRef.current = instance.store.listen(() => {
            touchedRef.current = true;
            const [selected] = instance.getSelectedShapeIds();
            if (typeof selected === "string" && selected.startsWith(BOARD_PREFIX)) {
              if (selected !== settledRef.current) {
                settledRef.current = selected;
                openRef.current(selected.slice(BOARD_PREFIX.length));
              }
              return;
            }
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
