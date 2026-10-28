"use client";

/**
 * Project workspace. The setup wizard ends here: the saved answers become a
 * product brief and a first task list, both generated once and then editable.
 * The page reads the project from the local store, so a reload keeps the plan.
 */

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { formatModelLabel } from "@/lib/models";
import { platformLabel, timelineLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";
import {
  buildPrdPrompt,
  buildTasksPrompt,
  fallbackPrd,
  fallbackTasks,
  parseTasks,
} from "@/lib/plan";
import type { Task, TaskStatus } from "@/lib/types";

const EMPTY_TASKS: Task[] = [];
const COLUMNS: { status: TaskStatus; label: string; empty: string }[] = [
  { status: "todo", label: "To do", empty: "The first tasks land here." },
  { status: "doing", label: "In progress", empty: "Move a task here when you start." },
  { status: "done", label: "Done", empty: "Finished tasks collect here." },
];

type Phase = "brief" | "tasks" | null;

function subscribeHydration(onChange: () => void) {
  return useVibe.persist.onFinishHydration(onChange);
}

function getHydrated() {
  return useVibe.persist.hasHydrated();
}

function getHydratedOnServer() {
  return false;
}

interface AiReply {
  text: string;
  source: "ai" | "local";
}

async function requestAi(
  kind: "prd" | "tasks",
  prompt: string,
  model?: string,
): Promise<AiReply> {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, prompt, ...(model ? { model } : {}) }),
  });
  if (!response.ok) throw new Error(`Plan request failed: ${response.status}`);
  const data = (await response.json()) as { text?: unknown; source?: unknown };
  return {
    text: typeof data.text === "string" ? data.text : "",
    source: data.source === "ai" ? "ai" : "local",
  };
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<OpeningProject />}>
      <ProjectView />
    </Suspense>
  );
}

