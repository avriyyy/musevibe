"use client";

/**
 * Project workspace: Plan and Design switch from tabs in the navbar.
 * The plan canvas visualizes the brief, the task board, and every document
 * as boards; selecting one opens its editor. Briefs, tasks, files, docs, and
 * canvas snapshots all live in the local store, so a reload keeps everything.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@astryxdesign/core/SegmentedControl";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import {
  CheckCircleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import DocumentsView from "@/components/DocumentsView";
import WorkspaceChat from "@/components/WorkspaceChat";
import { parseCanvasShapes, type CanvasShape } from "@/lib/canvas";
import { useVibe } from "@/lib/store";
import { initials } from "@/lib/logo";
import { formatModelLabel } from "@/lib/models";
import {
  DOC_TYPES,
  buildDocPrompt,
  buildPrototypePrompt,
  parseDocMarkdown,
  parsePrototypeHtml,
  type DocKind,
} from "@/lib/docs";
import {
  buildPrdPrompt,
  buildTasksPrompt,
  fallbackPrd,
  fallbackTasks,
  parseTasks,
} from "@/lib/plan";
import type { CodeFile, ProjectDoc, Screen, Task, TaskStatus } from "@/lib/types";

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
const EMPTY_DOCS: ProjectDoc[] = [];
const COLUMNS: {
  status: TaskStatus;
  label: string;
  variant: "neutral" | "accent" | "warning" | "error" | "success";
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: typeof InboxIcon;
}[] = [
  {
    status: "todo",
    label: "To do",
    variant: "neutral",
    emptyTitle: "To do is empty",
    emptyDescription: "The first tasks land here.",
    emptyIcon: InboxIcon,
  },
  {
    status: "doing",
    label: "In progress",
    variant: "accent",
    emptyTitle: "Nothing in progress",
    emptyDescription: "Move a task here when you start.",
    emptyIcon: InboxIcon,
  },
  {
    status: "review",
    label: "In review",
    variant: "warning",
    emptyTitle: "Nothing in review",
    emptyDescription: "Tasks waiting for a check land here.",
    emptyIcon: InboxIcon,
  },
  {
    status: "blocked",
    label: "Blocked",
    variant: "error",
    emptyTitle: "Nothing blocked",
    emptyDescription: "Tasks waiting on something land here.",
    emptyIcon: InboxIcon,
  },
  {
    status: "done",
    label: "Done",
    variant: "success",
    emptyTitle: "Nothing done yet",
    emptyDescription: "Finished tasks collect here.",
    emptyIcon: CheckCircleIcon,
  },
  {
    status: "cancelled",
    label: "Cancelled",
    variant: "neutral",
    emptyTitle: "Nothing cancelled",
    emptyDescription: "Dropped tasks land here.",
    emptyIcon: InboxIcon,
  },
];

type Phase = "brief" | "tasks" | null;

type View =
  | { kind: "documents" }
  | { kind: "tasks" }
  | { kind: "design" };

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
  kind: "prd" | "tasks" | "doc" | "prototype",
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
  const docs = useVibe(
    (state) => state.docsByProject[projectId] ?? EMPTY_DOCS,
  );

  const [view, setView] = useState<View>({ kind: "documents" });
  const [selectedDocKey, setSelectedDocKey] = useState<string>("doc-prd");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [chatHeight, setChatHeight] = useState(0);
  const [phase, setPhase] = useState<Phase>(null);
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [protoBusy, setProtoBusy] = useState(false);
  const [tasksLocal, setTasksLocal] = useState(false);
  const [error, setError] = useState("");
  const runningRef = useRef(false);
  const startedRef = useRef(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  /** Which navbar tab the current view belongs to. */
  const activeTab =
    view.kind === "design"
      ? "design"
      : view.kind === "tasks"
        ? "tasks"
        : "documents";

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
          }
        } catch {
          brief = fallbackPrd(current);
          setError("The model did not answer, so this brief was drafted from your setup answers.");
        }
        useVibe.getState().setPrd(projectId, brief);
        // Keep the PRD document in lockstep with the brief view.
        const prdDoc = useVibe
          .getState()
          .docsByProject[projectId]?.find((entry) => entry.kind === "prd");
        if (prdDoc && prdDoc.markdown !== brief) {
          useVibe.getState().updateDoc(projectId, prdDoc.id, {
            markdown: brief,
            updatedAt: new Date().toISOString(),
          });
        }
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

  // The Plan documents seed once per project: the six engineering docs.
  // The PRD inherits whatever the brief holds at seed time; the brief
  // generator writes back to it afterwards, so they never drift apart.
  useEffect(() => {
    if (!project || project.status === "draft") return;
    const state = useVibe.getState();
    if (state.docsByProject[projectId] !== undefined) return;
    const now = new Date().toISOString();
    state.seedDocs(projectId, [
      {
        id: "doc-prd",
        kind: "prd",
        title: "PRD",
        markdown: state.prdByProject[projectId] ?? "",
        updatedAt: now,
      },
      ...DOC_TYPES.filter((entry) => entry.kind !== "prd").map((entry) => ({
        id: `doc-${entry.kind}`,
        kind: entry.kind,
        title: entry.label,
        markdown: "",
        updatedAt: now,
      })),
    ]);
  }, [project, projectId]);

  // Design keeps exactly one canvas, named Prototype. An older multi-canvas
  // project adopts its first non-plan canvas; the rest stay orphaned in
  // storage but out of the way.
  useEffect(() => {
    if (!project || project.status === "draft") return;
    const state = useVibe.getState();
    const list = state.screensByProject[projectId] ?? EMPTY_SCREENS;
    if (list.some((screen) => screen.name === "Prototype")) return;
    const makeId = (prefix: string) =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `${prefix}-${crypto.randomUUID()}`
        : `${prefix}-${Date.now()}`;
    const first = list.find((screen) => screen.name !== "Plan");
    const next = first
      ? list.map((screen) =>
          screen === first ? { ...screen, name: "Prototype" } : screen,
        )
      : [
          ...list,
          {
            id: makeId("screen"),
            name: "Prototype",
            canvasJson: "",
            components: [],
          },
        ];
    state.setScreens(projectId, next);
  }, [project, projectId]);

  /** Write a doc and keep the Product brief in sync when it is the PRD. */
  const saveDocMarkdown = useCallback(
    (docId: string, markdown: string) => {
      const now = new Date().toISOString();
      const state = useVibe.getState();
      state.updateDoc(projectId, docId, { markdown, updatedAt: now });
      const doc = state.docsByProject[projectId]?.find(
        (entry) => entry.id === docId,
      );
      if (doc?.kind === "prd") state.setPrd(projectId, markdown);
    },
    [projectId],
  );

  const generateDoc = useCallback(
    async (docId: string) => {
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === projectId);
      const doc = state.docsByProject[projectId]?.find(
        (entry) => entry.id === docId,
      );
      if (!current || !doc || doc.kind === "note" || docBusy) return;
      setDocBusy(docId);
      try {
        const reply = await requestAi(
          "doc",
          buildDocPrompt(doc.kind as DocKind, current, state.prdByProject[projectId] ?? ""),
          current.model,
        );
        const markdown = parseDocMarkdown(reply.text);
        if (markdown.trim()) saveDocMarkdown(docId, markdown);
        else {
          saveDocMarkdown(
            docId,
            `# ${doc.title} (local draft)\n\n> The model is unavailable, so this is a starting outline. Generate again with the model for full content.\n\nIdea: ${current.idea}\n`,
          );
        }
      } catch {
        saveDocMarkdown(
          docId,
          `# ${doc.title} (local draft)\n\n> The model did not answer, so this is a starting outline. Generate again with the model for full content.\n\nIdea: ${current.idea}\n`,
        );
      } finally {
        setDocBusy(null);
      }
    },
    [projectId, docBusy, saveDocMarkdown],
  );

  const generatePrototype = useCallback(async () => {
    const state = useVibe.getState();
    const current = state.projects.find((entry) => entry.id === projectId);
    if (!current || protoBusy) return;
    setProtoBusy(true);
    try {
      const reply = await requestAi(
        "prototype",
        buildPrototypePrompt(current, state.prdByProject[projectId] ?? ""),
        current.model,
      );
      const html =
        parsePrototypeHtml(reply.text) ||
        `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<title>${current.name}</title>\n</head>\n<body>\n<h1>${current.name}</h1>\n<p>${current.idea}</p>\n</body>\n</html>`;
      const existing = (state.filesByProject[projectId] ?? EMPTY_FILES).find(
        (file) => file.path === "prototype.html",
      );
      if (existing) {
        state.updateFile(projectId, existing.id, html);
      } else {
        state.setFiles(projectId, [
          ...(state.filesByProject[projectId] ?? []),
          {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `file-${Date.now()}`,
            path: "prototype.html",
            content: html,
            language: "html",
          },
        ]);
      }
    } finally {
      setProtoBusy(false);
    }
  }, [projectId, protoBusy]);

  const handleShapes = useCallback(
    (screenId: string, shapesJson: string) => {
      const state = useVibe.getState();
      const current = state.screensByProject[projectId] ?? EMPTY_SCREENS;
      const existing =
        current.find((screen) => screen.id === screenId)?.canvasJson ?? "";
      // Skip echo saves: the shapes that seeded the canvas must not be
      // written straight back, or every mount would dirty the store.
      if (shapesJson === existing) return;
      state.setScreens(
        projectId,
        current.map((screen) =>
          screen.id === screenId
            ? { ...screen, canvasJson: shapesJson }
            : screen,
        ),
      );
    },
    [projectId],
  );

  const prototypeScreen =
    screens.find((screen) => screen.name === "Prototype") ??
    screens[0] ??
    null;
  const activeDoc =
    docs.find((entry) => entry.id === selectedDocKey) ?? docs[0] ?? null;
  const prototypeFile =
    files.find((file) => file.path === "prototype.html") ?? null;
  const selectedTask =
    selectedTaskId ? (tasks.find((task) => task.id === selectedTaskId) ?? null) : null;

  const patchTask = useCallback(
    (id: string, patch: Partial<Pick<Task, "title" | "notes">>) => {
      const all = useVibe.getState().tasksByProject[projectId] ?? EMPTY_TASKS;
      useVibe
        .getState()
        .setTasks(
          projectId,
          all.map((task) => (task.id === id ? { ...task, ...patch } : task)),
        );
    },
    [projectId],
  );

  const moveTaskById = useCallback(
    (id: string, next: TaskStatus) => {
      const task = (useVibe.getState().tasksByProject[projectId] ?? EMPTY_TASKS).find(
        (entry) => entry.id === id,
      );
      if (task && task.status !== next) {
        useVibe.getState().moveTask(projectId, id, next);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!selectedTaskId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTaskId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedTaskId]);
  // Referentially stable across renders: a fresh object identity on every
  // render would look like new seeds to the canvas and remount it.
  const designShapes = useMemo(
    () => parseCanvasShapes(prototypeScreen?.canvasJson ?? ""),
    [prototypeScreen?.canvasJson],
  );


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
    <div className="relative flex h-dvh flex-col bg-[#0b0c10] text-[#f5f6f8]">
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
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
        </div>

        <nav
          aria-label="Workspace views"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex"
        >
          {(["documents", "design", "tasks"] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  if (tab === "documents") setView({ kind: "documents" });
                  else if (tab === "tasks") setView({ kind: "tasks" });
                  else setView({ kind: "design" });
                }}
                aria-current={selected || undefined}
                className={`h-7 rounded-full px-4 text-[13px] font-medium capitalize transition-colors ${
                  selected
                    ? "bg-white text-black"
                    : "text-[#9aa0ae] hover:text-white"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </header>

      {isMobile && (
        <div className="shrink-0 border-b border-white/10 px-4 py-2">
          <SegmentedControl
            label="Workspace view"
            value={activeTab}
            onChange={(next) => {
              if (next === "documents") setView({ kind: "documents" });
              else if (next === "design") setView({ kind: "design" });
              else if (next === "tasks") setView({ kind: "tasks" });
            }}
            size="sm"
            layout="fill"
          >
            <SegmentedControlItem label="Documents" value="documents" />
            <SegmentedControlItem label="Design" value="design" />
            <SegmentedControlItem label="Tasks" value="tasks" />
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
        <main className="flex min-w-0 flex-1 flex-col bg-[#0b0c10]">
          {view.kind === "documents" && (
            <DocumentsView
              docs={docs}
              selectedKey={selectedDocKey}
              onSelect={setSelectedDocKey}
              activeDoc={activeDoc}
              bottomPad={chatHeight}
              canGenerate={!!activeDoc && activeDoc.kind !== "note"}
              generating={!!activeDoc && docBusy === activeDoc.id}
              modelLabel={
                project.model ? formatModelLabel(project.model) : "Muse"
              }
              onMarkdown={(markdown) =>
                activeDoc && saveDocMarkdown(activeDoc.id, markdown)
              }
              onGenerate={() => activeDoc && void generateDoc(activeDoc.id)}
            />
          )}

          {view.kind === "tasks" && (
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4">
                {tasksLocal && (
                  <p className="mb-3 shrink-0 text-[11px] text-[#9aa0ae]">
                    Tasks were drafted locally, without the model.
                  </p>
                )}

                <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto pb-1">
                  {COLUMNS.map((column) => (
                    <TaskColumn
                      key={column.status}
                      status={column.status}
                      tasks={tasks.filter((task) => task.status === column.status)}
                      loading={phase === "tasks" && tasks.length === 0}
                      selectedId={selectedTaskId}
                      onOpen={(task) => setSelectedTaskId(task.id)}
                      onMoveById={moveTaskById}
                    />
                  ))}
                </div>
              </div>

              {selectedTask && (
                <>
                  <button
                    type="button"
                    aria-label="Close task details"
                    onClick={() => setSelectedTaskId(null)}
                    className="absolute inset-0 z-20 bg-black/50 md:hidden"
                  />
                  <TaskDetailPanel
                    task={selectedTask}
                    onPatch={(patch) => patchTask(selectedTask.id, patch)}
                    onMove={(next) => moveTaskById(selectedTask.id, next)}
                    onDelete={() => {
                      useVibe.getState().removeTask(projectId, selectedTask.id);
                      setSelectedTaskId(null);
                    }}
                    onClose={() => setSelectedTaskId(null)}
                  />
                </>
              )}
            </div>
          )}

          {view.kind === "design" && (
            <div className="relative min-h-0 flex-1">
              <div className="h-full min-h-0">
                {prototypeFile && prototypeScreen ? (
                  <DesignCanvas
                    key={prototypeScreen.id}
                    initialShapes={designShapes}
                    html={prototypeFile.content}
                    onShapes={(shapesJson) =>
                      handleShapes(prototypeScreen.id, shapesJson)
                    }
                  />
                ) : (
                  <div className="grid h-full place-items-center px-5">
                    <div className="max-w-sm text-center">
                      <p className="text-[15px] font-semibold">
                        No prototype yet
                      </p>
                      <p className="mt-2 text-[13px] text-[#9aa0ae]">
                        Generate a single-file page from the idea and brief.
                        It renders live on the canvas as an HTML prototype.
                      </p>
                      <button
                        type="button"
                        onClick={() => void generatePrototype()}
                        disabled={protoBusy}
                        className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90 disabled:opacity-50"
                      >
                        {protoBusy
                          ? "Generating…"
                          : `Generate with ${project.model ? formatModelLabel(project.model) : "Muse"}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <WorkspaceChat
        key={projectId}
        project={project}
        brief={prd}
        docs={docs}
        tasks={tasks}
        onHeightChange={setChatHeight}
      />
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

function Bar({ width }: { width: string }) {
  return (
    <div
      aria-hidden
      className="h-3 animate-pulse rounded bg-white/10"
      style={{ width }}
    />
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open ]);

  const current = COLUMNS.find((column) => column.status === value) ?? COLUMNS[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Task status"
        onClick={() => setOpen((previous) => !previous)}
        className="flex h-9 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-[13px] text-[#f5f6f8] hover:border-white/25 hover:bg-white/10"
      >
        <StatusDot variant={current.variant} label={`${current.label} status`} />
        <span className="flex-1">{current.label}</span>
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
          className={`shrink-0 text-[#9aa0ae] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Pick a task status"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-white/10 bg-[#17181d] p-1.5 shadow-2xl"
        >
          {COLUMNS.map((column) => {
            const selected = column.status === value;
            return (
              <button
                key={column.status}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(column.status);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] ${
                  selected
                    ? "bg-white/10 text-white"
                    : "text-[#c9cdd6] hover:bg-white/5 hover:text-white"
                }`}
              >
                <StatusDot
                  variant={column.variant}
                  label={`${column.label} status`}
                />
                <span className="flex-1">{column.label}</span>
                {selected && (
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
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskDetailPanel({
  task,
  onPatch,
  onMove,
  onDelete,
  onClose,
}: {
  task: Task;
  onPatch: (patch: Partial<Pick<Task, "title" | "notes">>) => void;
  onMove: (next: TaskStatus) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const meta = COLUMNS.find((column) => column.status === task.status) ?? COLUMNS[0];
  return (
    <aside
      aria-label="Task details"
      className="absolute inset-y-0 right-0 z-30 flex w-[320px] max-w-[85vw] flex-col border-l border-white/10 bg-[#0f1014] md:static md:z-auto md:w-[320px] md:max-w-none md:shrink-0"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <StatusDot variant={meta.variant} label={`${meta.label} status`} />
        <span className="text-[13px] font-semibold text-[#f5f6f8]">
          Task details
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close task details"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[#9aa0ae] hover:bg-white/10 hover:text-white"
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
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <label
            htmlFor="task-detail-title"
            className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#5b6472]"
          >
            Title
          </label>
          <input
            id="task-detail-title"
            value={task.title}
            onChange={(event) => onPatch({ title: event.target.value })}
            placeholder="Untitled task"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-[#f5f6f8] placeholder:text-[#5b6472] focus:border-white/25 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="task-detail-status"
            className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#5b6472]"
          >
            Status
          </label>
          <div id="task-detail-status" className="mt-1.5">
            <StatusPicker value={task.status} onChange={onMove} />
          </div>
        </div>

        <div>
          <label
            htmlFor="task-detail-notes"
            className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#5b6472]"
          >
            Notes
          </label>
          <textarea
            id="task-detail-notes"
            value={task.notes ?? ""}
            onChange={(event) => onPatch({ notes: event.target.value })}
            placeholder="Add details, links, acceptance criteria…"
            rows={6}
            className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] leading-relaxed text-[#e8ebf0] placeholder:text-[#5b6472] focus:border-white/25 focus:outline-none"
          />
        </div>

        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#f0a6a6]/40 px-3 text-[13px] font-medium text-[#f0a6a6] hover:bg-[#f0a6a6]/10"
          >
            Delete task
          </button>
        </div>
      </div>
    </aside>
  );
}

function TaskColumn({
  status,
  tasks,
  loading,
  selectedId,
  onOpen,
  onMoveById,
}: {
  status: TaskStatus;
  tasks: Task[];
  loading: boolean;
  selectedId: string | null;
  onOpen: (task: Task) => void;
  onMoveById: (id: string, next: TaskStatus) => void;
}) {
  const meta = COLUMNS.find((column) => column.status === status) ?? COLUMNS[0];
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  return (
    <Card
      variant="muted"
      padding={0}
      className={`flex min-h-0 min-w-[220px] flex-1 flex-col ${isOver ? "border-white/40" : ""}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <StatusDot variant={meta.variant} label={`${meta.label} status`} />
        <span className="text-[13px] font-semibold text-[#f5f6f8]">
          {meta.label}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-[#9aa0ae]">
          {tasks.length}
        </span>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setIsOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsOver(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          const id = event.dataTransfer.getData("text/plain");
          if (id) onMoveById(id, status);
        }}
      >
        {loading && (
          <Card>
            <Bar width="82%" />
            <div className="mt-2">
              <Bar width="54%" />
            </div>
          </Card>
        )}

        {!loading && tasks.length === 0 && (
          <EmptyState
            isCompact
            icon={<Icon icon={meta.emptyIcon} size="lg" color="secondary" />}
            title={meta.emptyTitle}
            description={meta.emptyDescription}
          />
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
              setDraggingId(task.id);
            }}
            onDragEnd={() => setDraggingId(null)}
            onClick={() => onOpen(task)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(task);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${task.title}`}
            className={`group cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${draggingId === task.id ? "opacity-50" : ""}`}
          >
            <Card className={selectedId === task.id ? "ring-1 ring-white/50" : ""}>
              <p
                className={`text-[13px] font-medium leading-snug ${
                  task.status === "done" || task.status === "cancelled"
                    ? "text-[#9aa0ae] line-through"
                    : "text-[#f5f6f8]"
                }`}
              >
                {task.title}
              </p>
              {task.notes && (
                <Text type="supporting" color="secondary" maxLines={3}>
                  {task.notes}
                </Text>
              )}
            </Card>
          </div>
        ))}
      </div>
    </Card>
  );
}

function describeAnswerValue(value: string | string[]): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return typeof value === "string" ? value.trim() : "";
}
