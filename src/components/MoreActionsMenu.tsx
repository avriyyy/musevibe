"use client";

import { useEffect, useRef, useState } from "react";

export interface MoreAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export default function MoreActionsMenu({
  label,
  actions,
  disabled = false,
}: {
  label: string;
  actions: MoreAction[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-menu`}
        title={label}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-[#c9cdd6] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] disabled:cursor-not-allowed disabled:opacity-40 md:size-9"
      >
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      {open && (
        <div
          id={`${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-menu`}
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-1.5 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[13px] text-[#e8ebf0] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff] disabled:cursor-not-allowed disabled:text-[#5b6472] md:min-h-9"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
