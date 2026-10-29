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
  /** Documents picks inside the rendered doc, tasks picks whole cards. */
  scope: "documents" | "tasks";
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
  scope,
  picking,
  pickSession,
  bottomInset,
  onQuoteToChat,
  onPickingChange,
}: WorkspacePickerProps) {
  const [hover, setHover] = useState<PickBox | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const pickedElRef = useRef<Element | null>(null);
  // The listeners read the scope instead of closing over it, so switching
  // tabs does not rebuild them and the effect keeps one dependency list.
  const scopeRef = useRef(scope);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !picking) return;
    // Documents only allow the rendered markdown, tasks only whole cards.
    // Anything else in the view is not a component for this tab.
    const targetOf = (event: Event) => {
      const node = event.target as Node | null;
      if (!node || node.nodeType !== 1) return null;
      const el = node as Element;
      if (!root.contains(el)) return null;
      if (scopeRef.current === "tasks") {
        return el.closest("[data-pick-card]");
      }
      const doc = el.closest("[data-pick-scope]");
      if (!doc) return null;
      return el === doc ? null : el;
    };
    // Swallow every click in the view while picking, so a stray click on a
    // doc row or a column cannot change what is on screen mid-pick.
    const block = (event: MouseEvent) => {
      const node = event.target as Node | null;
      if (!node || node.nodeType !== 1) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const onMove = (event: MouseEvent) => {
      const el = targetOf(event);
      setHover(el ? boxOf(el) : null);
    };
    const onLeave = () => setHover(null);
    const onClick = (event: MouseEvent) => {
      block(event);
      const el = targetOf(event);
      if (!el) return;
      const { label, text } = describeElement(el, false);
      pickedElRef.current = el;
      setPicked({ label, text, box: boxOf(el), session: pickSession });
      setHover(null);
    };
    root.addEventListener("mousemove", onMove, true);
    root.addEventListener("mouseleave", onLeave, true);
    root.addEventListener("mousedown", block, true);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("mousemove", onMove, true);
      root.removeEventListener("mouseleave", onLeave, true);
      root.removeEventListener("mousedown", block, true);
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
