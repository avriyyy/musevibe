"use client";

/**
 * Project workspace as an IDE: a resizable left rail holds expandable
 * sections (Plan, Code, Design) and the main pane switches between the
 * product brief, the task board, a code viewer, and a tldraw design canvas.
 * Briefs, tasks, files, and canvas snapshots all live in the local store,
 * so a reload keeps every pane.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Icon } from "@astryxdesign/core/Icon";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  CodeBracketIcon,
  DocumentTextIcon,
  FolderIcon,
  PaintBrushIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import type { TLEditorSnapshot } from "@tldraw/tldraw";
import Markdown from "@/components/Markdown";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { formatModelLabel } from "@/lib/models";
import { platformLabel } from "@/lib/project-options";
import { frameworkLabel } from "@/lib/stack-options";
import { starterFiles } from "@/lib/starter";
import {
  buildPrdPrompt,
  buildTasksPrompt,
  fallbackPrd,
  fallbackTasks,
  parseTasks,
} from "@/lib/plan";
import type { CodeFile, Screen, Task, TaskStatus } from "@/lib/types";

const DesignCanvas = dynamic(() => import("@/components/DesignCanvas"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="grid h-full place-items-center bg-[#0b0c10]"
    >
      <span className="size-5 animate-pulse rounded-full bg-white/30" />
      <span className="sr-only">Opening the design canvas</span>
    </div>
  ),
});

const EMPTY_TASKS: Task[] = [];
const EMPTY_FILES: CodeFile[] = [];
const EMPTY_SCREENS: Screen[] = [];
const COLUMNS: { status: TaskStatus; label: string; empty: string }[] = [
  { status: "todo", label: "To do", empty: "The first tasks land here." },
  { status: "doing", label: "In progress", empty: "Move a task here when you start." },
  { status: "done", label: "Done", empty: "Finished tasks collect here." },
];

type Phase = "brief" | "tasks" | null;

type View =
  | { kind: "brief" }
  | { kind: "tasks" }
  | { kind: "code"; fileId: string | null }
  | { kind: "design"; screenId: string | null };

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

function parseSnapshot(raw: string): TLEditorSnapshot | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as TLEditorSnapshot)
      : null;
  } catch {
    return null;
  }
}

export default function IdeWorkspace({ projectId }: { projectId: string }) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrated,
    getHydratedOnServer,
  );

  const project = useVibe((state) =>
    state.projects.find((entry) => entry.id === projectId),
  );
  const prd = useVibe((state) => state.prdByProject[projectId] ?? "");
  const tasks = useVibe((state) => state.tasksByProject[projectId] ?? EMPTY_TASKS);
  const files = useVibe((state) => state.filesByProject[projectId] ?? EMPTY_FILES);
  const screens = useVibe(
    (state) => state.screensByProject[projectId] ?? EMPTY_SCREENS,
  );

  const [view, setView] = useState<View>({ kind: "brief" });
  const [phase, setPhase] = useState<Phase>(null);
  const [briefLocal, setBriefLocal] = useState(false);
  const [tasksLocal, setTasksLocal] = useState(false);
  const [error, setError] = useState("");
  const runningRef = useRef(false);
  const startedRef = useRef(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const rail = useResizable({
    defaultSize: 272,
    minSize: 208,
    maxSize: 420,
  });

  const runPlan = useCallback(
    async (force: boolean) => {
      if (runningRef.current) return;
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === projectId);
      if (!current) return;

      const savedBrief = state.prdByProject[projectId] ?? "";
      const savedTasks = state.tasksByProject[projectId] ?? EMPTY_TASKS;
      if (!force && savedBrief.trim() && savedTasks.length) return;

      runningRef.current = true;
      startedRef.current = true;
      setError("");
      setBriefLocal(false);
      setTasksLocal(false);

      let brief = savedBrief;

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
            setBriefLocal(true);
          }
        } catch {
          brief = fallbackPrd(current);
          setBriefLocal(true);
          setError("The model did not answer, so this brief was drafted from your setup answers.");
        }
        useVibe.getState().setPrd(projectId, brief);
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
              ? parseTasks(reply.text, `task-${projectId.slice(0, 8)}`)
              : null;
          if (parsed) {
            useVibe.getState().setTasks(projectId, parsed);
          } else {
            useVibe.getState().setTasks(projectId, fallbackTasks(current));
            setTasksLocal(true);
          }
        } catch {
          useVibe.getState().setTasks(projectId, fallbackTasks(current));
          setTasksLocal(true);
          setError((previous) =>
            previous ||
            "The model did not answer, so the task list was drafted locally.",
          );
        }
      }

      setPhase(null);
      runningRef.current = false;
    },
    [projectId],
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

  // The Code pane seeds one clearly-marked local stub so it never opens
  // empty. The model has not written app code yet; this is a placeholder.
  useEffect(() => {
    if (view.kind !== "code" || !project || files.length > 0) return;
    useVibe.getState().setFiles(projectId, starterFiles(project));
  }, [view.kind, project, files.length, projectId]);

  // The Design pane seeds one blank canvas on first open.
  useEffect(() => {
    if (view.kind !== "design" || !project || screens.length > 0) return;
    useVibe.getState().setScreens(projectId, [
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `screen-${Date.now()}`,
        name: "Canvas",
        canvasJson: "",
        components: [],
      },
    ]);
  }, [view.kind, project, screens.length, projectId]);

  const handleSnapshot = useCallback(
    (screenId: string, snapshot: TLEditorSnapshot) => {
      const state = useVibe.getState();
      const current = state.screensByProject[projectId] ?? EMPTY_SCREENS;
      const existing =
        current.find((screen) => screen.id === screenId)?.canvasJson ?? "";
      let serialized = "";
      try {
        serialized = JSON.stringify(snapshot);
      } catch {
        return;
      }
      // Skip echo saves: loading a snapshot back into the editor fires the
      // same listener, and writing it again would remount the canvas in a
      // loop every few seconds.
      if (serialized === existing) return;
      state.setScreens(
        projectId,
        current.map((screen) =>
          screen.id === screenId ? { ...screen, canvasJson: serialized } : screen,
        ),
      );
    },
    [projectId],
  );

  const activeFile =
    view.kind === "code"
      ? (files.find((file) => file.id === view.fileId) ?? files[0] ?? null)
      : null;
  const activeScreen =
    view.kind === "design"
      ? (screens.find((screen) => screen.id === view.screenId) ??
        screens[0] ??
        null)
      : null;
  // Referentially stable across renders: a fresh object identity on every
  // render would look like a new snapshot to the canvas and remount it.
  const activeSnapshot = useMemo(
    () => parseSnapshot(activeScreen?.canvasJson ?? ""),
    [activeScreen?.canvasJson],
  );

  const tree: TreeListItemData[] = useMemo(() => {
    const sectionIcon = <Icon icon={FolderIcon} size="xsm" />;
    const docIcon = <Icon icon={DocumentTextIcon} size="xsm" />;
    const fileIcon = <Icon icon={CodeBracketIcon} size="xsm" />;
    const screenIcon = <Icon icon={PhotoIcon} size="xsm" />;
    return [
      {
        id: "plan",
        label: "Plan",
        startContent: sectionIcon,
        isExpanded: true,
        children: [
          {
            id: "plan-brief",
            label: "Product brief",
            startContent: docIcon,
            isSelected: view.kind === "brief",
            onClick: () => setView({ kind: "brief" }),
          },
          {
            id: "plan-tasks",
            label: "Task board",
            startContent: docIcon,
            isSelected: view.kind === "tasks",
            onClick: () => setView({ kind: "tasks" }),
          },
        ],
      },
      {
        id: "code",
        label: "Code",
        startContent: <Icon icon={CodeBracketIcon} size="xsm" />,
        isExpanded: true,
        children:
          files.length > 0
            ? files.map((file) => ({
                id: `file-${file.id}`,
                label: file.path,
                startContent: fileIcon,
                isSelected:
                  view.kind === "code" &&
                  (view.fileId ?? files[0]?.id) === file.id,
                onClick: () => setView({ kind: "code", fileId: file.id }),
              }))
            : [
                {
                  id: "code-empty",
                  label: "Starter files",
                  startContent: fileIcon,
                  isSelected: view.kind === "code",
                  onClick: () => setView({ kind: "code", fileId: null }),
                },
              ],
      },
      {
        id: "design",
        label: "Design",
        startContent: <Icon icon={PaintBrushIcon} size="xsm" />,
        isExpanded: true,
        children:
          screens.length > 0
            ? screens.map((screen) => ({
                id: `screen-${screen.id}`,
                label: screen.name,
                startContent: screenIcon,
                isSelected:
                  view.kind === "design" &&
                  (view.screenId ?? screens[0]?.id) === screen.id,
                onClick: () =>
                  setView({ kind: "design", screenId: screen.id }),
              }))
            : [
                {
                  id: "design-empty",
                  label: "Canvas",
                  startContent: screenIcon,
                  isSelected: view.kind === "design",
                  onClick: () => setView({ kind: "design", screenId: null }),
                },
              ],
      },
    ];
  }, [files, screens, view]);

  const addCanvas = () => {
    const screen: Screen = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `screen-${Date.now()}`,
      name: `Canvas ${screens.length + 1}`,
      canvasJson: "",
      components: [],
    };
    useVibe.getState().setScreens(projectId, [...screens, screen]);
    setView({ kind: "design", screenId: screen.id });
  };

  if (!hydrated) {
    return <OpeningProject />;
  }

  if (!project) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0b0c10] px-5 text-center text-[#f5f6f8]">
        <div>
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
      </div>
    );
  }

  if (project.status === "draft") {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0b0c10] px-5 text-center text-[#f5f6f8]">
        <div>
          <h1 className="text-[24px] font-semibold">Setup is not finished</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#9aa0ae]">
            Pick up the wizard where you left it. The workspace opens once the
            last step is saved.
          </p>
          <Link
            href={`/form-wizard?id=${project.id}`}
            className="mt-6 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90"
          >
            Resume setup
          </Link>
        </div>
      </div>
    );
  }

  const answers = (project.answers ?? []).some(
    (entry) => describeAnswerValue(entry.values ?? entry.answer) !== "",
  );
  const running = phase !== null;

  return (
    <div className="flex h-dvh flex-col bg-[#0b0c10] text-[#f5f6f8]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
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

        {project.logoUrl ? (
          <img
            src={project.logoUrl}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-[#c9cdd6]"
          >
            {initials(project.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight">
            {project.name}
          </h1>
          <p className="mt-0.5 truncate text-[12px] text-[#9aa0ae]">
            {project.idea}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 text-[11px] text-[#9aa0ae] md:flex">
          {project.platform && <Chip>{platformLabel(project.platform)}</Chip>}
          {project.platform && project.framework && (
            <Chip>{frameworkLabel(project.platform, project.framework)}</Chip>
          )}
          {project.model && <Chip>{formatModelLabel(project.model)}</Chip>}
        </div>
      </header>

      {isMobile && (
        <div className="shrink-0 border-b border-white/10 px-4 py-2">
          <SegmentedControl
            label="Workspace view"
            value={view.kind}
            onChange={(next) => {
              if (next === "brief") setView({ kind: "brief" });
              else if (next === "tasks") setView({ kind: "tasks" });
              else if (next === "code")
                setView({ kind: "code", fileId: files[0]?.id ?? null });
              else if (next === "design")
                setView({ kind: "design", screenId: screens[0]?.id ?? null });
            }}
            size="sm"
            layout="fill"
          >
            <SegmentedControlItem label="Brief" value="brief" />
            <SegmentedControlItem label="Tasks" value="tasks" />
            <SegmentedControlItem label="Code" value="code" />
            <SegmentedControlItem label="Design" value="design" />
          </SegmentedControl>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0a6a6]/30 bg-[#f0a6a6]/10 px-4 py-3 text-[12px] text-[#f0a6a6]"
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

      <div className="flex min-h-0 flex-1">
        {!isMobile && (
          <>
            <div
              className="flex min-h-0 shrink-0 flex-col border-r border-white/10 bg-[#0b0c10]"
              style={{ width: rail.size }}
            >
              <p className="px-4 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-[#5b6472]">
                Explorer
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                <TreeList items={tree} density="compact" />
              </div>
              <div className="shrink-0 border-t border-white/10 p-2">
                <button
                  type="button"
                  onClick={addCanvas}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-[#9aa0ae] hover:bg-white/5 hover:text-white"
                >
                  <span aria-hidden className="text-[16px] leading-none">
                    +
                  </span>
                  New canvas
                </button>
              </div>
            </div>
            <ResizeHandle
              direction="horizontal"
              hasDivider
              isAlwaysVisible={false}
              resizable={rail.props}
              label="Resize explorer"
            />
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col bg-[#0b0c10]">
          {view.kind === "brief" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-7">
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

                {briefLocal && (
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

                {answers && (
                  <details className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-[#c9cdd6]">
                      What you told the wizard
                    </summary>
                    <dl className="mt-3 space-y-3">
                      {(project.answers ?? []).map((entry) => {
                        const value = describeAnswerValue(
                          entry.values ?? entry.answer,
                        );
                        if (!value) return null;
                        return (
                          <div key={entry.qid}>
                            <dt className="text-[11px] uppercase tracking-[0.08em] text-[#5b6472]">
                              {entry.question}
                            </dt>
                            <dd className="mt-0.5 text-[13px] text-[#dfe3ea]">
                              {value}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </details>
                )}
              </div>
            </div>
          )}

          {view.kind === "tasks" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[860px] px-5 pb-20 pt-7">
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

                {tasksLocal && (
                  <p className="mt-2 text-[11px] text-[#9aa0ae]">
                    Tasks were drafted locally, without the model.
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {COLUMNS.map((column) => (
                    <TaskColumn
                      key={column.status}
                      label={column.label}
                      empty={column.empty}
                      tasks={tasks.filter((task) => task.status === column.status)}
                      loading={phase === "tasks" && tasks.length === 0}
                      onMove={(task, next) =>
                        useVibe.getState().moveTask(projectId, task.id, next)
                      }
                      onRemove={(task) =>
                        useVibe.getState().removeTask(projectId, task.id)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {view.kind === "code" && (
            <div className="flex min-h-0 flex-1 flex-col">
              {files.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Project files"
                  className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 px-3 py-2"
                >
                  {files.map((file) => {
                    const selected =
                      (activeFile?.id ?? files[0]?.id) === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() =>
                          setView({ kind: "code", fileId: file.id })
                        }
                        className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-[12px] ${
                          selected
                            ? "bg-white/10 text-white"
                            : "text-[#9aa0ae] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {file.path}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {activeFile ? (
                  <CodeBlock
                    code={activeFile.content}
                    language="typescript"
                    hasLineNumbers
                    size="sm"
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <p className="text-[13px] text-[#9aa0ae]">
                    Preparing the starter files…
                  </p>
                )}
              </div>
            </div>
          )}

          {view.kind === "design" && (
            <div className="min-h-0 flex-1">
              {activeScreen ? (
                <DesignCanvas
                  key={activeScreen.id}
                  initialSnapshot={activeSnapshot}
                  onSnapshot={(snapshot) =>
                    handleSnapshot(activeScreen.id, snapshot)
                  }
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <p className="text-[13px] text-[#9aa0ae]">
                    Preparing the canvas…
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
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
