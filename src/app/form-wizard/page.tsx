"use client";

/**
 * Project setup wizard. The landing composer hands its idea over, the AI turns
 * that idea into a short questionnaire, and the last step writes one project
 * with the answers attached.
 *
 * Validation lives in one place so the Next button, the Stepper, and the
 * review banner all read the same rules. Errors stay hidden until a step has
 * been attempted, so an untouched field is never pre-flagged.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
  LayoutHeader,
} from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  PLATFORMS,
  platformLabel,
  type Platform,
  type Timeline,
} from "@/lib/project-options";
import {
  FALLBACK_QUESTIONS,
  answerToText,
  buildQuestionPrompt,
  isAnswered,
  parseWizardQuestions,
  type WizardAnswerValue,
  type WizardAnswers,
  type WizardQuestion,
} from "@/lib/wizard";
import {
  MAX_LOGO_HISTORY,
  buildLogoPrompt,
  buildLogoSvgPrompt,
  dedupeLogoSvgVariants,
  fileToLogoDataUrl,
  paletteFromTokensCss,
  parseLogoSvgVariants,
  removeLogoBackground,
  sanitizeLogoSvg,
  suggestLogoBrief,
  svgToDataUrl,
  type LogoBriefContext,
  type LogoFormat,
  type LogoOrigin,
  type LogoStatus,
  type LogoSvgVariant,
} from "@/lib/logo";
import {
  DEFAULT_DESIGN_MD,
  DEFAULT_TOKENS_CSS,
  type DesignSystemRef,
} from "@/lib/design-system";
import DesignSetupStep from "@/components/DesignSetupStep";
import {
  FRAMEWORKS,
  buildStackPrompt,
  frameworkLabel,
  isFrameworkFor,
  parseStackRecommendation,
  type StackRecommendation,
} from "@/lib/stack-options";
import { useVibe } from "@/lib/store";
import type { Project } from "@/lib/types";
import { createDraftProject } from "@/lib/draft";
import {
  resolveWizardFramework,
  restoreWizardAnswers,
} from "@/lib/wizard-hydration";

const STEPS: Array<{ label: string; isOptional?: boolean }> = [
  { label: "Stack" },
  { label: "Questions" },
  { label: "Design" },
  { label: "Review" },
];

const footerZone: CSSProperties = { flexBasis: 0 };
const REVIEW_STEP = STEPS.length - 1;

type QuestionStatus = "idle" | "loading" | "ready";
type QuestionSource = "ai" | "local" | null;

function subscribeToClient() {
  return () => {};
}

const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function WizardLoading() {
  return (
    <div className="grid h-full place-items-center" role="status" aria-live="polite">
      <Spinner size="lg" />
      <span className="sr-only">Loading the project wizard</span>
    </div>
  );
}

export default function FormWizardPage() {
  // The wizard reads the draft idea and the URL, so it only mounts on the
  // client. The server snapshot renders the same loading shell during
  // hydration, which keeps the two trees identical.
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  // `useSearchParams` re-renders on query changes; reading window.location in
  // a state initializer would keep the prerender's empty query forever.
  return isClient ? (
    <Suspense fallback={<WizardLoading />}>
      <Wizard />
    </Suspense>
  ) : (
    <WizardLoading />
  );
}

function Wizard() {
  const router = useRouter();
  const setDraftIdea = useVibe((state) => state.setDraftIdea);

  // The chat creates the draft project before navigating here, so the wizard
  // always edits an existing project and can be left and resumed. A legacy
  // ?idea= link without an id creates its draft on mount instead.
  const searchParams = useSearchParams();
  const liveId = searchParams.get("id") ?? "";
  const [createdId, setCreatedId] = useState("");
  const projectId = liveId || createdId;
  const resolvingRef = useRef(false);

  useEffect(() => {
    if (projectId || resolvingRef.current) return;
    const rawIdea = searchParams.get("idea") ?? "";
    const fallbackIdea = rawIdea.trim() || useVibe.getState().draftIdea.trim();
    if (!fallbackIdea) return;
    resolvingRef.current = true;
    setDraftIdea("");
    void createDraftProject(fallbackIdea).then((id) => {
      setCreatedId(id);
      router.replace(`/form-wizard?id=${id}`);
    });
  }, [projectId, router, setDraftIdea, searchParams]);

  if (!projectId) {
    return (
      <Layout
        height="fill"
        contentWidth={720}
        padding={5}
        content={
          <LayoutContent>
            <VStack gap={3}>
              <Heading level={1}>Project not found</Heading>
              <Text type="supporting" color="secondary">
                This setup link has no project behind it. Start from the home
                screen by typing your idea into the chat.
              </Text>
              <HStack gap={3}>
                <Button
                  label="Back home"
                  variant="primary"
                  className="min-h-11 md:min-h-0"
                  onClick={() => router.push("/")}
                />
              </HStack>
            </VStack>
          </LayoutContent>
        }
      />
    );
  }

  // Keyed by project id so every project gets a fresh ephemeral state.
  // Switching projects unmounts the previous body: in-flight question / stack
  // / logo requests close over the old instance and can no longer write into
  // the new one, and stale questions / answers / recommendations never leak.
  return <WizardBody key={projectId} projectId={projectId} />;
}

function WizardBody({ projectId }: { projectId: string }) {
  const router = useRouter();
  const updateProject = useVibe((state) => state.updateProject);
  const isNarrow = useMediaQuery("(max-width: 640px)");

  const project = useVibe((state) =>
    projectId ? state.projects.find((p) => p.id === projectId) : undefined,
  );

  const idea = project?.idea ?? "";
  const name = project?.name ?? "";
  const projectModel = project?.model;

  const questionRefs = useRef<Record<string, HTMLElement | null>>({});
  const submitted = useRef(false);
  const hydratedRef = useRef("");
  // Stable for the lifetime of this mount: the outer Wizard keys this body by
  // project id, so a project switch unmounts the old body (dropping its
  // in-flight request ids and ephemeral state) and mounts a fresh one.
  const projectIdRef = useRef(projectId);
  const requestRef = useRef(0);
  const questionInFlightRef = useRef("");
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [generatedFor, setGeneratedFor] = useState("");

  const [platform, setPlatform] = useState<Platform>("web");
  const [timeline, setTimeline] = useState<Timeline>("two-weeks");
  const [framework, setFramework] = useState("nextjs");

  type StackStatus = "idle" | "loading" | "ready";
  type StackSource = "ai" | "local" | null;
  const [stackRec, setStackRec] = useState<StackRecommendation | null>(null);
  const [stackStatus, setStackStatus] = useState<StackStatus>("idle");
  const [stackSource, setStackSource] = useState<StackSource>(null);
  const [stackFor, setStackFor] = useState("");
  const stackRequestRef = useRef(0);
  const stackInFlightRef = useRef("");

  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>("loading");
  const [questionSource, setQuestionSource] = useState<QuestionSource>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoOrigin, setLogoOrigin] = useState<LogoOrigin>(null);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [logoStatus, setLogoStatus] = useState<LogoStatus>("idle");
  const [logoError, setLogoError] = useState("");
  const [logoRemoveBg, setLogoRemoveBg] = useState(true);
  const [logoBgNote, setLogoBgNote] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [logoFormat, setLogoFormat] = useState<LogoFormat>("svg");
  const [svgVariants, setSvgVariants] = useState<LogoSvgVariant[]>([]);
  const [svgStatus, setSvgStatus] = useState<"idle" | "loading">("idle");
  const [design, setDesign] = useState<DesignSystemRef | null>(null);
  const designLoadedRef = useRef("");
  const logoRequestRef = useRef(0);
  const stackTouchedRef = useRef(false);
  const answersRef = useRef<WizardAnswers>({});
  const answersSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoBriefSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a live ref so the question generator (stable callback) can merge
  // freshly typed answers that have not flushed to the store yet.
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(
    () => () => {
      if (answersSaveTimerRef.current) clearTimeout(answersSaveTimerRef.current);
      if (logoBriefSaveTimerRef.current) clearTimeout(logoBriefSaveTimerRef.current);
    },
    [],
  );

  // Saved answers ride on the project so a resumed draft keeps its progress.
  // Match by question id first, then by label for older drafts. Reads from
  // the store directly so the generator callback never captures stale state.
  // Pure helper keeps this scoped to the current project id only.
  const restoreAnswers = (list: WizardQuestion[]): WizardAnswers => {
    const saved =
      useVibe.getState().projects.find((p) => p.id === projectIdRef.current)?.answers ?? [];
    return restoreWizardAnswers(list, saved);
  };

  const generateQuestions = useCallback(async (ideaText: string) => {
    const trimmed = ideaText.trim();
    if (!trimmed || questionInFlightRef.current === trimmed) return;

    questionInFlightRef.current = trimmed;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setGeneratedFor(trimmed);
    setQuestionStatus("loading");

    let nextQuestions = FALLBACK_QUESTIONS;
    let nextSource: QuestionSource = "local";

    try {
      const current = useVibe
        .getState()
        .projects.find((item) => item.id === projectIdRef.current);
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "questions",
          prompt: buildQuestionPrompt(trimmed),
          ...(current?.model ? { model: current.model } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Question request failed: ${response.status}`);

      const data = (await response.json()) as { text?: unknown; source?: unknown };
      if (requestId !== requestRef.current) return;

      const parsed = parseWizardQuestions(data.text);
      if (parsed) {
        nextQuestions = parsed;
        nextSource = data.source === "ai" ? "ai" : "local";
      }
    } catch {
      // The fallback set is already selected above; the wizard stays usable.
    }

    if (requestId !== requestRef.current) return;

    setQuestions(nextQuestions);
    setQuestionSource(nextSource);
    setQuestionStatus("ready");
    // Cache the questionnaire on the project so a refresh reuses it instead
    // of calling the AI again. Preserve unmatched legacy answers (e.g. an
    // old "feel" answer) instead of dropping them when the questionnaire
    // is regenerated; existing cached drafts stay usable without migration.
    if (projectIdRef.current) {
      const store = useVibe.getState();
      const existing = store.projects.find((item) => item.id === projectIdRef.current);
      const savedAnswers = existing?.answers ?? [];
      const localAnswers = answersRef.current;
      const merged: NonNullable<Project["answers"]> = [];
      const seen = new Set<string>();
      for (const question of nextQuestions) {
        const localValue = localAnswers[question.id];
        const hasLocal =
          localValue !== undefined &&
          (Array.isArray(localValue) ? localValue.length > 0 : String(localValue).trim().length > 0);
        const restored = restoreWizardAnswers([question], savedAnswers)[question.id];
        const value = hasLocal ? localValue : restored;
        if (value === undefined) continue;
        const text = answerToText(value);
        if (!text) continue;
        merged.push({ qid: question.id, question: question.label, answer: text, values: value });
        seen.add(question.id);
      }
      for (const legacy of savedAnswers) {
        if (seen.has(legacy.qid)) continue;
        if (nextQuestions.some((question) => question.label === legacy.question)) continue;
        merged.push(legacy);
      }
      store.updateProject(projectIdRef.current, {
        questions: nextQuestions,
        questionSource: nextSource,
        answers: merged,
      });
      // Merge freshly typed answers for matching ids so Regenerate never
      // wipes what the user just typed before the debounced save flushed.
      const restored = restoreWizardAnswers(nextQuestions, merged);
      setAnswers(restored);
    } else {
      // Use only this project's restored answers. Never merge the previous
      // local `answers` object: on a project switch matching question ids would
      // otherwise leak the old project's answers into the new one.
      setAnswers(restoreAnswers(nextQuestions));
    }
    if (questionInFlightRef.current === trimmed) {
      questionInFlightRef.current = "";
    }
  }, []);

  useEffect(() => {
    if (!idea.trim() || generatedFor === idea.trim()) return;
    // The questionnaire is cached on the project; the hydration effect below
    // picks it up, so never call the AI when a cache entry exists.
    const cached = useVibe
      .getState()
      .projects.find((item) => item.id === projectIdRef.current)?.questions;
    if (cached?.length) return;
    // One request per idea text; the generator records its target up front.
    void generateQuestions(idea);
  }, [idea, generatedFor, generateQuestions]);

  // Hydrate local state from the project once it resolves: a resumed draft
  // continues with its saved scope, logo, answers, and step. This body is
  // keyed by project id, so initial useState values are already the reset for
  // the new project; hydration only fills in this project's cached values and
  // never touches generatedFor for uncached projects (which would invalidate
  // the fresh question request started by the generator effect above).
  useEffect(() => {
    if (!project || hydratedRef.current === project.id) return;
    hydratedRef.current = project.id;
    if (project.platform || project.framework) stackTouchedRef.current = true;
    setPlatform(project.platform ?? "web");
    setTimeline(project.timeline ?? "two-weeks");
    setFramework(resolveWizardFramework(project.platform ?? "web", project.framework));
    setLogoUrl(project.logoUrl ?? null);
    setLogoOrigin(project.logoOrigin ?? null);
    setLogoStatus("idle");
    setLogoRemoveBg(project.logoRemoveBg ?? true);
    setLogoFormat(project.logoFormat ?? "svg");
    setLogoBgNote("");
    // User-written logo direction persists across refresh/resume; the
    // generated mark itself stays opt-in and is never auto-generated.
    setLogoPrompt(project.logoBrief ?? "");
    // Unconditional so the effect keeps one straight hydration pass.
    // A project with no saved system always falls back to Minimal — never a
    // previous project's design (fresh mount starts from null by default).
    const savedDesign = project.designSystem ?? null;
    setDesign(savedDesign);
    if (savedDesign) {
      designLoadedRef.current = savedDesign.id + savedDesign.source;
    } else {
      // No saved choice yet: start from the quiet minimal template so the
      // review step and the canvas always have a system to render.
      designLoadedRef.current = "minimal:template";
      void (async () => {
        try {
          const [designMd, tokensCss] = await Promise.all([
            fetch("/design-systems/minimal/DESIGN.md").then((res) => res.text()),
            fetch("/design-systems/minimal/tokens.css").then((res) => res.text()),
          ]);
          if (projectIdRef.current !== project.id) return;
          setDesign((current) =>
            current ?? {
              id: "minimal",
              name: "Minimal",
              designMd,
              tokensCss,
              source: "template",
            },
          );
        } catch {
          if (projectIdRef.current !== project.id) return;
          setDesign((current) =>
            current ?? {
              id: "minimal",
              name: "Minimal",
              designMd: DEFAULT_DESIGN_MD,
              tokensCss: DEFAULT_TOKENS_CSS,
              source: "template",
            },
          );
        }
      })();
    }
    // Reuse the cached questionnaire when it exists; the generator effect
    // above already skips the AI call in that case.
    if (project.questions?.length) {
      // Cached questionnaire: hydration syncs external store state into local
      // state once, then the generator effect skips the AI call for this idea.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuestions(project.questions);
      setQuestionSource(project.questionSource ?? null);
      setGeneratedFor((project.idea ?? "").trim());
      setQuestionStatus("ready");
      setAnswers(restoreAnswers(project.questions));
    } else {
      // Uncached project: keep the fresh-mount reset (empty answers/questions)
      // and leave generatedFor alone so the pending question request stays
      // valid. Explicitly ensure the loading state for the fresh request.
      setQuestions([]);
      setQuestionSource(null);
      setQuestionStatus("loading");
      setAnswers({});
    }
    setStep(Math.min(project.wizardStep ?? 0, REVIEW_STEP));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  // Auto-save typed answers with a short debounce, guarded until the current
  // project has hydrated. A refresh while still on the questionnaire keeps
  // what was typed; the explicit step-save below remains the final flush.
  useEffect(() => {
    if (!projectId || hydratedRef.current !== projectId) return;
    if (questionStatus !== "ready" || !questions.length) return;
    if (answersSaveTimerRef.current) clearTimeout(answersSaveTimerRef.current);
    answersSaveTimerRef.current = setTimeout(() => {
      const store = useVibe.getState();
      const existing = store.projects.find((item) => item.id === projectIdRef.current);
      if (!existing) return;
      const savedAnswers = existing.answers ?? [];
      const current = answersRef.current;
      const merged: NonNullable<Project["answers"]> = [];
      const seen = new Set<string>();
      for (const question of questions) {
        const value = current[question.id];
        const text = answerToText(value);
        if (!text) continue;
        merged.push({ qid: question.id, question: question.label, answer: text, values: value });
        seen.add(question.id);
      }
      // Preserve legacy answers (e.g. old "feel") that have no current
      // question instead of dropping them on every keystroke.
      for (const legacy of savedAnswers) {
        if (seen.has(legacy.qid)) continue;
        if (questions.some((question) => question.label === legacy.question)) continue;
        merged.push(legacy);
      }
      // Avoid no-op writes that would bump lastOpenedAt on every keystroke
      // without changing content.
      const before = JSON.stringify(savedAnswers);
      if (before !== JSON.stringify(merged)) {
        store.updateProject(projectIdRef.current, { answers: merged });
      }
    }, 600);
    return () => {
      if (answersSaveTimerRef.current) clearTimeout(answersSaveTimerRef.current);
    };
    // questions anchor the merge; answers flow via answersRef to avoid
    // re-arming the timer on every keystroke render loop.
  }, [answers, questions, questionStatus, projectId]);

  // Debounce-save the user's logo brief alongside answers, same hydration guard.
  useEffect(() => {
    if (!projectId || hydratedRef.current !== projectId) return;
    if (logoBriefSaveTimerRef.current) clearTimeout(logoBriefSaveTimerRef.current);
    logoBriefSaveTimerRef.current = setTimeout(() => {
      const store = useVibe.getState();
      const existing = store.projects.find((item) => item.id === projectIdRef.current);
      if (!existing) return;
      if ((existing.logoBrief ?? "") === logoPrompt) return;
      store.updateProject(projectIdRef.current, { logoBrief: logoPrompt });
    }, 600);
    return () => {
      if (logoBriefSaveTimerRef.current) clearTimeout(logoBriefSaveTimerRef.current);
    };
  }, [logoPrompt, projectId]);

  const setAnswer = (id: string, value: WizardAnswerValue) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  /** Compact product context forwarded into logo prompts. */
  const logoBriefContext = (): LogoBriefContext => {
    const byId = (id: string) => answerToText(answersRef.current[id] ?? answers[id]);
    const saved = useVibe.getState().projects.find((item) => item.id === projectIdRef.current)?.answers ?? [];
    const legacyFeel =
      saved.find((entry) => entry.qid === "feel")?.answer?.trim() ||
      (typeof answersRef.current["feel"] === "string" ? (answersRef.current["feel"] as string).trim() : "");
    const palette = design?.tokensCss ? paletteFromTokensCss(design.tokensCss) : [];
    const context: LogoBriefContext = {};
    const audience = byId("audience");
    if (audience) context.audience = audience;
    const coreWorkflow = byId("core-action");
    if (coreWorkflow) context.coreWorkflow = coreWorkflow;
    const visual = legacyFeel || design?.name;
    if (visual) context.visualDirection = visual;
    if (palette.length) context.palette = palette;
    return context;
  };

  /** User-written direction wins; otherwise suggest a grounded default. */
  const effectiveLogoBrief = (): string => {
    const typed = logoPrompt.trim();
    if (typed) return typed;
    const coreWorkflow = answerToText(answersRef.current["core-action"] ?? answers["core-action"]);
    return suggestLogoBrief(name.trim() || "Untitled project", idea, coreWorkflow);
  };

  const recommendStack = useCallback(async () => {
    const fingerprint = `${idea.trim()}${JSON.stringify(answers)}`;
    if (
      !idea.trim() ||
      fingerprint === stackFor ||
      fingerprint === stackInFlightRef.current
    ) {
      return;
    }

    stackInFlightRef.current = fingerprint;
    const requestId = stackRequestRef.current + 1;
    stackRequestRef.current = requestId;
    setStackFor(fingerprint);
    setStackStatus("loading");

    let next: StackRecommendation = { platform: "web", framework: "nextjs", reason: "" };
    let nextSource: StackSource = "local";

    try {
      const summary = questions
        .map((question) => `${question.label}: ${answerToText(answers[question.id]) || "no answer"}`)
        .join(" | ");
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "stack",
          prompt: buildStackPrompt(idea, summary),
          ...(projectModel ? { model: projectModel } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Stack request failed: ${response.status}`);

      const data = (await response.json()) as { text?: unknown; source?: unknown };
      if (requestId !== stackRequestRef.current) return;

      const parsed = parseStackRecommendation(data.text);
      if (parsed) {
        next = parsed;
        nextSource = data.source === "ai" ? "ai" : "local";
      }
    } catch {
      // The web/Next.js default is already selected above; the wizard stays usable.
    }

    if (requestId !== stackRequestRef.current) return;

    setStackRec(next);
    setStackSource(nextSource);
    setStackStatus("ready");
    // Apply the recommendation only when the user has not picked a stack yet.
    // A resumed draft keeps its saved platform and framework.
    if (!stackTouchedRef.current) {
      setPlatform(next.platform);
      setFramework(next.framework);
    }
  }, [idea, answers, questions, stackFor, projectModel]);

  // The stack step comes first, so the recommendation starts from the idea
  // alone as soon as the draft resolves. Answers refine it later when the
  // user leaves the questions step; a fingerprint guard keeps it to one
  // request per change.
  useEffect(() => {
    if (!idea.trim() || stackStatus !== "idle") return;
    // Fire-and-forget fetch on mount, same pattern as the questions loader.
    void recommendStack();
  }, [idea, stackStatus, recommendStack]);

  const logoHistory = project?.logoHistory ?? [];

  /** Stash the current mark before replacing it, so nothing is ever lost. */
  const stashLogo = (current: string | null) => {
    if (!current || !projectId) return;
    const next = [...logoHistory.filter((entry) => entry !== current), current].slice(
      -MAX_LOGO_HISTORY,
    );
    useVibe.getState().updateProject(projectId, { logoHistory: next });
  };

  /** Cut the solid field behind a fresh mark, unless the user opted out. */
  const maybeRemoveBg = async (image: string): Promise<string> => {
    if (!logoRemoveBg) {
      setLogoBgNote("");
      return image;
    }
    setLogoBgNote("Removing the background…");
    try {
      const { image: cut, removedRatio } = await removeLogoBackground(image);
      if (cut === image) {
        setLogoBgNote(
          "No clean backdrop found, so the original is kept. Toggle the option off if you prefer it untouched.",
        );
        return image;
      }
      setLogoBgNote(
        `Background removed (${Math.round(removedRatio * 100)}% cleared). Turn the option off to keep the original.`,
      );
      return cut;
    } catch {
      setLogoBgNote("Background removal failed, so the original is kept.");
      return image;
    }
  };

  const generateLogo = async () => {
    const description = effectiveLogoBrief().trim();
    if (!description || logoStatus === "loading") return;

    const requestId = logoRequestRef.current + 1;
    logoRequestRef.current = requestId;
    setLogoStatus("loading");
    setLogoError("");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "logo",
          prompt: buildLogoPrompt(
            description,
            name.trim() || "Untitled project",
            idea,
            logoBriefContext(),
          ),
        }),
      });
      if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);

      const data = (await response.json()) as { image?: unknown; source?: unknown };
      if (requestId !== logoRequestRef.current) return;

      if (typeof data.image === "string" && data.image) {
        stashLogo(logoUrl);
        const finalUrl = await maybeRemoveBg(data.image);
        setLogoUrl(finalUrl);
        // User chose to generate: persist the chosen output immediately so a
        // refresh does not lose it. Never auto-replace without this click.
        if (projectId) {
          useVibe.getState().updateProject(projectId, { logoUrl: finalUrl, logoOrigin: "ai" });
        }
        setLogoOrigin("ai");
        setLogoStatus("ready");
        return;
      }
      setLogoStatus("idle");
      setLogoError(
        "The image model is unavailable right now, so no logo was drawn. Your initials stay as the mark, or upload an image instead.",
      );
    } catch {
      if (requestId !== logoRequestRef.current) return;
      setLogoStatus("idle");
      setLogoError(
        "The image model is unavailable right now, so no logo was drawn. Your initials stay as the mark, or upload an image instead.",
      );
    }
  };

  /** Draw three vector variants with the text model; SVG has no backdrop. */
  const generateLogoSvg = async () => {
    const description = effectiveLogoBrief().trim();
    if (!description || svgStatus === "loading") return;

    const requestId = logoRequestRef.current + 1;
    logoRequestRef.current = requestId;
    setSvgStatus("loading");
    setLogoError("");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "logo-svg",
          prompt: buildLogoSvgPrompt(
            description,
            name.trim() || "Untitled project",
            idea,
            logoBriefContext(),
          ),
          ...(projectModel ? { model: projectModel } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);

      const data = (await response.json()) as { text?: unknown; source?: unknown };
      if (requestId !== logoRequestRef.current) return;

      // Local generic geometry is never a generated logo: only source ai
      // may populate concepts, and the current mark stays untouched.
      if (data.source !== "ai") {
        setLogoError(
          "Logo concepts are unavailable while the model is offline. Reconnect and try again. Your current mark is unchanged.",
        );
      } else {
        const variants = dedupeLogoSvgVariants(parseLogoSvgVariants(data.text));
        if (!variants.length) {
          setLogoError("The model did not return usable SVG. Try a shorter description.");
        } else {
          setSvgVariants(variants);
          setLogoError("");
          if (variants.length < 3) {
            setLogoBgNote(
              `Only ${variants.length} of 3 concepts were usable. Regenerate or refine the description for more options.`,
            );
          } else {
            setLogoBgNote("");
          }
        }
      }
    } catch {
      if (requestId !== logoRequestRef.current) return;
      setLogoError("The model is unavailable right now, so no variants were drawn. Try again or upload a file.");
    } finally {
      if (requestId === logoRequestRef.current) setSvgStatus("idle");
    }
  };

  /** Adopt one vector variant as the mark, stashing the current one. */
  const pickLogoSvg = (svg: string) => {
    stashLogo(logoUrl);
    const url = svgToDataUrl(svg);
    setLogoUrl(url);
    // Explicit user choice: persist immediately, never silently replace.
    if (projectId) {
      useVibe.getState().updateProject(projectId, { logoUrl: url, logoOrigin: "ai" });
    }
    setLogoOrigin("ai");
    setLogoStatus("ready");
    setLogoError("");
    setLogoBgNote("Vector mark: transparent by construction, no removal needed.");
  };

  /** Bring back an older mark, stashing the current one in its place. */
  const restoreLogo = (url: string) => {
    if (url === logoUrl) return;
    stashLogo(logoUrl);
    setLogoUrl(url);
    if (projectId) {
      // Older marks do not store per-item provenance, so do not guess.
      useVibe.getState().updateProject(projectId, { logoUrl: url, logoOrigin: undefined });
    }
    setLogoOrigin(null);
    setLogoBgNote("");
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError("");
    try {
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
        const raw = await file.text();
        const clean = sanitizeLogoSvg(raw);
        if (!clean) throw new Error("That SVG could not be read. Pick a valid .svg file.");
        stashLogo(logoUrl);
        const url = svgToDataUrl(clean);
        setLogoUrl(url);
        if (projectId) {
          useVibe.getState().updateProject(projectId, { logoUrl: url, logoOrigin: "upload" });
        }
        setLogoOrigin("upload");
        setLogoStatus("ready");
        setLogoBgNote("Vector mark: transparent by construction, no removal needed.");
        return;
      }
      const dataUrl = await fileToLogoDataUrl(file);
      stashLogo(logoUrl);
      const finalUrl = await maybeRemoveBg(dataUrl);
      setLogoUrl(finalUrl);
      if (projectId) {
        useVibe.getState().updateProject(projectId, { logoUrl: finalUrl, logoOrigin: "upload" });
      }
      setLogoOrigin("upload");
      setLogoStatus("ready");
    } catch (error) {
      setLogoError(
        error instanceof Error ? error.message : "That file could not be read as an image.",
      );
    }
  };

  const questionErrors: Record<string, string> = {};
  for (const question of questions) {
    if (question.required && !isAnswered(answers[question.id])) {
      questionErrors[question.id] = "Add an answer to continue.";
    }
  }

  const errorsByStep: Record<string, string>[] = [{}, questionErrors, {}, {}, {}];
  const shownErrors = (index: number) =>
    attempted.has(index) ? errorsByStep[index] : {};

  const questionIssueCount = Object.keys(questionErrors).length;
  const outstanding = STEPS.map((s, index) => {
    let issues = Object.values(errorsByStep[index]);
    if (index === 1 && questionIssueCount > 0) {
      issues = [
        `${questionIssueCount} ${
          questionIssueCount === 1 ? "question needs" : "questions need"
        } an answer.`,
      ];
    }
    return { ...s, index, issues };
  }).filter((s) => s.issues.length > 0);

  const currentErrors = shownErrors(step);
  const isLastStep = step === REVIEW_STEP;
  const questionsPending =
    questionStatus === "loading" ||
    (idea.trim().length > 0 && generatedFor !== idea.trim());

  const focusFirstError = (index: number) => {
    if (index !== 1) return false;
    const question = questions.find((item) => questionErrors[item.id]);
    const node = question ? questionRefs.current[question.id] : null;
    if (!node) return false;
    requestAnimationFrame(() => {
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        node.focus();
        return;
      }
      node.querySelector<HTMLElement>("input, textarea, button")?.focus();
    });
    return true;
  };

  const answersList = () => {
    const current: NonNullable<Project["answers"]> = questions
      .map((question) => ({
        qid: question.id,
        question: question.label,
        answer: answerToText(answers[question.id]),
        values: answers[question.id],
      }))
      .filter((entry) => entry.answer.length > 0);
    // Preserve legacy answers (e.g. old "feel") that no longer have a
    // question in the regenerated set instead of silently dropping them.
    const seen = new Set(current.map((entry) => entry.qid));
    const saved = project?.answers ?? [];
    for (const legacy of saved) {
      if (seen.has(legacy.qid)) continue;
      if (questions.some((question) => question.label === legacy.question)) continue;
      current.push(legacy);
    }
    return current;
  };

  /** Persist wizard progress onto the project so leaving resumes cleanly. */
  const saveProgress = (nextStep: number) => {
    if (!projectId) return;
    // Flush any pending debounced saves first: the explicit step-save is
    // the final word and must include the latest keystrokes.
    if (answersSaveTimerRef.current) {
      clearTimeout(answersSaveTimerRef.current);
      answersSaveTimerRef.current = null;
    }
    if (logoBriefSaveTimerRef.current) {
      clearTimeout(logoBriefSaveTimerRef.current);
      logoBriefSaveTimerRef.current = null;
    }
    updateProject(projectId, {
      answers: answersList(),
      platform,
      timeline,
      framework,
      ...(logoUrl ? { logoUrl } : {}),
      logoOrigin: logoOrigin ?? undefined,
      logoBrief: logoPrompt,
      logoRemoveBg,
      logoFormat,
      ...(project?.logoHistory?.length ? { logoHistory: project.logoHistory } : {}),
      ...(design ? { designSystem: design } : {}),
      wizardStep: nextStep,
    });
  };

  const finishSetup = () => {
    if (submitted.current || !projectId) return;
    submitted.current = true;
    saveProgress(REVIEW_STEP);
    updateProject(projectId, { status: "ready" });
    router.push(`/project/${projectId}`);
  };

  const pickPlatform = (value: string) => {
    const next = value as Platform;
    stackTouchedRef.current = true;
    setPlatform(next);
    setFramework((current) =>
      isFrameworkFor(next, current) ? current : FRAMEWORKS[next][0].value,
    );
  };

  const pickFramework = (value: string) => {
    stackTouchedRef.current = true;
    setFramework(value);
  };

  const goToStep = (next: number) => {
    if (next > 1 && questionsPending) return;
    if (next >= 2) {
      void recommendStack();
    }
    saveProgress(next);
    setStep(next);
  };

  const goNext = () => {
    if (step === 0) {
      saveProgress(1);
      setStep(1);
      return;
    }

    if (step === 1) {
      if (questionStatus === "loading") return;
      setAttempted((previous) => new Set(previous).add(1));
      if (focusFirstError(1)) return;
      void recommendStack();
      saveProgress(2);
      setStep(2);
      return;
    }

    if (step === 2) {
      saveProgress(REVIEW_STEP);
      setStep(REVIEW_STEP);
      return;
    }

    if (questionsPending) {
      saveProgress(1);
      setStep(1);
      if (questionStatus !== "loading") void generateQuestions(idea);
      return;
    }

    const invalid = errorsByStep.findIndex(
      (errors) => Object.keys(errors).length > 0,
    );
    if (invalid !== -1) {
      setAttempted((previous) => new Set(previous).add(invalid));
      saveProgress(invalid);
      setStep(invalid);
      focusFirstError(invalid);
      return;
    }
    finishSetup();
  };

  const renderQuestion = (question: WizardQuestion) => {
    const value = answers[question.id];
    const error = currentErrors[question.id];
    const status = error ? { type: "error" as const, message: error } : undefined;
    const description =
      question.type === "multi" && question.required
        ? [question.description, "Pick at least one."].filter(Boolean).join(" ")
        : question.description;

    const attachRef = (node: HTMLElement | null) => {
      questionRefs.current[question.id] = node;
    };

    if (question.type === "single") {
      return (
        <RadioList
          key={question.id}
          ref={attachRef}
          label={question.label}
          description={description}
          isRequired={question.required || undefined}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setAnswer(question.id, next)}
          status={status}
          orientation="horizontal">
          {(question.options ?? []).map((option) => (
            <RadioListItem key={option} value={option} label={option} />
          ))}
        </RadioList>
      );
    }

    if (question.type === "multi") {
      return (
        <CheckboxList
          key={question.id}
          ref={attachRef}
          label={question.label}
          description={description}
          value={Array.isArray(value) ? value : []}
          onChange={(next) => setAnswer(question.id, next)}
          status={status}
          controlClassName="[&>ul]:flex [&>ul]:flex-row! [&>ul]:flex-wrap [&>ul]:gap-x-6 [&>ul]:gap-y-2">
          {(question.options ?? []).map((option) => (
            <CheckboxListItem key={option} value={option} label={option} />
          ))}
        </CheckboxList>
      );
    }

    if (question.type === "textarea") {
      return (
        <TextArea
          key={question.id}
          ref={attachRef}
          label={question.label}
          description={description}
          placeholder={question.placeholder}
          rows={3}
          isRequired={question.required || undefined}
          isOptional={question.required ? undefined : true}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setAnswer(question.id, next)}
          status={status}
        />
      );
    }

    return (
      <TextInput
        key={question.id}
        ref={attachRef}
        label={question.label}
        description={description}
        placeholder={question.placeholder}
        isRequired={question.required || undefined}
        isOptional={question.required ? undefined : true}
        value={typeof value === "string" ? value : ""}
        onChange={(next) => setAnswer(question.id, next)}
        status={status}
      />
    );
  };

  if (!project) {
    return (
      <Layout
        height="fill"
        contentWidth={720}
        padding={5}
        content={
          <LayoutContent>
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 py-10">
              <Spinner size="lg" />
              <Text type="supporting" color="secondary">
                Opening your project…
              </Text>
            </div>
          </LayoutContent>
        }
      />
    );
  }

  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack gap={3} vAlign="center">
              <StackItem size="fill">
                <span className="group flex items-center gap-1.5">
                  {editingName ? (
                    <TextInput
                      label="Project name"
                      isLabelHidden
                      value={nameDraft}
                      onChange={setNameDraft}
                      placeholder="Untitled project"
                      onKeyDown={(event: React.KeyboardEvent) => {
                        if (event.key === "Enter") {
                          const trimmed = nameDraft.trim();
                          if (trimmed) updateProject(projectId, { name: trimmed });
                          setEditingName(false);
                        }
                        if (event.key === "Escape") setEditingName(false);
                      }}
                      onBlur={() => {
                        const trimmed = nameDraft.trim();
                        if (trimmed) updateProject(projectId, { name: trimmed });
                        setEditingName(false);
                      }}
                    />
                  ) : (
                    <>
                      <Heading level={1}>{name || "New project"}</Heading>
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(name);
                          setEditingName(true);
                        }}
                        title="Rename project"
                        aria-label="Rename project"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition hover:bg-black/5 focus-visible:opacity-100 group-hover:opacity-100">
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
                </span>
              </StackItem>
              <Button
                label="Cancel"
                variant="ghost"
                className="min-h-11 md:min-h-0"
                onClick={() => {
                  saveProgress(step);
                  router.push("/");
                }}
              />
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={goToStep}
              label={`${name || "New project"} setup progress`}
              density="balanced"
              indicatorPosition="on-track">
              {STEPS.map((s, index) => (
                <Step
                  key={s.label}
                  step={index}
                  label={s.label}
                  isOptional={s.isOptional}
                  status={
                    Object.keys(shownErrors(index)).length > 0
                      ? "error"
                      : undefined
                  }
                />
              ))}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent key={step}>
          {step === 0 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Pick your stack</Heading>
                <Text type="supporting" color="secondary">
                  Choose where it runs and which framework to start from. The
                  AI recommendation is marked from your idea, but the final
                  call is yours.
                </Text>
              </VStack>

              {stackStatus === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3">
                  <Spinner size="md" />
                  <Text type="supporting" color="secondary">
                    Reading your idea and picking a stack…
                  </Text>
                </div>
              )}

              {stackStatus === "ready" && stackSource === "local" && (
                <Banner
                  status="info"
                  title="Using the default stack"
                  description="The AI provider is unavailable right now, so this step starts from web and Next.js. You can still change everything."
                  collapsible={false}
                />
              )}

              {stackStatus !== "loading" && (
                <FormLayout defaultOptionality="optional">
                  <RadioList
                    label="Platform"
                    value={platform}
                    onChange={pickPlatform}>
                    {PLATFORMS.map((option) => {
                      const isRecommended =
                        stackSource === "ai" && stackRec?.platform === option.value;
                      return (
                        <RadioListItem
                          key={option.value}
                          value={option.value}
                          label={isRecommended ? `${option.label} · Recommended` : option.label}
                          description={option.description}
                        />
                      );
                    })}
                  </RadioList>
                  <RadioList
                    label="Framework"
                    value={framework}
                    onChange={pickFramework}
                    description={
                      stackSource === "ai" && stackRec?.reason
                        ? `AI recommends ${frameworkLabel(stackRec.platform, stackRec.framework)}: ${stackRec.reason}`
                        : "The starting point for generated code."
                    }>
                    {FRAMEWORKS[platform].map((option) => {
                      const isRecommended =
                        stackSource === "ai" &&
                        stackRec?.platform === platform &&
                        stackRec.framework === option.value;
                      return (
                        <RadioListItem
                          key={option.value}
                          value={option.value}
                          label={isRecommended ? `${option.label} · Recommended` : option.label}
                          description={option.description}
                        />
                      );
                    })}
                  </RadioList>
                  {stackSource === "ai" &&
                    stackRec &&
                    (platform !== stackRec.platform || framework !== stackRec.framework) && (
                      <Button
                        label="Use AI pick"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 md:min-h-0 self-start"
                        onClick={() => {
                          setPlatform(stackRec.platform);
                          setFramework(stackRec.framework);
                        }}
                      />
                    )}
                </FormLayout>
              )}
            </VStack>
          )}

          {step === 1 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Shape the build</Heading>
                <Text type="supporting" color="secondary">
                  Answer what you already know. These answers become context for
                  the PRD, tasks, and starter code.
                </Text>
              </VStack>

              {questionStatus === "ready" && (
                <HStack hAlign="end">
                  <Button
                    label="Regenerate"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 md:min-h-0"
                    onClick={() => void generateQuestions(idea)}
                  />
                </HStack>
              )}

              {questionStatus === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex flex-col items-center gap-3 py-10">
                  <Spinner size="lg" />
                  <Text type="supporting" color="secondary">
                    Reading your idea and drafting questions…
                  </Text>
                </div>
              )}

              {questionStatus === "ready" && questionSource === "local" && (
                <Banner
                  status="info"
                  title="Using the built-in questions"
                  description="The AI provider is unavailable right now, so MuseVibe is using its standard setup. You can still create the project."
                  collapsible={false}
                />
              )}

              {questionStatus === "ready" && questions.length > 0 && (
                <FormLayout defaultOptionality="optional">
                  {questions.map((question) => renderQuestion(question))}
                </FormLayout>
              )}
            </VStack>
          )}

          {step === 2 && (
            <DesignSetupStep
              projectName={name}
              design={design}
              onDesign={setDesign}
              logoUrl={logoUrl}
              logoOrigin={logoOrigin}
              logoPrompt={logoPrompt}
              onLogoPrompt={setLogoPrompt}
              logoSuggestion={suggestLogoBrief(
                name.trim() || "Untitled project",
                idea,
                answerToText(answers["core-action"]),
              )}
              logoStatus={logoStatus}
              logoError={logoError}
              logoBgNote={logoBgNote}
              logoRemoveBg={logoRemoveBg}
              onLogoRemoveBg={setLogoRemoveBg}
              onGenerateLogo={() => void generateLogo()}
              onUploadLogo={(file) => void uploadLogo(file)}
              logoFormat={logoFormat}
              onLogoFormat={setLogoFormat}
              logoHistory={logoHistory}
              onRestoreLogo={restoreLogo}
              svgVariants={svgVariants}
              svgStatus={svgStatus}
              onGenerateSvg={() => void generateLogoSvg()}
              onPickSvg={pickLogoSvg}
            />
          )}

          {step === REVIEW_STEP && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Review and finish</Heading>
                <Text type="supporting" color="secondary">
                  Check the brief before finishing setup. Everything stays in
                  this browser session.
                </Text>
              </VStack>

              {outstanding.length > 0 && (
                <Banner
                  status="error"
                  title={`${outstanding.length} ${
                    outstanding.length === 1 ? "step needs" : "steps need"
                  } attention`}
                  collapsible={false}>
                  <VStack gap={2}>
                    {outstanding.map((s) => (
                      <Text key={s.label} type="supporting">
                        {s.label}: {s.issues.join(" ")}
                      </Text>
                    ))}
                    <HStack gap={2}>
                      <Button
                        label={`Go to ${outstanding[0].label}`}
                        variant="secondary"
                        size="sm"
                        className="min-h-11 md:min-h-0"
                        onClick={() => {
                          const index = outstanding[0].index;
                          setAttempted((previous) => new Set(previous).add(index));
                          setStep(index);
                          focusFirstError(index);
                        }}
                      />
                    </HStack>
                  </VStack>
                </Banner>
              )}

              <MetadataList orientation="vertical">
                <MetadataListItem label="Project name">
                  {name.trim() || "Not set"}
                </MetadataListItem>
                {questions.map((question) => (
                  <MetadataListItem key={question.id} label={question.label}>
                    {answerToText(answers[question.id]) || "Not answered"}
                  </MetadataListItem>
                ))}
                <MetadataListItem label="Platform">
                  {platformLabel(platform)}
                </MetadataListItem>
                <MetadataListItem label="Framework">
                  {frameworkLabel(platform, framework)}
                </MetadataListItem>
                <MetadataListItem label="Design system">
                  {design
                    ? `${design.name} (${design.source === "template" ? "template" : design.source === "link" ? `from link${design.refUrl ? `: ${design.refUrl}` : ""}` : "uploaded"})`
                    : "Minimal (default)"}
                </MetadataListItem>
                <MetadataListItem label="Logo">
                  {logoUrl ? (
                    <HStack gap={2} vAlign="center">
                      <img
                        src={logoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                      <span>{logoOrigin === "ai" ? (logoFormat === "svg" ? "Drawn as vector" : "Drawn by the image model") : logoOrigin === "upload" ? "Uploaded" : "Saved mark, source unknown"}{logoFormat === "svg" ? ", SVG" : ""}{logoRemoveBg && logoFormat === "png" ? ", background removed" : ""}{logoHistory.length ? `, ${logoHistory.length} previous kept` : ""}</span>
                    </HStack>
                  ) : (
                    "Initials"
                  )}
                </MetadataListItem>
              </MetadataList>

              <Divider />

              <Text type="supporting" color="secondary">
                Create the project to return to your home screen with it at the
                top of the list.
              </Text>
            </VStack>
          )}
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack gap={3} vAlign="center">
            <StackItem size="fill" style={footerZone}>
              {STEPS[step].isOptional && (
                <Button
                  label="Skip"
                  variant="ghost"
                  className="min-h-11 md:min-h-0"
                  onClick={() => {
                    saveProgress(REVIEW_STEP);
                    setStep(REVIEW_STEP);
                  }}
                />
              )}
            </StackItem>
            <Text type="supporting" color="secondary">
              {step + 1} of {STEPS.length}
            </Text>
            <StackItem size="fill" style={footerZone}>
              <HStack gap={3} hAlign="end">
                <Button
                  label="Back"
                  variant="secondary"
                  className="min-h-11 md:min-h-0"
                  isDisabled={step === 0}
                  onClick={() => {
                    const next = Math.max(0, step - 1);
                    saveProgress(next);
                    setStep(next);
                  }}
                />
                <Button
                  label={
                    isLastStep
                      ? "Finish setup"
                      : step === 1 && questionStatus === "loading"
                        ? "Drafting questions…"
                        : "Next"
                  }
                  variant="primary"
                  className="min-h-11 md:min-h-0"
                  isDisabled={step === 1 && questionStatus !== "ready"}
                  onClick={goNext}
                />
              </HStack>
            </StackItem>
          </HStack>
        </LayoutFooter>
      }
    />
  );
}
