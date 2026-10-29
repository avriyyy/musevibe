"use client";

/**
 * Floating workspace chat: a bottom-center pill that expands upward into
 * a wide composer bar with the project as an attached context chip,
 * quick prompts, and a send button. Collapses back to the pill to hide.
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

const QUICK_PROMPTS = [
  { id: "summarize", label: "Summarize", prompt: "Summarize this project: the idea, the brief, and current task progress in a few bullets." },
  { id: "next", label: "Next tasks", prompt: "What should I work on next based on the task board?" },
  { id: "ideas", label: "Ideas", prompt: "Suggest 3 concrete improvements for this project." },
] as const;

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
  const stateRef = useRef({ project, brief, docs, tasks });

  // Latest project snapshot for in-flight requests.
  useEffect(() => {
    stateRef.current = { project, brief, docs, tasks };
  });

  // Thread state resets via the keyed remount in the parent.

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
    <div className="absolute bottom-4 left-1/2 z-40 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="flex max-h-[min(560px,calc(100dvh-8rem))] flex-col gap-2">
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
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-[#e8ebf0]">
              <svg
                aria-hidden
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-[#9aa0ae]"
              >
                <path d="M6 3h12l4 6-4 6H6l-4-6 4-6z" />
              </svg>
              <span className="truncate">{project.name}</span>
              <button
                type="button"
                onClick={() => {
                  setTurns([]);
                  setInput("");
                  setError("");
                }}
                aria-label="Start new conversation"
                title="Start new conversation"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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
            <span className="hidden shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[#5b6472] sm:block">
              {project.model ? formatModelLabel(project.model) : "Muse"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide chat"
              title="Hide chat"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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
              {QUICK_PROMPTS.map((quick) => (
                <button
                  key={quick.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(quick.prompt)}
                  className="flex h-8 shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[12px] font-medium text-[#c9cdd6] hover:border-white/25 hover:text-white disabled:opacity-40"
                >
                  {quick.label}
                </button>
              ))}
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0b0c10] hover:bg-white/90 disabled:opacity-40"
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
          </form>
        </div>
      </div>
    </div>
  );
}
