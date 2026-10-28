"use client";

/**
 * The plan overview canvas: one artboard per plan document (brief, tasks,
 * generated docs), laid out left to right. Selecting a board opens it in
 * the editor; the canvas itself stays a visual map, so its snapshot only
 * carries geometry plus the rendered excerpts.
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
import type { BoardSpec } from "@/lib/boardHtml";

const BOARD_PREFIX = "shape:board-";

interface PlanCanvasProps {
  initialSnapshot: TLEditorSnapshot | null;
  boards: BoardSpec[];
  status: string;
  onOpenBoard: (key: string) => void;
  onSnapshot: (snapshot: TLEditorSnapshot) => void;
}

function syncBoards(editor: Editor, boards: BoardSpec[]) {
  try {
    for (const board of boards) {
      const existing = editor.getShape(board.id as TLShapeId);
      if (!existing) {
        editor.createShape({
          id: board.id as TLShapeId,
          type: "html-prototype",
          x: board.x,
          y: board.y,
          props: { html: board.html, w: board.w, h: board.h },
        });
      } else if (
        existing.type === "html-prototype" &&
        (existing.props as { html?: unknown }).html !== board.html
      ) {
        editor.updateShape({
          id: existing.id,
          type: "html-prototype",
          props: { html: board.html, w: board.w, h: board.h },
        });
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
  boards,
  status,
  onOpenBoard,
  onSnapshot,
}: PlanCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const callbackRef = useRef(onSnapshot);
  const boardsRef = useRef(boards);
  const openRef = useRef(onOpenBoard);
  const unlistenRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedRef = useRef<string | null>(null);

  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);
  useEffect(() => {
    openRef.current = onOpenBoard;
  }, [onOpenBoard]);

  // Keep the boards in sync when their content changes.
  useEffect(() => {
    const instance = editor;
    if (instance && boards.length > 0) syncBoards(instance, boards);
  }, [editor, boards]);

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
          try {
            instance.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
          if (boardsRef.current.length > 0) {
            syncBoards(instance, boardsRef.current);
            if (!initialSnapshot) {
              try {
                instance.zoomToFit();
              } catch {
                // Default camera is fine.
              }
            }
          }
          unlistenRef.current = instance.store.listen(() => {
            const [selected] = instance.getSelectedShapeIds();
            if (
              typeof selected === "string" &&
              selected.startsWith(BOARD_PREFIX) &&
              selected !== openedRef.current
            ) {
              openedRef.current = selected;
              openRef.current(selected.slice(BOARD_PREFIX.length));
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
      <CanvasChrome editor={editor} status={status} />
    </div>
  );
}
