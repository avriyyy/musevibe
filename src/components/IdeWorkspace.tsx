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
import type { ChatQuote } from "@/lib/pick";
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
import DesignSidebar from "@/components/DesignSidebar";
import type { CanvasFrame } from "@/components/DesignCanvas";
import WorkspaceChat from "@/components/WorkspaceChat";
import WorkspacePicker from "@/components/WorkspacePicker";
import LoadingSticker from "@/stickers/LoadingSticker";
import { FRAME_H, FRAME_W, parseCanvasShapes } from "@/lib/canvas";
import { useVibe } from "@/lib/store";
import {
  MAX_LOGO_HISTORY,
  fileToLogoDataUrl,
  initials,
  removeLogoBackground,
  sanitizeLogoSvg,
  svgToDataUrl,
} from "@/lib/logo";
import LogoModal from "@/components/LogoModal";
import { formatModelLabel } from "@/lib/models";
import {
  DOC_TYPES,
  buildDocFallback,
  buildDocRepairPrompt,
  buildDocPrompt,
  hasVisibleContent,
  inspectDocMarkdown,
  looksLikeFrameworkCode,
  missingPageSections,
  normalizePrototypeHtml,
  parseDocMarkdown,
  type DocKind,
} from "@/lib/docs";
import {
  buildPrdPrompt,
  buildTasksPrompt,
  fallbackPrd,
  fallbackTasks,
  parseTasks,
} from "@/lib/plan";
import {
  buildActionPrompt,
  checkPinnedDocIntegrity,
  parseActionResponse,
  type ChatAction,
} from "@/lib/chat";
import { DESIGN_SYSTEMS } from "@/lib/design-systems-catalog";
import { downloadTextFile } from "@/lib/download";
import {
  SHOWCASE_PATH,
  buildFallbackPageHtml,
  buildPagePlanPrompt,
  buildPageRepairPrompt,
  buildPagePrompt,
  buildSamplePreviewHtmlFallback,
  buildShowcasePrompt,
  buildShowcaseRepairPrompt,
  fallbackPagePlan,
  pageFilePath,
  parsePagePlan,
  resolveProjectDesignSystem,
  type PlannedPage,
} from "@/lib/design-system";
import type { CodeFile, Project, ProjectDoc, Screen, Task, TaskStatus } from "@/lib/types";

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
  reason?: string;
  status?: number;
}

async function requestAi(
  kind: "prd" | "tasks" | "doc" | "prototype" | "pages" | "chat",
  prompt: string,
  model?: string,
): Promise<AiReply> {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, prompt, ...(model ? { model } : {}) }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `The model request failed (${response.status}).`,
    );
  }
  const data = (await response.json()) as {
    text?: unknown;
    source?: unknown;
    reason?: unknown;
    status?: unknown;
  };
  return {
    text: typeof data.text === "string" ? data.text : "",
    source: data.source === "ai" ? "ai" : "local",
    ...(typeof data.reason === "string" ? { reason: data.reason } : {}),
    ...(typeof data.status === "number" ? { status: data.status } : {}),
  };
}

/**
 * Validate-then-repair flow used by first-run preparation. One model attempt,
 * one repair naming every failure,
 * then the explicitly local fallback. Local provider responses never pass
 * as AI: only source === "ai" with a passing inspection returns "ai".
 */
async function requestValidatedPrd(
  project: Project,
): Promise<{ markdown: string; source: 'ai' | 'local' }> {
  let reply: AiReply;
  try {
    reply = await requestAi('prd', buildPrdPrompt(project), project.model);
  } catch {
    return { markdown: fallbackPrd(project), source: 'local' };
  }
  if (reply.source !== 'ai') {
    return { markdown: fallbackPrd(project), source: 'local' };
  }
  const first = parseDocMarkdown(reply.text);
  if (first.trim() && inspectDocMarkdown('prd', first).ok) {
    return { markdown: first, source: 'ai' };
  }
  const firstCheck = inspectDocMarkdown('prd', first);
  try {
    const retry = await requestAi(
      'prd',
      buildDocRepairPrompt('prd', project, '', first, firstCheck.missing),
      project.model,
    );
    const fixed = parseDocMarkdown(retry.text);
    if (retry.source === 'ai' && fixed.trim() && inspectDocMarkdown('prd', fixed).ok) {
      return { markdown: fixed, source: 'ai' };
    }
  } catch {
    // Fall through to the local fallback below.
  }
  return { markdown: fallbackPrd(project), source: 'local' };
}

function aiFailureNote(reply: AiReply): string {
  if (reply.reason === "missing-key") {
    return "Muse isn't connected for this project yet.";
  }
  if (reply.reason === "timeout") {
    return "Muse took too long to answer.";
  }
  if (reply.reason === "network") {
    return "Muse couldn't be reached.";
  }
  if (reply.reason === "http") {
    return "Muse couldn't complete the request.";
  }
  return "Muse didn't return a usable answer.";
}

