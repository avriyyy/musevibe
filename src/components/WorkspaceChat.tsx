"use client";

/**
 * Floating workspace chat: a bottom-edge drawer tab that slides upward
 * into a wide composer bar grounded in the live project (idea, brief,
 * documents, task board). Collapses back into the bottom edge to hide.
 * Dark pills and white accents match the workspace chrome.
 */

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { blobToWav } from "@/lib/audio";
import { buildChatPrompt, type ChatMessage } from "@/lib/chat";
import { formatModelLabel } from "@/lib/models";
import type { Project, ProjectDoc, Task } from "@/lib/types";

interface WorkspaceChatProps {
  project: Project;
  brief: string;
  docs: ProjectDoc[];
  tasks: Task[];
  onHeightChange?: (height: number) => void;
  prefill?: { id: number; text: string } | null;
  onPrefillSent?: () => void;
}

interface ChatTurn extends ChatMessage {
  offline?: boolean;
}

type MicState = "idle" | "recording" | "transcribing";

export default function WorkspaceChat({
  project,
  brief,
  docs,
  tasks,
  onHeightChange,
  prefill,
  onPrefillSent,
}: WorkspaceChatProps) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [micError, setMicError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(onHeightChange);
  const sentPrefillRef = useRef<number | null>(null);
  const sendRef = useRef<(text?: string) => Promise<void>>(() => Promise.resolve());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stateRef = useRef({ project, brief, docs, tasks });

  // Thread state resets via the keyed remount in the parent.

  // Latest project snapshot for in-flight requests.
  useEffect(() => {
    stateRef.current = { project, brief, docs, tasks };
    heightRef.current = onHeightChange;
  });

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

  // Keep the latest reply in view, and focus the box when opened.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    inputRef.current?.focus();
  }, [open, turns.length, busy]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const next: ChatTurn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setInput("");
    try {
      const { project: currentProject, brief: currentBrief, docs: currentDocs, tasks: currentTasks } = stateRef.current;
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "chat",
          prompt: buildChatPrompt(
            currentProject,
            currentBrief,
            currentDocs,
            currentTasks,
            next,
            message,
          ),
          ...(currentProject.model ? { model: currentProject.model } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
      const data = (await response.json()) as {
        text?: unknown;
        source?: unknown;
      };
      const text =
        typeof data.text === "string" && data.text.trim()
          ? data.text.trim()
          : "The model returned nothing. Try asking again.";
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: text, offline: data.source !== "ai" },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The chat request failed.",
      );
      setTurns((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Latest send for outside triggers (component comments).
  useEffect(() => {
    sendRef.current = send;
  });

  // A component comment arrives as a ready-to-send chat message.
  useEffect(() => {
    if (!prefill || sentPrefillRef.current === prefill.id) return;
    sentPrefillRef.current = prefill.id;
    setOpen(true);
    if (busyRef.current) {
      setInput((prev) => (prev.trim() ? `${prev.trim()}\n${prefill.text}` : prefill.text));
      onPrefillSent?.();
      return;
    }
    void sendRef
      .current(prefill.text)
      .finally(() => onPrefillSent?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

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
        text?: unknown;
        error?: unknown;
      };
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Transcription failed.",
        );
      }
      const text = typeof data.text === "string" ? data.text.trim() : "";
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
          onClick={() => setOpen(true)}
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
        {/* Messages, only once the thread starts. */}
        {turns.length > 0 && (
          <div className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#17181d]/95 shadow-2xl backdrop-blur">
            <div
              ref={scrollRef}
              className="max-h-[300px] overflow-y-auto px-4 py-3"
            >
              <div className="flex flex-col gap-2.5">
                {turns.map((turn, index) => (
                  <div
                    key={index}
                    className={`max-w-[90%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                      turn.role === "user"
                        ? "self-end bg-white text-[#0b0c10]"
                        : "self-start bg-white/5 text-[#e8ebf0]"
                    }`}
                  >
                    {turn.role === "assistant" ? (
                      <>
                        <Markdown text={turn.content} />
                        {turn.offline && (
                          <p className="mt-1.5 text-[11px] text-[#5b6472]">
                            Offline draft: reconnect the model for a live answer.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{turn.content}</p>
                    )}
                  </div>
                ))}
                {busy && (
                  <div
                    role="status"
                    className="flex items-center gap-2 self-start rounded-2xl bg-white/5 px-3 py-2 text-[12px] text-[#9aa0ae]"
                  >
                    <span className="size-3 animate-pulse rounded-full bg-white/40" />
                    Thinking…
                  </div>
                )}
              </div>
              {error && (
                <p role="alert" className="mt-2 text-[12px] text-[#f0a6a6]">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Wide composer bar. */}
        <div className="rounded-2xl border border-white/10 bg-[#17181d]/95 px-4 pb-3 pt-2.5 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide chat"
              title="Hide chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9aa0ae] hover:bg-white/10 hover:text-white"
            >
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
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask or change anything…"
              aria-label="Ask about this project"
              disabled={busy}
              className="mt-1 h-9 w-full bg-transparent text-[14px] text-[#f5f6f8] placeholder:text-[#5b6472] focus:outline-none disabled:opacity-50"
            />
            <div className="mt-1 flex items-center gap-1.5">
              <span className="ml-auto shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[#5b6472]">
                {project.model ? formatModelLabel(project.model) : "Muse"}
              </span>
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
                disabled={busy || !input.trim()}
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
