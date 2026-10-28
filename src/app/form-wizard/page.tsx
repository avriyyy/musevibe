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
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  PLATFORMS,
  TIMELINES,
  platformLabel,
  timelineLabel,
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
  buildLogoPrompt,
  fileToLogoDataUrl,
  initials,
  type LogoOrigin,
  type LogoStatus,
} from "@/lib/logo";
import {
  FRAMEWORKS,
  buildStackPrompt,
  frameworkLabel,
  isFrameworkFor,
  parseStackRecommendation,
  type StackRecommendation,
} from "@/lib/stack-options";
import { useVibe } from "@/lib/store";
import { createDraftProject } from "@/lib/draft";

const STEPS = [
  { label: "Stack" },
  { label: "Questions" },
  { label: "Scope", isOptional: true },
  { label: "Logo", isOptional: true },
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
  const updateProject = useVibe((state) => state.updateProject);
  const setDraftIdea = useVibe((state) => state.setDraftIdea);
  const isNarrow = useMediaQuery("(max-width: 640px)");

  // The chat creates the draft project before navigating here, so the wizard
  // always edits an existing project and can be left and resumed. A legacy
  // ?idea= link without an id creates its draft on mount instead.
  const searchParams = useSearchParams();
  const liveId = searchParams.get("id") ?? "";
  const [createdId, setCreatedId] = useState("");
  const projectId = liveId || createdId;
  const project = useVibe((state) =>
    projectId ? state.projects.find((p) => p.id === projectId) : undefined,
  );
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

  const idea = project?.idea ?? "";
  const name = project?.name ?? "";
  const projectModel = project?.model;

  const questionRefs = useRef<Record<string, HTMLElement | null>>({});
  const submitted = useRef(false);
  const hydratedRef = useRef("");
  const projectIdRef = useRef(projectId);
  useEffect(() => {
    projectIdRef.current = projectId;
  });
  const requestRef = useRef(0);
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

  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>("loading");
  const [questionSource, setQuestionSource] = useState<QuestionSource>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoOrigin, setLogoOrigin] = useState<LogoOrigin>(null);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [logoStatus, setLogoStatus] = useState<LogoStatus>("idle");
  const [logoError, setLogoError] = useState("");
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logoRequestRef = useRef(0);
  const stackTouchedRef = useRef(false);

  // Saved answers ride on the project so a resumed draft keeps its progress.
  // Match by question id first, then by label for older drafts. Reads from
  // the store directly so the generator callback never captures stale state.
  const restoreAnswers = (list: WizardQuestion[]): WizardAnswers => {
    const saved =
      useVibe.getState().projects.find((p) => p.id === projectIdRef.current)?.answers ?? [];
    if (!saved.length) return {};
    const next: WizardAnswers = {};
    for (const question of list) {
      const entry =
        saved.find((item) => item.qid === question.id) ??
        saved.find((item) => item.question === question.label);
      if (!entry) continue;
      const value = entry.values ?? entry.answer;
      if (Array.isArray(value)) {
        const options = new Set(question.options ?? []);
        const kept = value.filter((option) => options.has(option));
        if (kept.length) next[question.id] = kept;
      } else if (typeof value === "string" && value.trim()) {
        if (question.type === "single") {
          if ((question.options ?? []).includes(value)) next[question.id] = value;
        } else {
          next[question.id] = value;
        }
      }
    }
    return next;
  };

  const generateQuestions = useCallback(async (ideaText: string) => {
    const trimmed = ideaText.trim();
    if (!trimmed) return;

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
    // of calling the AI again. Answers are matched back by question id.
    if (projectIdRef.current) {
      useVibe.getState().updateProject(projectIdRef.current, {
        questions: nextQuestions,
        questionSource: nextSource,
      });
    }
    setAnswers((current) => {
      const restored = restoreAnswers(nextQuestions);
      const next: WizardAnswers = { ...restored };
      for (const question of nextQuestions) {
        if (next[question.id] !== undefined) continue;
        const value = current[question.id];
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          const options = new Set(question.options ?? []);
          next[question.id] = value.filter((option) => options.has(option));
        } else if (question.type === "single") {
          next[question.id] = (question.options ?? []).includes(value) ? value : "";
        } else {
          next[question.id] = value;
        }
      }
      return next;
    });
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
  // continues with its saved scope, logo, answers, and step.
  useEffect(() => {
    if (!project || hydratedRef.current === project.id) return;
    hydratedRef.current = project.id;
    if (project.platform || project.framework) stackTouchedRef.current = true;
    setPlatform(project.platform ?? "web");
    setTimeline(project.timeline ?? "two-weeks");
    setFramework(
      project.framework && isFrameworkFor(project.platform ?? "web", project.framework)
        ? project.framework
        : FRAMEWORKS[project.platform ?? "web"][0].value,
    );
    setLogoUrl(project.logoUrl ?? null);
    setLogoOrigin(project.logoUrl ? "upload" : null);
    setLogoStatus("idle");
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
    }
    setStep(Math.min(project.wizardStep ?? 0, REVIEW_STEP));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const setAnswer = (id: string, value: WizardAnswerValue) => {
    setAnswers((current) => ({ ...current, [id]: value }));
  };

  const recommendStack = useCallback(async () => {
    const fingerprint = `${idea.trim()}${JSON.stringify(answers)}`;
    if (!idea.trim() || fingerprint === stackFor) return;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recommendStack();
  }, [idea, stackStatus, recommendStack]);

  const generateLogo = async () => {
    const description = logoPrompt.trim();
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
          prompt: buildLogoPrompt(description, name.trim() || "Untitled project", idea),
        }),
      });
      if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);

      const data = (await response.json()) as { image?: unknown; source?: unknown };
      if (requestId !== logoRequestRef.current) return;

      if (typeof data.image === "string" && data.image) {
        setLogoUrl(data.image);
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

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError("");
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogoUrl(dataUrl);
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

  const answersList = () =>
    questions
      .map((question) => ({
        qid: question.id,
        question: question.label,
        answer: answerToText(answers[question.id]),
        values: answers[question.id],
      }))
      .filter((entry) => entry.answer.length > 0);

  /** Persist wizard progress onto the project so leaving resumes cleanly. */
  const saveProgress = (nextStep: number) => {
    if (!projectId) return;
    updateProject(projectId, {
      answers: answersList(),
      platform,
      timeline,
      framework,
      ...(logoUrl ? { logoUrl } : {}),
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
    if (next === 2) {
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
      saveProgress(3);
      setStep(3);
      return;
    }

    if (step === 3) {
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

  const ideaPreview =
    idea.length > 160 ? `${idea.slice(0, 157).trimEnd()}…` : idea;

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
                <Heading level={1}>{name || "New project"}</Heading>
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

              {idea.trim() && (
                <Text type="supporting" color="secondary">
                  From your idea: “{ideaPreview}”
                </Text>
              )}

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

              {idea.trim() && (
                <HStack gap={3} vAlign="start">
                  <StackItem size="fill">
                    <Text type="supporting" color="secondary">
                      From your idea: “{ideaPreview}”
                    </Text>
                  </StackItem>
                  {questionStatus === "ready" && (
                    <Button
                      label="Regenerate"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 md:min-h-0"
                      onClick={() => void generateQuestions(idea)}
                    />
                  )}
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
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Set the timeline</Heading>
                <Text type="supporting" color="secondary">
                  Pick the window you want to aim for. It shapes how much the
                  first version takes on. Everything here has a default, so
                  you can skip this step.
                </Text>
              </VStack>

              <FormLayout defaultOptionality="optional">
                <Selector
                  label="Target timeline"
                  options={TIMELINES}
                  value={timeline}
                  onChange={(value) => setTimeline(value as Timeline)}
                  description="A target, not a deadline."
                />
              </FormLayout>
            </VStack>
          )}

          {step === 3 && (
            <VStack gap={5}>
              <VStack gap={1}>
                <Heading level={2}>Give it a mark</Heading>
                <Text type="supporting" color="secondary">
                  Describe the logo you want and let the image model draw it,
                  or upload your own. Skip to keep your initials as the mark.
                </Text>
              </VStack>

              <HStack gap={4} vAlign="center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`Logo for ${name.trim() || "the new project"}`}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[24px] font-semibold text-[#c9cdd6]">
                    {initials(name.trim() || "?")}
                  </div>
                )}
                <VStack gap={1}>
                  <Text type="label">
                    {logoUrl
                      ? logoOrigin === "ai"
                        ? "Drawn from your description"
                        : "Uploaded by you"
                      : "Initials for now"}
                  </Text>
                  <Text type="supporting" color="secondary">
                    {logoUrl
                      ? "This is the mark stored on the project."
                      : "Generate or upload to replace it. Skipping is fine."}
                  </Text>
                </VStack>
              </HStack>

              <FormLayout defaultOptionality="optional">
                <TextArea
                  label="Describe the logo"
                  rows={3}
                  value={logoPrompt}
                  onChange={setLogoPrompt}
                  placeholder="A calm circle with a small sprout, deep green on transparent"
                  description="One or two sentences: motif, colors, mood."
                />
              </FormLayout>

              <HStack gap={3} vAlign="center">
                <Button
                  label={logoStatus === "loading" ? "Drawing…" : "Generate logo"}
                  variant="primary"
                  className="min-h-11 md:min-h-0"
                  isDisabled={!logoPrompt.trim() || logoStatus === "loading"}
                  onClick={() => void generateLogo()}
                />
                <Button
                  label="Upload"
                  variant="secondary"
                  className="min-h-11 md:min-h-0"
                  onClick={() => logoFileRef.current?.click()}
                />
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  aria-label="Upload your own logo"
                  onChange={(event) => {
                    void uploadLogo(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </HStack>

              {logoStatus === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3">
                  <Spinner size="md" />
                  <Text type="supporting" color="secondary">
                    Drawing your logo…
                  </Text>
                </div>
              )}

              {logoError && (
                <Banner
                  status="error"
                  title="Logo unavailable"
                  description={logoError}
                  collapsible={false}
                />
              )}
            </VStack>
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
                <MetadataListItem label="Idea">
                  {idea.trim() || "Not set"}
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
                <MetadataListItem label="Timeline">
                  {timelineLabel(timeline)}
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
                      <span>{logoOrigin === "ai" ? "Drawn by the image model" : "Uploaded"}</span>
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
