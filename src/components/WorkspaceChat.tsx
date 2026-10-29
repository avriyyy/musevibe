"use client";

/**
 * Floating workspace chat: a bottom-center pill that expands upward into
 * a project-aware conversation panel, and collapses back down to hide.
 * Dark pills and white accents match the workspace chrome.
 */

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import { buildChatPrompt, type ChatMessage } from "@/lib/chat";
import { formatModelLabel } from "@/lib/models";
import type { Project, ProjectDoc, Task } from "@/lib/types";

interface WorkspaceChatProps {
  project: Project;
  brief: string;
  docs: ProjectDoc[];
  tasks: Task[];
}

interface ChatTurn extends ChatMessage {
  offline?: boolean;
}

export default function WorkspaceChat({
  project,
  brief,
  docs,
  tasks,
}: WorkspaceChatProps) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  // Thread state resets via the keyed remount in the parent.

  // Keep the latest reply in view, and focus the box when opened.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    inputRef.current?.focus();
  }, [open, turns.length, busy]);

  const send = async () => {
    const message = input.trim();
    if (!message || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const next: ChatTurn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setInput("");
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "chat",
          prompt: buildChatPrompt(
            project,
            brief,
            docs,
            tasks,
            next,
            message,
          ),
          ...(project.model ? { model: project.model } : {}),
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

  if (!open) {
    return (
      <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          title="Ask AI about this project"
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#17181d]/95 px-4 text-[13px] font-medium text-[#c9cdd6] shadow-xl hover:border-white/25 hover:text-white"
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
            <path d="M12 3l1.9 5.7L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.3L12 3z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
          </svg>
          Ask AI
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-40 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="flex max-h-[min(520px,calc(100dvh-8rem))] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17181d]/95 shadow-2xl backdrop-blur">
        {/* Header. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black"
          >
            AI
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#f5f6f8]">
            Ask AI
          </span>
          <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[#9aa0ae] sm:block">
            {project.model ? formatModelLabel(project.model) : "Muse"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Hide chat"
            title="Hide chat"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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

        {/* Messages. */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {turns.length === 0 && (
            <p className="rounded-xl bg-white/5 px-3 py-2.5 text-[12px] leading-relaxed text-[#9aa0ae]">
              Ask about this project: the idea, the brief, the documents, or
              the task board. Answers use what is on screen.
            </p>
          )}
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

        {/* Composer. */}
        <form
          className="flex shrink-0 items-center gap-2 border-t border-white/10 p-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about this project…"
            aria-label="Ask about this project"
            disabled={busy}
            className="h-9 min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-3.5 text-[13px] text-[#f5f6f8] placeholder:text-[#5b6472] focus:border-white/25 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0b0c10] hover:bg-white/90 disabled:opacity-40"
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
        </form>
      </div>
    </div>
  );
}
