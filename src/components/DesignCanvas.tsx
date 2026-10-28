"use client";

/**
 * tldraw canvas for one design screen. Loaded with ssr:false by the caller
 * because tldraw touches the window at import time. Snapshots are debounced
 * back to the caller, which persists them in the project store.
 */

import { useEffect, useRef } from "react";
import { Tldraw, type Editor, type TLEditorSnapshot } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

interface DesignCanvasProps {
  initialSnapshot: TLEditorSnapshot | null;
  onSnapshot: (snapshot: TLEditorSnapshot) => void;
}

export default function DesignCanvas({
  initialSnapshot,
  onSnapshot,
}: DesignCanvasProps) {
  const callbackRef = useRef(onSnapshot);
  useEffect(() => {
    callbackRef.current = onSnapshot;
  }, [onSnapshot]);
  const unlistenRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        onMount={(editor: Editor) => {
          // Match the MuseVibe dark workspace. User prefs live in the
          // editor, so this only needs to run once per canvas mount.
          try {
            editor.user.updateUserPreferences({ colorScheme: "dark" });
          } catch {
            // A canvas that stays light is still usable.
          }
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
