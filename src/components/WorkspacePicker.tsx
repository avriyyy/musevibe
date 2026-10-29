"use client";

/**
 * Component picker for the Documents and Tasks tabs. While armed it
 * highlights whatever sits under the cursor inside the main view and turns
 * a click into a change request, without letting the click run the app.
 * The Design tab has its own picker bound to the prototype frame.
 */

import { useEffect, useRef, useState } from "react";
import ChangeCard from "./ChangeCard";
import { boxOf, describeElement, quoteFor, type PickBox } from "@/lib/pick";

interface WorkspacePickerProps {
  /** The view the picker is allowed to touch. */
  rootRef: React.RefObject<HTMLElement | null>;
  picking: boolean;
  /** Bumped on every arm so a previous pick never resurfaces. */
  pickSession: number;
  /** Height covered by the chat drawer, kept clear of the card. */
  bottomInset: number;
  onQuoteToChat: (text: string) => void;
  onPickingChange: (picking: boolean) => void;
}

interface Picked {
  label: string;
  text: string;
  box: PickBox;
  session: number;
}

export default function WorkspacePicker({
  rootRef,
  picking,
  pickSession,
  bottomInset,
  onQuoteToChat,
  onPickingChange,
}: WorkspacePickerProps) {
  const [hover, setHover] = useState<PickBox | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const pickedElRef = useRef<Element | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !picking) return;
    const targetOf = (event: Event) => {
      const node = event.target as Node | null;
      if (!node || node.nodeType !== 1) return null;
      const el = node as Element;
      if (el === root) return null;
      return el;
    };
    // A click on an icon or a label span should quote the control it
    // belongs to, not the anonymous span.
    const settle = (el: Element) => {
      let node = el;
      for (let depth = 0; depth < 3; depth += 1) {
        const parent = node.parentElement;
        if (!parent || parent === root) break;
        if (!parent.matches("button, a, [role='button'], [role='link'], li")) break;
        node = parent;
      }
      return node;
    };
    const onMove = (event: MouseEvent) => {
      const el = targetOf(event);
      setHover(el ? boxOf(settle(el)) : null);
    };
    const onLeave = () => setHover(null);
    const onDown = (event: MouseEvent) => {
      if (!targetOf(event)) return;
      // A pick must not open documents, tasks, or links.
      event.preventDefault();
      event.stopPropagation();
    };
    const onClick = (event: MouseEvent) => {
      const hit = targetOf(event);
      if (!hit) return;
      event.preventDefault();
      event.stopPropagation();
      const el = settle(hit);
      const { label, text } = describeElement(el, false);
      pickedElRef.current = el;
      setPicked({ label, text, box: boxOf(el), session: pickSession });
      setHover(null);
    };
    root.addEventListener("mousemove", onMove, true);
    root.addEventListener("mouseleave", onLeave, true);
    root.addEventListener("mousedown", onDown, true);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("mousemove", onMove, true);
      root.removeEventListener("mouseleave", onLeave, true);
      root.removeEventListener("mousedown", onDown, true);
      root.removeEventListener("click", onClick, true);
    };
  }, [picking, pickSession, rootRef]);

  // The picked element can move under its card (document scroll, resize);
  // keep the box attached to it instead of letting it drift.
  useEffect(() => {
    if (!picking) return;
    const sync = () => {
      const el = pickedElRef.current;
      if (!el) return;
      if (!el.isConnected) {
        pickedElRef.current = null;
        setPicked(null);
        return;
      }
      setPicked((prev) => (prev ? { ...prev, box: boxOf(el) } : prev));
    };
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [picking]);

  // Escape backs out one level: the card first, then the mode.
  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (picked) {
        pickedElRef.current = null;
        setPicked(null);
        return;
      }
      onPickingChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, picked, onPickingChange]);

  const activePick =
    picked && picked.session === pickSession ? picked : null;
  const hoverBox = picking && !activePick ? hover : null;

  if (!picking) return null;

  const margin = 12;
  const width = Math.min(320, Math.max(220, window.innerWidth - margin * 2));
  const height = 172;
  const gap = 10;
  const left = activePick
    ? Math.min(
        Math.max(margin, activePick.box.x),
        Math.max(margin, window.innerWidth - width - margin),
      )
    : 0;
  const below = activePick ? activePick.box.y + activePick.box.h + gap : 0;
  const maxTop = Math.max(
    margin,
    window.innerHeight - bottomInset - height - margin,
  );
  const top = activePick
    ? below <= maxTop
      ? below
      : Math.max(margin, Math.min(activePick.box.y - height - gap, maxTop))
    : 0;

  return (
    <>
      {hoverBox && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-lg border-2 border-[#8ab4ff] bg-[#8ab4ff]/10"
          style={{
            left: hoverBox.x,
            top: hoverBox.y,
            width: hoverBox.w,
            height: hoverBox.h,
          }}
        />
      )}
      {activePick && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed z-40 rounded-lg border-2 border-[#8ab4ff] bg-[#8ab4ff]/10"
            style={{
              left: activePick.box.x,
              top: activePick.box.y,
              width: activePick.box.w,
              height: activePick.box.h,
            }}
          />
          <ChangeCard
            key={`${activePick.session}:${activePick.label}:${activePick.box.x}:${activePick.box.y}`}
            fixed
            label={activePick.label}
            text={activePick.text}
            left={left}
            top={top}
            width={width}
            onAdd={(note) => {
              onQuoteToChat(quoteFor(activePick.label, activePick.text, note));
              pickedElRef.current = null;
              setPicked(null);
            }}
            onClose={() => {
              pickedElRef.current = null;
              setPicked(null);
            }}
          />
        </>
      )}
    </>
  );
}