function ProjectView() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrated,
    getHydratedOnServer,
  );

  const project = useVibe((state) =>
    state.projects.find((entry) => entry.id === id),
  );
  const prd = useVibe((state) => state.prdByProject[id] ?? "");
  const tasks = useVibe((state) => state.tasksByProject[id] ?? EMPTY_TASKS);

  const [phase, setPhase] = useState<Phase>(null);
  const [local, setLocal] = useState(false);
  const [error, setError] = useState("");
  const runningRef = useRef(false);
  const startedRef = useRef(false);

  const runPlan = useCallback(
    async (force: boolean) => {
      if (runningRef.current) return;
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === id);
      if (!current) return;

      const savedBrief = state.prdByProject[id] ?? "";
      const savedTasks = state.tasksByProject[id] ?? EMPTY_TASKS;
      if (!force && savedBrief.trim() && savedTasks.length) return;

      runningRef.current = true;
      startedRef.current = true;
      setError("");
      setLocal(false);

      let brief = savedBrief;
      let usedLocal = false;

      if (force || !brief.trim()) {
        setPhase("brief");
        try {
          const reply = await requestAi(
            "prd",
            buildPrdPrompt(current),
            current.model,
          );
          if (reply.source === "ai" && reply.text.trim()) {
            brief = reply.text.trim();
          } else {
            brief = fallbackPrd(current);
            usedLocal = true;
          }
        } catch {
          brief = fallbackPrd(current);
          usedLocal = true;
          setError("The model did not answer, so this brief was drafted from your setup answers.");
        }
        useVibe.getState().setPrd(id, brief);
      }

      if (force || !savedTasks.length) {
        setPhase("tasks");
        try {
          const reply = await requestAi(
            "tasks",
            buildTasksPrompt(current, brief),
            current.model,
          );
          const parsed =
            reply.source === "ai"
              ? parseTasks(reply.text, `task-${id.slice(0, 8)}`)
              : null;
          if (parsed) {
            useVibe.getState().setTasks(id, parsed);
          } else {
            useVibe.getState().setTasks(id, fallbackTasks(current));
            usedLocal = true;
          }
        } catch {
          useVibe.getState().setTasks(id, fallbackTasks(current));
          usedLocal = true;
          setError((previous) =>
            previous ||
            "The model did not answer, so the task list was drafted locally.",
          );
        }
      }

      setLocal(usedLocal);
      setPhase(null);
      runningRef.current = false;
    },
    [id],
  );

  useEffect(() => {
    if (!hydrated || !project || startedRef.current) return;
    if (project.status === "draft") return;
    startedRef.current = true;
    // Start after this effect finishes; the first state update belongs to the
    // request, not to the render that mounted the page.
    queueMicrotask(() => {
      void runPlan(false);
    });
  }, [hydrated, project, runPlan]);

  if (!hydrated) {
    return <OpeningProject />;
  }

  if (!project) {
    return (
      <Shell>
        <div className="py-24 text-center">
          <h1 className="text-[24px] font-semibold">Project not found</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#9aa0ae]">
            This link points at a project that is not on this device. Start from
            the chat to create one.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90"
          >
            Back to chat
          </Link>
        </div>
      </Shell>
    );
  }

  if (project.status === "draft") {
    return (
      <Shell project={project}>
        <div className="py-24 text-center">
          <h2 className="text-[24px] font-semibold">Setup is not finished</h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#9aa0ae]">
            Pick up the wizard where you left it. The brief is generated once the
            last step is saved.
          </p>
          <Link
            href={`/form-wizard?id=${project.id}`}
            className="mt-6 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90"
          >
            Resume setup
          </Link>
        </div>
      </Shell>
    );
  }

  const answers = (project.answers ?? []).some(
    (entry) => describeAnswerValue(entry.values ?? entry.answer) !== "",
  );
  const running = phase !== null;

  return (
    <Shell project={project}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9aa0ae]">
        {project.platform && (
          <Chip>{platformLabel(project.platform)}</Chip>
        )}
        {project.platform && project.framework && (
          <Chip>{frameworkLabel(project.platform, project.framework)}</Chip>
        )}
        {project.timeline && <Chip>{timelineLabel(project.timeline)}</Chip>}
        {project.model && (
          <Chip>{formatModelLabel(project.model)}</Chip>
        )}
      </div>

      {answers && (
        <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <summary className="cursor-pointer text-[12px] font-medium text-[#c9cdd6]">
            What you told the wizard
          </summary>
          <dl className="mt-3 space-y-3">
            {(project.answers ?? []).map((entry) => {
              const value = describeAnswerValue(entry.values ?? entry.answer);
              if (!value) return null;
              return (
                <div key={entry.qid}>
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-[#5b6472]">
                    {entry.question}
                  </dt>
                  <dd className="mt-0.5 text-[13px] text-[#dfe3ea]">{value}</dd>
                </div>
              );
            })}
          </dl>
        </details>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0a6a6]/30 bg-[#f0a6a6]/10 px-4 py-3 text-[12px] text-[#f0a6a6]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void runPlan(true)}
            disabled={running}
            className="rounded-full border border-[#f0a6a6]/40 px-3 py-1 font-medium hover:bg-[#f0a6a6]/10 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#5b6472]">
              Plan
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
              Product brief
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void runPlan(true)}
            disabled={running}
            className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-[12px] text-[#c9cdd6] hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {phase === "brief" ? (
              <Spinner />
            ) : (
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
              >
                <path d="M20 11a8 8 0 1 0-2.3 5.7" />
                <path d="M20 4v7h-7" />
              </svg>
            )}
            {phase === "brief" ? "Writing" : "Regenerate"}
          </button>
        </div>

        {local && (
          <p className="mt-2 text-[11px] text-[#9aa0ae]">
            Drafted locally from your setup answers, without the model.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#17181d] p-5 sm:p-6">
          {prd ? (
            <Markdown text={prd} />
          ) : (
            <div className="space-y-3" role="status" aria-live="polite">
              <p className="text-[12px] text-[#9aa0ae]">
                {phase === "tasks"
                  ? "Brief is ready. Turning it into tasks."
                  : "Writing the brief from your idea and answers."}
              </p>
              <div className="space-y-2">
                <Bar width="92%" />
                <Bar width="84%" />
                <Bar width="70%" />
                <Bar width="88%" />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#5b6472]">
              Build
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
              Task board
            </h2>
          </div>
          <p className="text-[12px] text-[#9aa0ae]">
            {phase === "tasks"
              ? "Splitting the brief into tasks"
              : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <TaskColumn
              key={column.status}
              label={column.label}
              empty={column.empty}
              tasks={tasks.filter((task) => task.status === column.status)}
              loading={phase === "tasks" && tasks.length === 0}
              onMove={(task, next) =>
                useVibe.getState().moveTask(id, task.id, next)
              }
              onRemove={(task) =>
                useVibe.getState().removeTask(id, task.id)
              }
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function Shell({
  project,
  children,
}: {
  project?: {
    name: string;
    idea: string;
    logoUrl?: string;
  };
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#0b0c10] text-[#f5f6f8]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0c10]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[860px] items-center gap-3 px-5 py-3">
          <Link
            href="/"
            aria-label="Back to chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#c9cdd6] hover:bg-white/10 hover:text-white"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>

          {project?.logoUrl ? (
            <img
              src={project.logoUrl}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : project ? (
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-[#c9cdd6]"
            >
              {initials(project.name)}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            {project ? (
              <h1 className="truncate text-[15px] font-semibold leading-tight">
                {project.name}
              </h1>
            ) : (
              <p className="truncate text-[15px] font-semibold leading-tight">
                MuseVibe
              </p>
            )}
            {project && (
              <p className="mt-0.5 truncate text-[12px] text-[#9aa0ae]">
                {project.idea}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-7">
        {children}
      </main>
    </div>
  );
}

function OpeningProject() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-[#0b0c10] text-[#f5f6f8]"
    >
      <span className="size-5 animate-pulse rounded-full bg-white/30" />
      <span className="sr-only">Opening your project</span>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[#c9cdd6]">
      {children}
    </span>
  );
}

function Bar({ width }: { width: string }) {
  return (
    <div
      aria-hidden
      className="h-3 animate-pulse rounded bg-white/10"
      style={{ width }}
    />
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

function TaskColumn({
  label,
  empty,
  tasks,
  loading,
  onMove,
  onRemove,
}: {
  label: string;
  empty: string;
  tasks: Task[];
  loading: boolean;
  onMove: (task: Task, next: TaskStatus) => void;
  onRemove: (task: Task) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1014] p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#9aa0ae]">
          {label}
        </h3>
        <span className="text-[11px] text-[#5b6472]">{tasks.length}</span>
      </div>

      <ul className="space-y-2">
        {loading && (
          <li className="rounded-xl border border-white/10 bg-[#17181d] p-3">
            <Bar width="82%" />
            <div className="mt-2">
              <Bar width="54%" />
            </div>
          </li>
        )}

        {!loading && tasks.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[11px] text-[#5b6472]">
            {empty}
          </li>
        )}

        {tasks.map((task) => {
          const index = COLUMNS.findIndex((column) => column.status === task.status);
          const previous = index > 0 ? COLUMNS[index - 1] : null;
          const next = index < COLUMNS.length - 1 ? COLUMNS[index + 1] : null;

          return (
            <li
              key={task.id}
              className="group rounded-xl border border-white/10 bg-[#17181d] p-3"
            >
              <p
                className={`text-[13px] font-medium leading-snug ${
                  task.status === "done"
                    ? "text-[#9aa0ae] line-through"
                    : "text-[#f5f6f8]"
                }`}
              >
                {task.title}
              </p>
              {task.notes && (
                <p className="mt-1 text-[11px] leading-relaxed text-[#9aa0ae]">
                  {task.notes}
                </p>
              )}

              <div className="mt-2.5 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                {previous && (
                  <MoveButton
                    label={`Move ${task.title} to ${previous.label}`}
                    direction="left"
                    onClick={() => onMove(task, previous.status)}
                  />
                )}
                {next && (
                  <MoveButton
                    label={`Move ${task.title} to ${next.label}`}
                    direction="right"
                    onClick={() => onMove(task, next.status)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onRemove(task)}
                  aria-label={`Delete ${task.title}`}
                  title="Delete task"
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[#5b6472] hover:bg-white/10 hover:text-[#f0a6a6]"
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
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MoveButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={direction === "left" ? "Move back" : "Move forward"}
      className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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
        {direction === "left" ? (
          <path d="M15 6l-6 6 6 6" />
        ) : (
          <path d="M9 6l6 6-6 6" />
        )}
      </svg>
    </button>
  );
}

function describeAnswerValue(value: string | string[]): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return typeof value === "string" ? value.trim() : "";
}
