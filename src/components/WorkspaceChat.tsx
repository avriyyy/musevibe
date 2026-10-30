"use client";

/**
 * Floating workspace command bar: a bottom-edge drawer tab that slides
 * upward into a wide composer. It is action-only, never a chatbot: every
 * prompt runs as workspace actions and answers with a one-line receipt.
 * Dark pills and white accents match the workspace chrome.
 */

import { useEffect, useRef, useState } from "react";
import { blobToWav } from "@/lib/audio";
import {
  FALLBACK_MODELS,
  formatModelLabel,
  type AiModelOption,
} from "@/lib/models";
import { useVibe } from "@/lib/store";
import type { Project } from "@/lib/types";
import type { ChatQuote } from "@/lib/pick";

interface WorkspaceChatProps {
  project: Project;
  onHeightChange?: (height: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quoted selections appended as chips, newest wins. */
  draft: { id: number; quote: ChatQuote } | null;
  /** Run one prompt as workspace actions; returns the receipt to show. */
  onAction: (
    message: string,
    pins: Array<ChatQuote>,
  ) => Promise<{ ok: boolean; note: string }> ;
  onDraftConsumed?: () => void;
  /** Armed component picker, available while the design canvas is open. */
  canPick?: boolean;
  picking?: boolean;
  onTogglePick?: () => void;
}

type MicState = "idle" | "recording" | "transcribing";

export default function WorkspaceChat({
  project,
  onHeightChange,
  open,
  onOpenChange,
  draft,
  onDraftConsumed,
  canPick = false,
  picking = false,
  onTogglePick,
  onAction,
}: WorkspaceChatProps) {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<Array<{ id: number; quote: ChatQuote }>>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { tone: "working" | "done" | "error"; text: string } | null
  >(null);
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(onHeightChange);
  const pickerRef = useRef<HTMLDivElement>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [models, setModels] = useState<AiModelOption[]>(FALLBACK_MODELS);
  const [modelOpen, setModelOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const draftSeenRef = useRef<number | null>(null);

  // Latest height callback for the resize observer below.
  useEffect(() => {
    heightRef.current = onHeightChange;
  });

  // A quoted selection lands as a chip above the input (never sent
  // automatically) so several picks can stack before sending.
  useEffect(() => {
    if (!draft || draftSeenRef.current === draft.id) return;
    draftSeenRef.current = draft.id;
    onOpenChange(true);
    setChips((prev) =>
      prev.some((chip) => chip.id === draft.id)
        ? prev
        : [...prev, { id: draft.id, quote: draft.quote }],
    );
    inputRef.current?.focus();
    onDraftConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Grow the composer with the message, up to a few lines, so stacked
  // quotes keep their own line.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input, open]);

  // Discover chat models once; the curated list covers offline runs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/ai/models", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          models?: Array<{ id?: unknown; label?: unknown; hint?: unknown }>;
        };
        if (!Array.isArray(data.models)) return;
        const list = data.models
          .filter((entry) => typeof entry?.id === "string")
          .map((entry) => ({
            id: entry.id as string,
            label:
              typeof entry.label === "string"
                ? entry.label
                : formatModelLabel(entry.id as string),
            hint: typeof entry.hint === "string" ? entry.hint : "",
          }));
        if (!cancelled && list.length) setModels(list);
      } catch {
        // Offline: the curated fallback list stays.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the model menu on outside click or Escape.
  useEffect(() => {
    if (!modelOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setModelOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modelOpen]);

  const pickModel = (id: string) => {
    useVibe.getState().updateProject(project.id, { model: id });
    setModelOpen(false);
  };

  // Release the microphone when the chat unmounts mid-recording.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Report the visible height so scrollable views can pad their
  // bottom edge and no content ends up hidden behind the chat.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const report = () => heightRef.current?.(el.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  // Focus the box when opened.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, busy]);

  // One-line receipt for the last action; successes fade away on their own.
  const flashStatus = (
    tone: "working" | "done" | "error",
    text: string,
    sticky = false,
  ) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatus({ tone, text });
    if (!sticky) {
      statusTimerRef.current = setTimeout(() => setStatus(null), 5000);
    }
  };

  useEffect(
    () => () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    },
    [],
  );

  const send = async (text?: string) => {
    const typed = (text ?? input).trim();
    const pins = chips.map((chip) => ({ ...chip.quote }));
    if ((!typed && !pins.length) || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    flashStatus("working", "Working…", true);
    const sentChips = chips;
    setInput("");
    setChips([]);
    try {
      const result = await onAction(typed, pins);
      if (result.ok) {
        flashStatus("done", result.note, true);
      } else {
        flashStatus("error", result.note, true);
        setInput(typed);
        setChips(sentChips);
      }
    } catch (err) {
      flashStatus(
        "error",
        err instanceof Error ? err.message : "The chat request failed.",
        true,
      );
      setInput(typed);
      setChips(sentChips);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const transcribeClip = async (mimeType: string) => {
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 8000) {
      setMicError("Too short. Hold the mic and speak.");
      setMicState("idle");
      return;
    }
    setMicError("");
    setMicState("transcribing");
    try {
      const wav = await blobToWav(blob);
      const body = new FormData();
      body.append("audio", wav, "prompt.wav");
      const response = await fetch("/api/ai/transcribe", { method: "POST", body });
      const data = (await response.json()) as {
        transcript?: unknown;
        text?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Transcription failed.",
        );
      }
      const text =
        typeof data.transcript === "string"
          ? data.transcript.trim()
          : typeof data.text === "string"
            ? data.text.trim()
            : "";
      if (!text) {
        setMicError("Nothing heard. Try again.");
      } else {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
        inputRef.current?.focus();
      }
    } catch (err) {
      setMicError(
        err instanceof Error && err.message
          ? err.message
          : "Could not transcribe. Try again.",
      );
    } finally {
      setMicState("idle");
    }
  };

  const toggleMic = async () => {
    if (micState === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (micState === "transcribing") return;
    setMicError("");
    try {
      if (
        typeof MediaRecorder === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setMicError("This browser cannot record audio.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        void transcribeClip(recorder.mimeType);
      };
      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      setMicState("recording");
    } catch {
      setMicError("Microphone blocked. Allow access in the browser.");
    }
  };

  if (!open) {
    return (
      <div ref={shellRef} className="absolute bottom-0 left-1/2 z-40 -translate-x-1/2">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open Muse chat"
          title="Ask Muse about this project"
          className="flex h-9 items-center gap-2 rounded-b-none rounded-t-2xl border border-b-0 border-white/10 bg-[#17181d]/95 px-5 text-[13px] font-medium text-[#c9cdd6] shadow-xl hover:border-white/25 hover:text-white"
        >
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.9 5.7L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.3L12 3z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
          </svg>
          Ask Muse
          <svg
            aria-hidden
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={shellRef} className="absolute bottom-4 left-1/2 z-40 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="musevibe-sheet flex max-h-[min(560px,calc(100dvh-8rem))] flex-col gap-2">
        {/* Wide composer bar. */}
        <div
          className={`rounded-2xl border bg-[#17181d]/95 px-3 pb-2 pt-2 shadow-2xl backdrop-blur transition-colors ${
            picking ? "border-[#8ab4ff]/35" : "border-white/10"
          }`}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            {status && (
              <div
                role={status.tone === "error" ? "alert" : "status"}
                className={`flex items-center gap-2 px-1 pb-1.5 pt-1 text-[12px] ${
                  status.tone === "error"
                    ? "text-[#f0a6a6]"
                    : status.tone === "done"
                      ? "text-[#7ee2a8]"
                      : "text-[#9aa0ae]"
                }`}
              >
                {status.tone === "working" ? (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 animate-pulse rounded-full bg-white/40"
                  />
                ) : status.tone === "done" ? (
                  <svg
                    aria-hidden
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span aria-hidden className="shrink-0 font-bold">
                    !
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{status.text}</span>
                {status.tone !== "working" && (
                  <button
                    type="button"
                    onClick={() => setStatus(null)}
                    aria-label="Dismiss"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[#9aa0ae] hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      aria-hidden
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            {chips.length > 0 && (
              <div
                role="list"
                aria-label="Pinned context"
                className="flex flex-wrap gap-1.5 pb-1.5 pt-1"
              >
                {chips.map((chip) => (
                  <span
                    key={chip.id}
                    role="listitem"
                    className="group relative inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#8ab4ff]/40 bg-[#8ab4ff]/10 py-1 pl-2.5 pr-1.5"
                  >
                    <span className="min-w-0 truncate font-mono text-[11px] text-[#8ab4ff]">
                      {chip.quote.label}
                    </span>
                    {!!chip.quote.comment.trim() && (
                      <span className="min-w-0 truncate text-[11px] text-[#c9cdd6]">
                        {chip.quote.comment.trim()}
                      </span>
                    )}
                    <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden w-64 rounded-xl border border-white/15 bg-[#17181d] p-2.5 text-left shadow-2xl group-hover:block group-focus-within:block">
                      <span className="block font-mono text-[11px] text-[#8ab4ff]">
                        {chip.quote.label}
                      </span>
                      {chip.quote.target?.kind === "page" && chip.quote.target.slug && (
                        <span className="mt-0.5 block text-[11px] text-[#9aa0ae]">
                          Page: {chip.quote.target.pageTitle || chip.quote.target.slug} ({chip.quote.target.slug})
                        </span>
                      )}
                      {chip.quote.target?.kind === "doc" && chip.quote.target.docKind && (
                        <span className="mt-0.5 block text-[11px] text-[#9aa0ae]">
                          Document: {chip.quote.target.docTitle || chip.quote.target.docKind} ({chip.quote.target.docKind})
                        </span>
                      )}
                      {chip.quote.target?.kind === "task" && chip.quote.target.taskTitle && (
                        <span className="mt-0.5 block text-[11px] text-[#9aa0ae]">
                          Task: {chip.quote.target.taskTitle}
                          {chip.quote.target.taskStatus ? ` [${chip.quote.target.taskStatus}]` : ""}
                        </span>
                      )}
                      {!!chip.quote.text && (
                        <span className="mt-1 block text-[12px] leading-5 text-[#c9cdd6]">
                          &ldquo;{chip.quote.text}&rdquo;
                        </span>
                      )}
                      {!!chip.quote.comment.trim() && (
                        <span className="mt-1 block text-[12px] leading-5 text-[#f5f6f8]">
                          {chip.quote.comment.trim()}
                        </span>
                      )}
                      {!chip.quote.text && !chip.quote.comment.trim() && (
                        <span className="mt-1 block text-[12px] leading-5 text-[#9aa0ae]">
                          Pinned for context.
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setChips((prev) =>
                          prev.filter((entry) => entry.id !== chip.id),
                        )
                      }
                      aria-label={`Remove ${chip.quote.label} from chat`}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full text-[#9aa0ae] hover:bg-white/10 hover:text-white"
                    >
                      <svg
                        aria-hidden
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={
                picking
                  ? "Pick a component or a whole frame, then say what should change…"
                  : "Tell Muse what to change…"
              }
              aria-label="Ask about this project"
              disabled={busy}
              className="block min-h-9 w-full resize-none overflow-y-auto bg-transparent py-1.5 text-[14px] leading-6 text-[#f5f6f8] placeholder:text-[#5b6472] focus:outline-none disabled:opacity-50"
            />
            <div className="mt-1 flex items-center gap-1.5">
              {canPick && (
                <button
                  type="button"
                  onClick={onTogglePick}
                  aria-pressed={picking}
                  aria-label={
                    picking
                      ? "Stop selecting components"
                      : "Select a component to change"
                  }
                  title={
                    picking
                      ? "Stop selecting components"
                      : "Select a component on the canvas"
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    picking
                      ? "border-transparent bg-white text-[#0b0c10]"
                      : "border-white/10 bg-white/5 text-[#c9cdd6] hover:border-white/25 hover:text-white"
                  }`}
                >
                  <svg
                    aria-hidden
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </button>
              )}
              <div ref={pickerRef} className="relative ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setModelOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={modelOpen}
                  aria-label={`AI model: ${project.model ? formatModelLabel(project.model) : "Muse"}`}
                  title="Choose the model for this chat"
                  className="flex h-7 items-center gap-1 rounded-full bg-white/5 px-2 text-[11px] text-[#9aa0ae] hover:bg-white/10 hover:text-white"
                >
                  <span className="max-w-[120px] truncate">
                    {project.model ? formatModelLabel(project.model) : "Muse"}
                  </span>
                  <svg
                    aria-hidden
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 transition-transform ${modelOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </button>
                {modelOpen && (
                  <div
                    role="menu"
                    aria-label="AI model"
                    className="absolute bottom-full right-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
                  >
                    {models.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={entry.id === project.model}
                        onClick={() => pickModel(entry.id)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5 ${
                          entry.id === project.model ? "bg-white/5" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[#f5f6f8]">
                            {entry.label}
                          </span>
                          {!!entry.hint && (
                            <span className="block truncate text-[11px] text-[#9aa0ae]">
                              {entry.hint}
                            </span>
                          )}
                        </span>
                        {entry.id === project.model && (
                          <svg
                            aria-hidden
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                          >
                            <path d="M5 12l5 5L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void toggleMic()}
                disabled={busy || micState === "transcribing"}
                aria-label={micState === "recording" ? "Stop recording" : "Dictate with microphone"}
                title={micState === "recording" ? "Stop recording" : "Dictate with microphone"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
                  micState === "recording"
                    ? "border-[#f0a6a6]/50 bg-[#f0a6a6]/15 text-[#f0a6a6]"
                    : "border-white/10 bg-white/5 text-[#c9cdd6] hover:border-white/25 hover:text-white"
                }`}
              >
                {micState === "transcribing" ? (
                  <span className="size-3 animate-pulse rounded-full bg-current" />
                ) : (
                  <svg
                    aria-hidden
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                )}
              </button>
              <button
                type="submit"
                disabled={busy || (!input.trim() && chips.length === 0)}
                aria-label="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0b0c10] hover:bg-white/90 disabled:opacity-40"
              >
                <svg
                  aria-hidden
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Hide chat"
                title="Hide chat"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9aa0ae] hover:bg-white/10 hover:text-white"
              >
                <svg
                  aria-hidden
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
            {micError && (
              <p role="alert" className="mt-1.5 text-[12px] text-[#f0a6a6]">
                {micError}
              </p>
            )}
            {micState === "recording" && (
              <p role="status" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#f0a6a6]">
                <span className="size-2 animate-pulse rounded-full bg-current" />
                Listening… tap the mic to stop.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