function localDraftNote(reply: AiReply, item: string): string {
  return `${aiFailureNote(reply)} I saved a local ${item} instead, so you can keep working. Use ⋯ → Regenerate to try again.`;
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState<{ id: number; quote: ChatQuote } | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickSession, setPickSession] = useState(0);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  // Picking needs the composer open, so leaving a view or closing the chat
  // always disarms it.
  const changeView = useCallback((next: View) => {
    setPicking(false);
    setView(next);
  }, []);
  const changeChatOpen = useCallback((next: boolean) => {
    if (!next) setPicking(false);
    setChatOpen(next);
  }, []);

  // Quote something into the chat input (appended, never auto-sent) and
  // reveal the composer so the user sees it land.
  const quoteToChat = useCallback((quote: ChatQuote) => {
    if (!quote.label && !quote.text && !quote.comment) return;
    setChatDraft({ id: Date.now(), quote });
    setChatOpen(true);
  }, []);
  const [docBusy, setDocBusy] = useState<string | null>(null);
  const [showcaseBusy, setShowcaseBusy] = useState(false);
  const [showcaseError, setShowcaseError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState<ReadonlySet<string>>(new Set());
  const [pageErrors, setPageErrors] = useState<Record<string, string>>({});
  const [allProgress, setAllProgress] = useState<{
    done: number;
    total: number;
    currentTitle: string;
  } | null>(null);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const showcaseRequestedRef = useRef("");
  type PrepStepId = "documents" | "tasks" | "design";
  const [prepActive, setPrepActive] = useState<PrepStepId | null>(null);
  const [prepDoneIds, setPrepDoneIds] = useState<PrepStepId[]>([]);
  const preparedRef = useRef(false);
  const [tasksLocal, setTasksLocal] = useState(false);
  const [error, setError] = useState("");
  const isMobile = useMediaQuery("(max-width: 768px)");

  /** Which navbar tab the current view belongs to. */
  const activeTab =
    view.kind === "design"
      ? "design"
      : view.kind === "tasks"
        ? "tasks"
        : "documents";

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
    (docId: string, markdown: string, source?: ProjectDoc["source"]) => {
      const now = new Date().toISOString();
      const state = useVibe.getState();
      state.updateDoc(projectId, docId, {
        markdown,
        updatedAt: now,
        ...(source ? { source } : {}),
      });
      const doc = state.docsByProject[projectId]?.find(
        (entry) => entry.id === docId,
      );
      if (doc?.kind === "prd") state.setPrd(projectId, markdown);
    },
    [projectId],
  );

  /** Manual typing is never mistaken for model output. */
  const handleManualMarkdown = useCallback(
    (docId: string, markdown: string) => {
      saveDocMarkdown(docId, markdown, "edited");
    },
    [saveDocMarkdown],
  );

  const generateDoc = useCallback(
    async (docId: string) => {
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === projectId);
      const doc = state.docsByProject[projectId]?.find(
        (entry) => entry.id === docId,
      );
      if (!current || !doc || doc.kind === "note" || docBusy) return;
      const kind = doc.kind as DocKind;
      const brief = state.prdByProject[projectId] ?? "";
      if (kind === "prd") setError("");
      setDocBusy(docId);
      setDocErrors((prev) => {
        if (!(docId in prev)) return prev;
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      try {
        let reply: AiReply;
        try {
          reply = await requestAi(
            "doc",
            buildDocPrompt(kind, current, brief),
            current.model,
          );
        } catch {
          const fallback = buildDocFallback(kind, current, brief);
          saveDocMarkdown(docId, fallback, "local");
          setDocErrors((prev) => ({
            ...prev,
            [docId]:
              "Muse couldn't be reached, so I saved a local outline instead. You can keep editing it or use ⋯ → Regenerate later.",
          }));
          return;
        }
        const first = parseDocMarkdown(reply.text);
        const firstCheck = inspectDocMarkdown(kind, first);
        if (reply.source === "ai" && firstCheck.ok) {
          saveDocMarkdown(docId, first, "ai");
          return;
        }
        if (reply.source === "ai") {
          // One repair attempt naming the missing contract.
          try {
            const retry = await requestAi(
              "doc",
              buildDocRepairPrompt(kind, current, brief, first, firstCheck.missing),
              current.model,
            );
            const fixed = parseDocMarkdown(retry.text);
            if (
              retry.source === "ai" &&
              inspectDocMarkdown(kind, fixed).ok
            ) {
              saveDocMarkdown(docId, fixed, "ai");
              return;
            }
          } catch {
            // Fall through to the local outline below.
          }
          const fallback = buildDocFallback(kind, current, brief);
          saveDocMarkdown(docId, fallback, "local");
          setDocErrors((prev) => ({
            ...prev,
            [docId]:
              "Muse's answer was incomplete, so I saved a local outline instead. Your document is still usable; choose ⋯ → Regenerate to try again.",
          }));
          return;
        }
        const fallback = buildDocFallback(kind, current, brief);
        saveDocMarkdown(docId, fallback, "local");
        setDocErrors((prev) => ({
          ...prev,
          [docId]: localDraftNote(reply, "outline"),
        }));
      } finally {
        setDocBusy(null);
      }
    },
    [projectId, docBusy, saveDocMarkdown],
  );

  /** Write one HTML file into the project files, replacing any same path. */
  const saveHtmlFile = useCallback(
    (path: string, html: string, source?: CodeFile["source"]) => {
      const state = useVibe.getState();
      const existing = (state.filesByProject[projectId] ?? EMPTY_FILES).find(
        (file) => file.path === path,
      );
      if (existing) {
        state.updateFile(projectId, existing.id, html, source);
        return;
      }
      state.setFiles(projectId, [
        ...(state.filesByProject[projectId] ?? []),
        {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `file-${Date.now()}`,
          path,
          content: html,
          language: "html",
          ...(source ? { source } : {}),
        },
      ]);
    },
    [projectId],
  );

  const downloadPage = useCallback(
    (slug: string) => {
      const file = (useVibe.getState().filesByProject[projectId] ?? EMPTY_FILES).find(
        (entry) => entry.path === pageFilePath(slug),
      );
      if (!file) return;
      downloadTextFile(`${slug}.html`, file.content, "text/html;charset=utf-8");
    },
    [projectId],
  );

  const dsEntry = useMemo(() => {
    const dsId =
      project?.designSystem?.source === "template"
        ? project.designSystem.id
        : "minimal";
    return (
      DESIGN_SYSTEMS.find((entry) => entry.id === dsId) ??
      DESIGN_SYSTEMS.find((entry) => entry.id === "minimal")
    );
  }, [project?.designSystem]);
  // Template systems show their real preview pages; custom ones (upload /
  // link) keep one generated showcase frame.
  const useTemplatePreviews =
    (!project?.designSystem ||
      project.designSystem.source === "template") &&
    (dsEntry?.previews.length ?? 0) > 0;
  /** First frame on the canvas: the chosen design system as a gallery page. */
  const generateShowcase = useCallback(async () => {
    const state = useVibe.getState();
    const current = state.projects.find((entry) => entry.id === projectId);
    if (!current || showcaseBusy) return;
    setShowcaseBusy(true);
    setShowcaseError("");
    try {
      const system = await resolveProjectDesignSystem(current);
      let reply: AiReply;
      try {
        reply = await requestAi(
          "prototype",
          buildShowcasePrompt(
            current.name,
            current.idea,
            system.designMd,
            system.tokensCss,
          ),
          current.model,
        );
      } catch {
        saveHtmlFile(
          SHOWCASE_PATH,
          buildSamplePreviewHtmlFallback(current, system),
          "local",
        );
        setShowcaseError(
          "Muse couldn't finish the style preview, so I saved a local preview instead. Use ⋯ → Regenerate to try again.",
        );
        return;
      }
      let html = normalizePrototypeHtml(reply.text);
      const showcaseValid = (value: string) =>
        hasVisibleContent(value) && !looksLikeFrameworkCode(value);
      if (reply.source === "ai" && !showcaseValid(html)) {
        // One repair attempt before the local fallback.
        try {
          const retry = await requestAi(
            "prototype",
            buildShowcaseRepairPrompt(
              current.name,
              current.idea,
              system.designMd,
              system.tokensCss,
            ),
            current.model,
          );
          const fixed = normalizePrototypeHtml(retry.text);
          if (retry.source === "ai" && showcaseValid(fixed)) {
            html = fixed;
            saveHtmlFile(SHOWCASE_PATH, html, "ai");
            return;
          }
        } catch {
          // Keep the first attempt below.
        }
      }
      if (reply.source === "ai" && showcaseValid(html)) {
        saveHtmlFile(SHOWCASE_PATH, html, "ai");
        return;
      }
      if (reply.source === "local") {
        saveHtmlFile(
          SHOWCASE_PATH,
          buildSamplePreviewHtmlFallback(current, system),
          "local",
        );
        setShowcaseError(localDraftNote(reply, "style preview"));
        return;
      }
      saveHtmlFile(
        SHOWCASE_PATH,
        buildSamplePreviewHtmlFallback(current, system),
        "local",
      );
      setShowcaseError(
        "Muse returned an incomplete style preview, so I saved a local preview instead. Use ⋯ → Regenerate to try again.",
      );
    } catch {
      const stateNow = useVibe.getState();
      const currentNow = stateNow.projects.find((entry) => entry.id === projectId);
      if (currentNow) {
        try {
          const system = await resolveProjectDesignSystem(currentNow);
          saveHtmlFile(
            SHOWCASE_PATH,
            buildSamplePreviewHtmlFallback(currentNow, system),
            "local",
          );
          setShowcaseError(
            "Muse couldn't finish the style preview, so I saved a local preview instead. Use ⋯ → Regenerate to try again.",
          );
        } catch {
          setShowcaseError("Muse couldn't draw the style preview. Use ⋯ → Regenerate to try again.");
        }
      }
    } finally {
      setShowcaseBusy(false);
    }
  }, [projectId, showcaseBusy, saveHtmlFile]);

  // Draw the showcase once per project, so the design tab opens on the
  // system instead of an empty canvas. Template systems show their real
  // preview pages, so only custom systems need a generated showcase.
  useEffect(() => {
    if (!project || project.status === "draft") return;
    if (useTemplatePreviews) return;
    const state = useVibe.getState();
    // Files load lazily; an unseeded project has no entry yet.
    if (state.filesByProject[projectId] === undefined) return;
    const has = (state.filesByProject[projectId] ?? []).some(
      (file) => file.path === SHOWCASE_PATH,
    );
    if (has || showcaseRequestedRef.current === projectId) return;
    showcaseRequestedRef.current = projectId;
    void generateShowcase();
    // The request guard keeps this to one run per project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectId]);

  /** Draft the page list from the PRD; the local plan keeps it usable offline. */
  const suggestPages = useCallback(async () => {
    const state = useVibe.getState();
    const current = state.projects.find((entry) => entry.id === projectId);
    if (!current || suggesting) return;
    setSuggesting(true);
    try {
      const reply = await requestAi(
        "pages",
        buildPagePlanPrompt(
          current.name,
          current.idea,
          state.prdByProject[projectId] ?? "",
          (state.docsByProject[projectId] ?? EMPTY_DOCS).find(
            (doc) => doc.kind === "afd",
          )?.markdown ?? "",
        ),
        current.model,
      );
      const pages = parsePagePlan(reply.text) ?? fallbackPagePlan();
      state.updateProject(projectId, { pagePlan: pages });
    } catch {
      const stateNow = useVibe.getState();
      stateNow.updateProject(projectId, { pagePlan: fallbackPagePlan() });
    } finally {
      setSuggesting(false);
    }
  }, [projectId, suggesting]);

  /**
   * Generate one planned page in the chosen design system. Returns true when
   * the page file was written, false when an edit left the existing page
   * untouched so the caller can restore the chat request.
   */
  const generatePage = useCallback(
    async (slug: string, note?: string): Promise<boolean> => {
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === projectId);
      const plan: PlannedPage[] = current?.pagePlan ?? [];
      const page = plan.find((entry) => entry.slug === slug);
      if (!current || !page || generatingSlugs.has(slug)) return false;
      const existingHtml = (
        useVibe.getState().filesByProject[projectId] ?? []
      ).find((file) => file.path === pageFilePath(slug))?.content;
      // A chat-requested edit must never replace a real page with a local
      // fallback: on failure the current page stays and the call reports it.
      const isEdit = Boolean(note?.trim() && existingHtml);
      setGeneratingSlugs((prev) => new Set(prev).add(slug));
      setPageErrors((prev) => {
        if (!(slug in prev)) return prev;
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      try {
        const system = await resolveProjectDesignSystem(current);
        // Earlier screens in plan order, so the new page reuses their
        // header, nav, footer, and route names instead of drifting.
        const priorPages = plan
          .slice(0, plan.findIndex((entry) => entry.slug === slug))
          .map((entry) => {
            const file = (
              useVibe.getState().filesByProject[projectId] ?? []
            ).find((candidate) => candidate.path === pageFilePath(entry.slug));
            return file
              ? { title: entry.title, slug: entry.slug, html: file.content }
              : null;
          })
          .filter((entry) => entry !== null);
        const docs = state.docsByProject[projectId] ?? EMPTY_DOCS;
        const appFlow =
          docs.find((doc) => doc.kind === "afd")?.markdown ?? "";
        const context = {
          projectName: current.name,
          idea: current.idea,
          prd: state.prdByProject[projectId] ?? "",
          appFlow,
          page,
          designMd: system.designMd,
          tokensCss: system.tokensCss,
          plan,
          priorPages,
          userNote: note,
          logoUrl: current.logoUrl,
          ...(existingHtml ? { existingHtml } : {}),
        };
        let reply: AiReply;
        try {
          reply = await requestAi(
            "prototype",
            buildPagePrompt(context),
            current.model,
          );
        } catch {
          if (isEdit) {
            setPageErrors((prev) => ({
              ...prev,
              [slug]:
                `Muse couldn't be reached. The existing "${page.title}" page is unchanged; use ⋯ → Regenerate to try again.`,
            }));
            return false;
          }
          saveHtmlFile(
            pageFilePath(slug),
            buildFallbackPageHtml(context),
            "local",
          );
          setPageErrors((prev) => ({
            ...prev,
            [slug]:
              "Muse couldn't finish this page, so I saved a local preview instead. Your page is usable; use ⋯ → Regenerate to try again.",
          }));
          return true;
        }
        let html = normalizePrototypeHtml(reply.text);
        const plannedSections = page.sections ?? [];
        const thin = (value: string) =>
          !hasVisibleContent(value) ||
          looksLikeFrameworkCode(value) ||
          (plannedSections.length > 0 &&
            missingPageSections(value, plannedSections).length >=
              Math.ceil(plannedSections.length / 2));
        if (reply.source === "ai" && thin(html)) {
          // One repair attempt: the last output would have rendered blank,
          // hidden its content, or is framework code instead of plain HTML.
          try {
            const retry = await requestAi(
              "prototype",
              buildPageRepairPrompt(context),
              current.model,
            );
            const fixed = normalizePrototypeHtml(retry.text);
            if (retry.source === "ai" && !thin(fixed)) html = fixed;
          } catch {
            // Keep the first attempt below.
          }
        }
        if (reply.source !== "ai") {
          if (isEdit) {
            setPageErrors((prev) => ({
              ...prev,
              [slug]:
                `${aiFailureNote(reply)} The existing "${page.title}" page is unchanged; try again later.`,
            }));
            return false;
          }
          saveHtmlFile(
            pageFilePath(slug),
            buildFallbackPageHtml(context),
            "local",
          );
          setPageErrors((prev) => ({
            ...prev,
            [slug]: localDraftNote(reply, "page preview"),
          }));
          return true;
        }
        if (thin(html)) {
          if (isEdit) {
            // Never replace a real page with a local fallback for an edit.
            setPageErrors((prev) => ({
              ...prev,
              [slug]:
                `Muse returned an incomplete page, so the existing "${page.title}" page is unchanged. Use ⋯ → Regenerate to try again.`,
            }));
            return false;
          }
          // Two failed attempts (including missing planned sections): draw
          // the screen locally from the tokens and the plan so the frame is
          // never a blank white page, and never save thin content as AI.
          saveHtmlFile(
            pageFilePath(slug),
            buildFallbackPageHtml(context),
            "local",
          );
          setPageErrors((prev) => ({
            ...prev,
            [slug]:
              "Muse returned an incomplete page, so I saved a local preview instead. Your page is usable; use ⋯ → Regenerate to try again.",
          }));
          return true;
        }
        saveHtmlFile(pageFilePath(slug), html, "ai");
        return true;
      } catch {
        setPageErrors((prev) => ({
          ...prev,
          [slug]: existingHtml
            ? "This page couldn't be updated, so your existing preview is unchanged. Use ⋯ → Regenerate to try again."
            : "This page couldn't be created. Use ⋯ → Generate to try again.",
        }));
        return false;
      } finally {
        setGeneratingSlugs((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [projectId, generatingSlugs, saveHtmlFile],
  );

  /** Generate every planned page that still lacks a frame, in plan order. */
  const allRunningRef = useRef(false);
  const generateAllPages = useCallback(async () => {
    if (allRunningRef.current) return;
    const state = useVibe.getState();
    const current = state.projects.find((entry) => entry.id === projectId);
    const plan: PlannedPage[] = current?.pagePlan ?? [];
    const files = state.filesByProject[projectId] ?? EMPTY_FILES;
    const missing = plan.filter(
      (page) => !files.some((file) => file.path === pageFilePath(page.slug)),
    );
    if (!missing.length) return;
    allRunningRef.current = true;
    setAllProgress({
      done: 0,
      total: missing.length,
      currentTitle: missing[0].title,
    });
    try {
      let done = 0;
      for (const page of missing) {
        setAllProgress({ done, total: missing.length, currentTitle: page.title });
        // Sequential on purpose: one model call at a time keeps long
        // reasoning generations from colliding. A failure records itself
        // in pageErrors and the loop continues with the next page.
        await generatePage(page.slug);
        done += 1;
      }
    } finally {
      allRunningRef.current = false;
      setAllProgress(null);
    }
  }, [projectId, generatePage]);

  /**
   * Run one chat prompt as actions, never as conversation. The model
   * returns a JSON action list; each entry is applied to the store and
   * the caller shows the one-line receipt.
   */
  const runChatAction = useCallback(
    async (
      message: string,
      pins: Array<ChatQuote>,
    ): Promise<{ ok: boolean; note: string }> => {
      const state = useVibe.getState();
      const current = state.projects.find((entry) => entry.id === projectId);
      if (!current) return { ok: false, note: "Project not found." };
      const brief = state.prdByProject[projectId] ?? "";
      const docs = state.docsByProject[projectId] ?? EMPTY_DOCS;
      const tasks = state.tasksByProject[projectId] ?? EMPTY_TASKS;
      const pages = (current.pagePlan ?? []).map((page) => ({
        slug: page.slug,
        title: page.title,
        generated: (state.filesByProject[projectId] ?? []).some(
          (file) => file.path === pageFilePath(page.slug),
        ),
      }));
      let reply: { text: string; source: "ai" | "local" };
      try {
        reply = await requestAi(
          "chat",
          buildActionPrompt(
            current,
            brief,
            docs,
            tasks,
            pages,
            pins,
            message,
          ),
          current.model,
        );
      } catch {
        return { ok: false, note: "The chat request failed." };
      }
      if (reply.source !== "ai") {
        return {
          ok: false,
          note: "The model is unavailable right now, so nothing changed.",
        };
      }
      const parsed = parseActionResponse(reply.text);
      if (!parsed) {
        return { ok: false, note: "The model did not answer with actions." };
      }
      // An empty action list is a no-op, not a success: keep the input and
      // pins so the user can rephrase instead of losing their context.
      if (!parsed.actions.length) {
        return { ok: false, note: parsed.note || "The model returned no actions, so nothing changed." };
      }
      const applied: string[] = [];
      const failures: string[] = [];
      let rejectedTarget = false;
      const pinnedDocKinds = pins
        .map((pin) => (pin.target?.kind === "doc" ? pin.target.docKind : undefined))
        .filter((kind): kind is string => Boolean(kind));
      const pinnedPageSlugs = pins
        .map((pin) => (pin.target?.kind === "page" ? pin.target.slug : undefined))
        .filter((slug): slug is string => Boolean(slug));
      const pinnedTaskTitles = pins
        .map((pin) => (pin.target?.kind === "task" ? pin.target.taskTitle : undefined))
        .filter((title): title is string => Boolean(title))
        .map((title) => title.trim().toLowerCase())
        .filter(Boolean);
      const taskStatusOf = (value: string): TaskStatus | null => {
        const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "");
        if (normalized === "todo" || normalized === "todoo") return "todo";
        if (normalized === "doing" || normalized === "inprogress") return "doing";
        if (normalized === "review" || normalized === "inreview") return "review";
        if (normalized === "blocked") return "blocked";
        if (normalized === "done") return "done";
        if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
        return null;
      };
      const normalizeTitle = (value: string) => value.trim().toLowerCase();
      for (const action of parsed.actions as ChatAction[]) {
        if (action.type === "update_doc") {
          if (pinnedDocKinds.length && !pinnedDocKinds.includes(action.kind)) {
            rejectedTarget = true;
            failures.push(`document "${action.kind}" did not match the pinned document`);
            continue;
          }
          const doc = useVibe
            .getState()
            .docsByProject[projectId]?.find(
              (entry) => entry.kind === action.kind,
            );
          if (!doc) {
            failures.push(`document "${action.kind}" was not found`);
            continue;
          }
          const replacement = action.markdown.trim();
          if (!replacement) {
            failures.push(`"${doc.title || doc.kind}" was left unchanged because the replacement was empty`);
            continue;
          }
          // Fail closed on pinned edits: a blank or truncated model reply
          // must never overwrite the stored document.
          if (pinnedDocKinds.includes(action.kind) || pinnedDocKinds.length) {
            const integrity = checkPinnedDocIntegrity(doc.markdown, replacement, message, pins);
            if (!integrity.ok) {
              failures.push(`"${doc.title || doc.kind}" was left unchanged (${integrity.reason})`);
              continue;
            }
          } else if (replacement.length < 80) {
            failures.push(`"${doc.title || doc.kind}" was left unchanged (the replacement was too short to be complete)`);
            continue;
          }
          saveDocMarkdown(doc.id, replacement);
          applied.push(doc.title || doc.kind);
        } else if (action.type === "add_task") {
          const entry: Task = {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `task-${Date.now()}`,
            title: action.title,
            status: "todo",
            ...(action.notes ? { notes: action.notes } : {}),
          };
          useVibe
            .getState()
            .setTasks(projectId, [
              ...(useVibe.getState().tasksByProject[projectId] ?? []),
              entry,
            ]);
          applied.push(`task "${entry.title}"`);
        } else if (action.type === "move_task") {
          const next = taskStatusOf(action.status);
          if (!next) {
            failures.push(`task "${action.title}" was left unchanged (unknown status "${action.status}")`);
            continue;
          }
          const wanted = normalizeTitle(action.title);
          if (!wanted) {
            failures.push("a task move was missing its target title, so nothing changed");
            continue;
          }
          const list = useVibe.getState().tasksByProject[projectId] ?? [];
          // Exact target only: a pinned task must match verbatim, and an
          // unpinned move must still match the full title. Never fall back
          // to a substring that could move the wrong task.
          const hit = list.find((entry) => normalizeTitle(entry.title) === wanted);
          if (!hit) {
            failures.push(`task "${action.title}" was not found, so nothing moved`);
            continue;
          }
          if (pinnedTaskTitles.length && !pinnedTaskTitles.includes(normalizeTitle(hit.title))) {
            rejectedTarget = true;
            failures.push(`task "${hit.title}" did not match the pinned task, so nothing moved`);
            continue;
          }
          useVibe
            .getState()
            .setTasks(
              projectId,
              list.map((entry) =>
                entry.id === hit.id ? { ...entry, status: next } : entry,
              ),
            );
          applied.push(`"${hit.title}" to ${next}`);
        } else if (action.type === "generate_page") {
          const st = useVibe.getState();
          const plan = st.projects.find((e) => e.id === projectId)?.pagePlan ?? [];
          const hit =
            plan.find((entry) => entry.slug === action.slug) ??
            plan.find((entry) =>
              entry.title.toLowerCase().includes(action.slug.toLowerCase()),
            );
          if (!hit) {
            failures.push(`page "${action.slug}" was not found, so nothing changed`);
            continue;
          }
          if (pinnedPageSlugs.length && !pinnedPageSlugs.includes(hit.slug)) {
            rejectedTarget = true;
            failures.push(`page "${hit.title}" did not match the pinned page, so nothing changed`);
            continue;
          }
          // Sequential on purpose: one model call at a time keeps long
          // reasoning generations from colliding.
          const wrote = await generatePage(hit.slug, action.note);
          if (!wrote) {
            failures.push(`the "${hit.title}" page was left unchanged`);
            continue;
          }
          applied.push(`page "${hit.title}"`);
        } else if (action.type === "rename_project") {
          useVibe.getState().updateProject(projectId, { name: action.name });
          applied.push("project name");
        }
      }
      if (!applied.length) {
        if (rejectedTarget) {
          return { ok: false, note: "The model targeted a different document, page, or task than the pinned one, so nothing changed." };
        }
        const reason = failures.length ? ` ${failures[0][0].toUpperCase()}${failures[0].slice(1)}.` : "";
        return { ok: false, note: `${parsed.note}${reason} Nothing changed.`.trim() };
      }
      // Partial completion is consumed (the chat clears): resubmitting the
      // same prompt would re-apply what already succeeded. Name both sides.
      if (failures.length) {
        return {
          ok: true,
          note: `${parsed.note} Changed: ${applied.join("; ")}. Could not finish: ${failures.join("; ")}.`,
        };
      }
      return {
        ok: true,
        note: `${parsed.note} Changed: ${applied.join("; ")}.`,
      };
    },
    [projectId, saveDocMarkdown, generatePage],
  );

  /**
   * First-run preparation behind a blur overlay: seed the six plan docs
   * and generate all of them, then tasks, then the auto-suggested page
   * plan. Nothing is generated beyond that, so the first workspace view
   * shows only the design system plus the suggested pages. Later mounts
   * skip this; the manual buttons cover any gaps.
   */
  const prepareProject = useCallback(async () => {
    const state0 = useVibe.getState();
    const current0 = state0.projects.find((entry) => entry.id === projectId);
    if (!current0) return;
    setPrepDoneIds([]);
    setPrepActive("documents");
    try {
      // Seed the six plan documents once.
      let st = useVibe.getState();
      if (st.docsByProject[projectId] === undefined) {
        const now = new Date().toISOString();
        st.seedDocs(projectId, [
          {
            id: "doc-prd",
            kind: "prd",
            title: "PRD",
            markdown: "",
            updatedAt: now,
          },
          ...DOC_TYPES.filter((entry) => entry.kind !== "prd").map(
            (entry) => ({
              id: `doc-${entry.kind}`,
              kind: entry.kind,
              title: entry.label,
              markdown: "",
              updatedAt: now,
            }),
          ),
        ]);
      }
      // Product brief (PRD), then the other five documents in parallel.
      // Use the same validate -> one repair -> local fallback flow as first run.
      let brief = useVibe.getState().prdByProject[projectId] ?? "";
      let briefSource: ProjectDoc["source"];
      if (!brief.trim()) {
        briefSource = "local";
        try {
          const result = await requestValidatedPrd(current0);
          brief = result.markdown;
          briefSource = result.source;
          if (result.source === 'local') {
            setError(
              "Muse couldn't finish your product brief, so I saved a local draft from your setup answers. You can keep editing it. Choose ⋯ → Regenerate in Documents to try again.",
            );
          }
        } catch {
          brief = fallbackPrd(current0);
          briefSource = 'local';
          setError(
            "Muse couldn't finish your product brief, so I saved a local draft from your setup answers. You can keep editing it. Choose ⋯ → Regenerate in Documents to try again.",
          );
        }
        useVibe.getState().setPrd(projectId, brief);
      }
      saveDocMarkdown(
        "doc-prd",
        brief,
        briefSource ?? useVibe.getState().docsByProject[projectId]?.find((entry) => entry.id === "doc-prd")?.source ?? 'local',
      );
      const rest = (
        useVibe.getState().docsByProject[projectId] ?? []
      ).filter((doc) => doc.kind !== "prd" && doc.kind !== "note");
      await Promise.all(
        rest.map(async (doc) => {
          const kind = doc.kind as DocKind;
          let reply: AiReply;
          try {
            reply = await requestAi(
              "doc",
              buildDocPrompt(kind, current0, brief),
              current0.model,
            );
          } catch {
            saveDocMarkdown(
              doc.id,
              buildDocFallback(kind, current0, brief),
              "local",
            );
            return;
          }
          const first = parseDocMarkdown(reply.text);
          if (reply.source === "ai" && inspectDocMarkdown(kind, first).ok) {
            saveDocMarkdown(doc.id, first, "ai");
            return;
          }
          if (reply.source === "ai") {
            try {
              const retry = await requestAi(
                "doc",
                buildDocRepairPrompt(
                  kind,
                  current0,
                  brief,
                  first,
                  inspectDocMarkdown(kind, first).missing,
                ),
                current0.model,
              );
              const fixed = parseDocMarkdown(retry.text);
              if (
                retry.source === "ai" &&
                inspectDocMarkdown(kind, fixed).ok
              ) {
                saveDocMarkdown(doc.id, fixed, "ai");
                return;
              }
            } catch {
              // Fall through to the local outline below.
            }
          }
          saveDocMarkdown(
            doc.id,
            buildDocFallback(kind, current0, brief),
            "local",
          );
        }),
      );
      setPrepDoneIds(["documents"]);
      setPrepActive("tasks");
      // Task board.
      st = useVibe.getState();
      if (!(st.tasksByProject[projectId] ?? []).length) {
        try {
          const reply = await requestAi(
            "tasks",
            buildTasksPrompt(current0, brief),
            current0.model,
          );
          const parsed =
            reply.source === "ai"
              ? parseTasks(reply.text, `task-${projectId.slice(0, 8)}`)
              : null;
          if (parsed) {
            useVibe.getState().setTasks(projectId, parsed);
          } else {
            useVibe.getState().setTasks(projectId, fallbackTasks(current0));
            setTasksLocal(true);
          }
        } catch {
          useVibe.getState().setTasks(projectId, fallbackTasks(current0));
          setTasksLocal(true);
        }
      }
      setPrepDoneIds(["documents", "tasks"]);
      setPrepActive("design");
      // Page plan, suggested automatically. No page is generated here:
      // the first workspace view shows only the design system plus the
      // suggested page list, and each page waits for its own Generate.
      st = useVibe.getState();
      if (!st.projects.find((entry) => entry.id === projectId)?.pagePlan) {
        try {
          const reply = await requestAi(
            "pages",
            buildPagePlanPrompt(
              current0.name,
              current0.idea,
              brief,
              (
                useVibe.getState().docsByProject[projectId] ?? EMPTY_DOCS
              ).find((doc) => doc.kind === "afd")?.markdown ?? "",
            ),
            current0.model,
          );
          const plan = parsePagePlan(reply.text) ?? fallbackPagePlan();
          useVibe.getState().updateProject(projectId, { pagePlan: plan });
        } catch {
          useVibe
            .getState()
            .updateProject(projectId, { pagePlan: fallbackPagePlan() });
        }
      }
      setPrepDoneIds(["documents", "tasks", "design"]);
    } finally {
      setPrepActive(null);
    }
  }, [projectId, saveDocMarkdown]);

  // Saved page files are never deleted automatically: even output that
  // fails the HTML quality guards stays in the store so no user data is
  // lost. Regeneration replaces a frame explicitly via its Generate /
  // Regenerate button.

  // Fresh projects prepare once behind the blur overlay. Anything already
  // seeded keeps the old lazy path: the effects below fill the gaps.
  useEffect(() => {
    if (!hydrated || !project || project.status === "draft") return;
    if (preparedRef.current) return;
    const st = useVibe.getState();
    if (st.docsByProject[projectId] !== undefined) return;
    preparedRef.current = true;
    // Start after this effect finishes; the first state update belongs to
    // the request, not to the render that mounted the page.
    queueMicrotask(() => {
      void prepareProject();
    });
  }, [hydrated, project, projectId, prepareProject]);

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

  /** Stash the current mark before replacing it, so nothing is ever lost. */
  const stashWorkspaceLogo = useCallback(
    (current: string | null) => {
      if (!current) return;
      const history = project?.logoHistory ?? [];
      const next = [...history.filter((entry) => entry !== current), current].slice(
        -MAX_LOGO_HISTORY,
      );
      useVibe.getState().updateProject(projectId, { logoHistory: next });
    },
    [projectId, project?.logoHistory],
  );

  const restoreWorkspaceLogo = useCallback(
    (url: string) => {
      if (!project || url === project.logoUrl) return;
      stashWorkspaceLogo(project.logoUrl ?? null);
      useVibe.getState().updateProject(projectId, { logoUrl: url, logoOrigin: undefined });
    },
    [projectId, project, stashWorkspaceLogo],
  );

  const uploadWorkspaceLogo = useCallback(
    async (file: File | undefined) => {
      if (!file || !project) return;
      try {
        if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
          const raw = await file.text();
          const clean = sanitizeLogoSvg(raw);
          if (!clean) return;
          stashWorkspaceLogo(project.logoUrl ?? null);
          useVibe
            .getState()
            .updateProject(projectId, { logoUrl: svgToDataUrl(clean), logoOrigin: "upload" });
          return;
        }
        const dataUrl = await fileToLogoDataUrl(file);
        let finalUrl = dataUrl;
        if (project.logoRemoveBg ?? true) {
          try {
            const { image } = await removeLogoBackground(dataUrl);
            finalUrl = image;
          } catch {
            // Keep the original when removal fails.
          }
        }
        stashWorkspaceLogo(project.logoUrl ?? null);
        useVibe.getState().updateProject(projectId, { logoUrl: finalUrl, logoOrigin: "upload" });
      } catch {
        // Unreadable files change nothing.
      }
    },
    [projectId, project, stashWorkspaceLogo],
  );

  const commitName = useCallback(() => {
    const trimmed = nameDraft.trim();
    if (trimmed) useVibe.getState().updateProject(projectId, { name: trimmed });
    setEditingName(false);
  }, [nameDraft, projectId]);

  const prototypeScreen =
    screens.find((screen) => screen.name === "Prototype") ??
    screens[0] ??
    null;
  const activeDoc =
    docs.find((entry) => entry.id === selectedDocKey) ?? docs[0] ?? null;
  const selectedTask =
    selectedTaskId ? (tasks.find((task) => task.id === selectedTaskId) ?? null) : null;

  const pagePlan = project?.pagePlan ?? null;
  const doneSlugs = useMemo(() => {
    const done = new Set<string>();
    for (const page of pagePlan ?? []) {
      if (files.some((file) => file.path === pageFilePath(page.slug))) {
        done.add(page.slug);
      }
    }
    return done;
  }, [pagePlan, files]);
  const pendingPageCount = (pagePlan ?? []).filter(
    (page) => !doneSlugs.has(page.slug),
  ).length;
  const planDone = pagePlan !== null && pendingPageCount === 0;
  const designFrames: CanvasFrame[] = useMemo(() => {
    const list: CanvasFrame[] = [];
    // Template systems show their real preview pages first: actual colors,
    // type, and spacing instead of a generated stand-in. Custom systems
    // (upload/link) keep one generated showcase frame below.
    if (useTemplatePreviews && dsEntry) {
      for (const preview of dsEntry.previews) {
        list.push({
          id: `ds-${preview.role}`,
          title: `Design system · ${preview.title}`,
          subtitle: dsEntry.name,
          html: null,
          src: `/design-systems/${dsEntry.id}/${preview.path}`,
          kind: "page",
        });
      }
    } else {
      const showcase =
        files.find((file) => file.path === SHOWCASE_PATH) ?? null;
      if (showcase) {
        list.push({
          id: SHOWCASE_PATH,
          title: "Design system",
          subtitle: `${project?.designSystem?.name ?? "Minimal"} · ${FRAME_W} × ${FRAME_H}`,
          html: showcase.content,
          kind: "page",
        });
      }
    }
    // Generated pages take a frame. Pages being drawn take a
    // transparent scan placeholder at their plan position, so the wait
    // reads as progress and the finished page lands in place.
    for (const page of pagePlan ?? []) {
      const file = files.find((entry) => entry.path === pageFilePath(page.slug));
      if (file) {
        list.push({
          id: pageFilePath(page.slug),
          slug: page.slug,
          title: page.title,
          subtitle: `${FRAME_W} × ${FRAME_H}`,
          html: file.content,
          kind: "page",
        });
      } else if (generatingSlugs.has(page.slug)) {
        list.push({
          id: pageFilePath(page.slug),
          slug: page.slug,
          title: page.title,
          subtitle: "drawing…",
          html: null,
          kind: "page",
          busy: true,
        });
      }
    }
    return list;
  }, [
    files,
    pagePlan,
    useTemplatePreviews,
    dsEntry,
    project?.designSystem,
    generatingSlugs,
  ]);
  const [focusedFrame, setFocusedFrame] = useState<string | null>(null);
  const [focusSeq, setFocusSeq] = useState(0);
  const focusFrame = useCallback((frameId: string) => {
    setFocusedFrame(frameId);
    setFocusSeq((n) => n + 1);
  }, []);

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

        <button
          type="button"
          onClick={() => setLogoPickerOpen(true)}
          title="Change logo"
          aria-label="Change project logo"
          aria-haspopup="dialog"
          className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4ff]">
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full bg-white p-1 object-contain ring-1 ring-transparent transition group-hover:ring-white/30"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-[#c9cdd6] ring-1 ring-transparent transition group-hover:ring-white/30">
              {initials(project.name)}
            </span>
          )}
          <span
            aria-hidden
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-1.5 py-px text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
            Logo
          </span>
        </button>

        <div className="group flex min-w-0 flex-1 items-center gap-1.5">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitName();
                if (event.key === "Escape") setEditingName(false);
              }}
              aria-label="Project name"
              className="h-8 min-w-0 flex-1 rounded-lg border border-white/25 bg-[#17181d] px-2 text-[15px] font-semibold text-[#f5f6f8] focus:outline-none"
            />
          ) : (
            <>
              <h1 className="truncate text-[15px] font-semibold leading-tight">
                {project.name}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setNameDraft(project.name);
                  setEditingName(true);
                }}
                title="Rename project"
                aria-label="Rename project"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#5b6472] opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100">
                <svg
                  aria-hidden
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </>
          )}
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
                  if (tab === "documents") changeView({ kind: "documents" });
                  else if (tab === "tasks") changeView({ kind: "tasks" });
                  else changeView({ kind: "design" });
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
              if (next === "documents") changeView({ kind: "documents" });
              else if (next === "design") changeView({ kind: "design" });
              else if (next === "tasks") changeView({ kind: "tasks" });
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
          className="mx-3 mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f0a6a6]/30 bg-[#f0a6a6]/10 px-3 py-2.5 text-[12px] leading-relaxed text-[#f0a6a6] sm:mx-4 sm:mt-3 sm:gap-3 sm:px-4 sm:py-3"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => {
              setSelectedDocKey("doc-prd");
              changeView({ kind: "documents" });
            }}
            className="min-h-10 shrink-0 rounded-full border border-[#f0a6a6]/40 px-3 font-medium hover:bg-[#f0a6a6]/10"
          >
            Open product brief
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main ref={mainRef} className="flex min-w-0 flex-1 flex-col bg-[#0b0c10]">
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
              docError={activeDoc ? (docErrors[activeDoc.id] ?? "") : ""}
              onMarkdown={(markdown) =>
                activeDoc && handleManualMarkdown(activeDoc.id, markdown)
              }
              onGenerate={() => activeDoc && void generateDoc(activeDoc.id)}
            />
          )}

          {view.kind === "tasks" && (
            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4">
                {tasksLocal && (
                  <p className="mb-3 shrink-0 text-[11px] text-[#9aa0ae]">
                    Muse could not finish the task list, so I saved starter tasks from your brief. You can edit them here.
                  </p>
                )}

                <div className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto pb-1">
                  {COLUMNS.map((column) => (
                    <TaskColumn
                      key={column.status}
                      status={column.status}
                      tasks={tasks.filter((task) => task.status === column.status)}
                    loading={prepActive === "tasks"}
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
                    onQuote={() =>
                      quoteToChat({
                        label: `Task: ${selectedTask.title || "Untitled task"} (${selectedTask.status})`,
                        text: (selectedTask.notes ?? "").slice(0, 200),
                        comment: "",
                        target: {
                          kind: "task",
                          taskTitle: selectedTask.title || "Untitled task",
                          taskStatus: selectedTask.status,
                        },
                      })
                    }
                  />
                </>
              )}
            </div>
          )}

          {view.kind === "design" && (
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <DesignSidebar
                dsFrames={designFrames.filter(
                  (frame) =>
                    frame.id.startsWith("ds-") || frame.id === SHOWCASE_PATH,
                )}
                pages={pagePlan ?? []}
                doneSlugs={doneSlugs}
                busySlugs={generatingSlugs}
                focusedId={focusedFrame}
                onFocus={focusFrame}
                onGenerate={(slug) => void generatePage(slug)}
                onDownloadPage={downloadPage}
                onGenerateAll={() => void generateAllPages()}
                onSuggest={() => void suggestPages()}
                suggesting={suggesting}
                pendingCount={pendingPageCount}
                planDone={planDone}
                planTotal={pagePlan?.length ?? 0}
                pageErrors={pageErrors}
                pageSources={Object.fromEntries(
                  files
                    .filter((file) => file.path.startsWith("page-"))
                    .map((file) => {
                      const slug = file.path
                        .replace(/^page-/, "")
                        .replace(/\.html$/, "");
                      return [slug, file.source] as const;
                    }),
                )}
                showcaseError={showcaseError}
                showcaseBusy={showcaseBusy}
                onRetryShowcase={() => void generateShowcase()}
                allProgress={allProgress}
              />
              <div className="relative min-h-[40vh] min-w-0 flex-1 md:min-h-0">
                <div className="h-full min-h-0">
                  <DesignCanvas
                    key={prototypeScreen?.id ?? "canvas"}
                    initialShapes={designShapes}
                    frames={designFrames}
                    focusRequest={
                      focusedFrame
                        ? { id: focusedFrame, seq: focusSeq }
                        : null
                    }
                    onNavigateFrame={focusFrame}
                    onShapes={(shapesJson) =>
                      prototypeScreen &&
                      handleShapes(prototypeScreen.id, shapesJson)
                    }
                    onQuoteToChat={(text) => quoteToChat(text)}
                    picking={picking}
                    pickSession={pickSession}
                    onPickingChange={setPicking}
                    bottomInset={chatHeight}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {view.kind !== "design" && (
        <WorkspacePicker
          rootRef={mainRef}
          scope={view.kind === "tasks" ? "tasks" : "documents"}
          picking={picking}
          pickSession={pickSession}
          bottomInset={chatHeight}
          onQuoteToChat={quoteToChat}
          onPickingChange={setPicking}
        />
      )}

      <WorkspaceChat
        key={projectId}
        project={project}
        open={chatOpen}
        onOpenChange={changeChatOpen}
        draft={chatDraft}
        onDraftConsumed={() => setChatDraft(null)}
        onAction={runChatAction}
        onHeightChange={setChatHeight}
        canPick
        picking={picking}
        onTogglePick={() => {
          setPicking((prev) => !prev);
          setPickSession((n) => n + 1);
        }}
      />
      {prepActive && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Preparing your project"
          className="fixed inset-0 z-50 grid place-items-center bg-[#0b0c10]/70 px-5 backdrop-blur-md"
        >
          <div className="w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-white/10 bg-[#17181d] p-5 shadow-2xl">
            <div aria-hidden="true" className="mb-3 flex justify-center">
              <LoadingSticker
                size={104}
                label="A folder opening while your project is prepared"
              />
            </div>
            <p className="text-[15px] font-semibold text-[#f5f6f8]">
              Setting up your workspace
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#9aa0ae]">
              Setting up plan documents, your task list, and page suggestions. Each step updates as it finishes.
            </p>
            <ul className="mt-4 space-y-2.5">
              {(
                [
                  { id: "documents", label: "Plan documents" },
                  { id: "tasks", label: "Task list" },
                  { id: "design", label: "Page suggestions" },
                ] as const
              ).map((step) => {
                const done = prepDoneIds.includes(step.id);
                const active = prepActive === step.id;
                return (
                  <li key={step.id} className="flex items-center gap-2.5">
                    {done ? (
                      <svg
                        aria-hidden
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#7ee2a8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span
                        aria-hidden
                        className={`size-4 rounded-full border ${
                          active
                            ? "animate-pulse border-[#8ab4ff] bg-[#8ab4ff]/30"
                            : "border-white/15"
                        }`}
                      />
                    )}
                    <span
                      className={`text-[13px] ${
                        done || active ? "text-[#f5f6f8]" : "text-[#5b6472]"
                      }`}
                    >
                      {step.label}
                    </span>
                    {active && (
                      <span className="ml-auto text-[11px] text-[#9aa0ae]">
                        {step.id === "design" ? "Suggesting…" : "Preparing…"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      {logoPickerOpen && (
        <LogoModal
          projectName={project.name}
          current={project.logoUrl ?? null}
          history={project.logoHistory ?? []}
          onPick={(url) => restoreWorkspaceLogo(url)}
          onUpload={(file) => void uploadWorkspaceLogo(file)}
          onClose={() => setLogoPickerOpen(false)}
        />
      )}
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
  onQuote,
}: {
  task: Task;
  onPatch: (patch: Partial<Pick<Task, "title" | "notes">>) => void;
  onMove: (next: TaskStatus) => void;
  onDelete: () => void;
  onClose: () => void;
  onQuote: () => void;
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

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onQuote}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-[13px] font-medium text-[#e8ebf0] hover:border-white/30 hover:text-white"
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add to chat
          </button>
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
            data-pick-card
            data-task-title={task.title}
            data-task-status={task.status}
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
