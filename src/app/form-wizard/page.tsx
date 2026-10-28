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
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
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
  deriveProjectName,
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

const STEPS = [
  { label: "Project" },
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
  return isClient ? <Wizard /> : <WizardLoading />;
}

function Wizard() {
  const router = useRouter();
  const draftIdea = useVibe((state) => state.draftIdea);
  const setDraftIdea = useVibe((state) => state.setDraftIdea);
  const addProject = useVibe((state) => state.addProject);
  const isNarrow = useMediaQuery("(max-width: 640px)");

  const nameRef = useRef<HTMLInputElement>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const questionRefs = useRef<Record<string, HTMLElement | null>>({});
  const submitted = useRef(false);
  const startedRef = useRef(false);
  const requestRef = useRef(0);

  const [idea, setIdea] = useState(() => {
    const queryIdea = (new URLSearchParams(window.location.search).get("idea") ?? "").trim();
    return (draftIdea || queryIdea).trim();
  });
  const [name, setName] = useState(() => deriveProjectName(idea));
  const [step, setStep] = useState(() => (idea.trim() ? 1 : 0));
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
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>(() =>
    idea.trim() ? "loading" : "idle",
  );
  const [questionSource, setQuestionSource] = useState<QuestionSource>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoOrigin, setLogoOrigin] = useState<LogoOrigin>(null);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [logoStatus, setLogoStatus] = useState<LogoStatus>("idle");
  const [logoError, setLogoError] = useState("");
  const logoFileRef = useRef<HTMLInputElement>(null);
  const logoRequestRef = useRef(0);

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
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "questions",
          prompt: buildQuestionPrompt(trimmed),
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
    setAnswers((current) => {
      const next: WizardAnswers = {};
      for (const question of nextQuestions) {
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
    if (startedRef.current) return;
    startedRef.current = true;
    // Kick off the one request this mount needs; the generator owns its state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (idea.trim()) void generateQuestions(idea);
  }, [idea, generateQuestions]);

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
        body: JSON.stringify({ kind: "stack", prompt: buildStackPrompt(idea, summary) }),
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
    setPlatform(next.platform);
    setFramework(next.framework);
  }, [idea, answers, questions, stackFor]);

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

  const projectErrors: Record<string, string> = {};
  if (!name.trim()) {
    projectErrors.name = "Name the project before you continue.";
  }
  if (!idea.trim()) {
    projectErrors.idea = "Write the one sentence you want to build from.";
  }

  const questionErrors: Record<string, string> = {};
  for (const question of questions) {
    if (question.required && !isAnswered(answers[question.id])) {
      questionErrors[question.id] = "Add an answer to continue.";
    }
  }

  const errorsByStep: Record<string, string>[] = [projectErrors, questionErrors, {}, {}, {}];
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
    if (index === 0) {
      const target = !name.trim() ? nameRef : !idea.trim() ? ideaRef : null;
      if (!target) return false;
      requestAnimationFrame(() => target.current?.focus());
      return true;
    }

    if (index === 1) {
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
    }

    return false;
  };

  const createProject = () => {
    if (submitted.current) return;
    submitted.current = true;

    const answersList = questions
      .map((question) => ({
        question: question.label,
        answer: answerToText(answers[question.id]),
      }))
      .filter((entry) => entry.answer.length > 0);

    addProject({
      id: crypto.randomUUID(),
      name: name.trim(),
      idea: idea.trim(),
      createdAt: new Date().toISOString(),
      platform,
      timeline,
      framework,
      answers: answersList,
      ...(logoUrl ? { logoUrl } : {}),
    });
    setDraftIdea("");
    router.push("/");
  };

  const goToStep = (next: number) => {
    if (next > 1 && questionsPending) return;
    if (next === 1 && idea.trim() && generatedFor !== idea.trim()) {
      void generateQuestions(idea);
    }
    if (next === 2) {
      void recommendStack();
    }
    setStep(next);
  };

  const goNext = () => {
    if (step === 0) {
      setAttempted((previous) => new Set(previous).add(0));
      if (focusFirstError(0)) return;
      if (!questions.length || generatedFor !== idea.trim()) {
        void generateQuestions(idea);
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (questionStatus === "loading") return;
      setAttempted((previous) => new Set(previous).add(1));
      if (focusFirstError(1)) return;
      void recommendStack();
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      setStep(REVIEW_STEP);
      return;
    }

    if (questionsPending) {
      setStep(1);
      if (questionStatus !== "loading") void generateQuestions(idea);
      return;
    }

    const invalid = errorsByStep.findIndex(
      (errors) => Object.keys(errors).length > 0,
    );
    if (invalid !== -1) {
      setAttempted((previous) => new Set(previous).add(invalid));
      setStep(invalid);
      focusFirstError(invalid);
      return;
    }
    createProject();
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
          status={status}>
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
          status={status}>
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
                <Heading level={1}>New project</Heading>
              </StackItem>
              <Button
                label="Cancel"
                variant="ghost"
                className="min-h-11 md:min-h-0"
                onClick={() => {
                  setDraftIdea("");
                  router.push("/");
                }}
              />
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={goToStep}
              label="New project progress"
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
                <Heading level={2}>Start with the idea</Heading>
                <Text type="supporting" color="secondary">
                  Give the project a name and keep the idea to one sentence.
                  Both appear on your home screen.
                </Text>
              </VStack>
              <FormLayout>
                <TextInput
                  label="Project name"
                  ref={nameRef}
                  isRequired
                  value={name}
                  onChange={setName}
                  placeholder="Habit tracker for indie devs"
                  status={
                    currentErrors.name
                      ? { type: "error", message: currentErrors.name }
                      : undefined
                  }
                />
                <TextArea
                  label="One-sentence idea"
                  ref={ideaRef}
                  isRequired
                  rows={3}
                  value={idea}
                  onChange={setIdea}
                  maxLength={280}
                  placeholder="A habit tracker that never guilt-trips."
                  description="A concrete sentence is easier to turn into tasks than a category."
                  status={
                    currentErrors.idea
                      ? { type: "error", message: currentErrors.idea }
                      : undefined
                  }
                />
              </FormLayout>
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

              {questionStatus === "idle" && (
                <Banner
                  status="info"
                  title="Add the idea first"
                  description="The questions are written from your idea. Go back one step and describe the project."
                  collapsible={false}>
                  <Button
                    label="Back to the idea"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 md:min-h-0"
                    onClick={() => setStep(0)}
                  />
                </Banner>
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
                <Heading level={2}>Shape the first build</Heading>
                <Text type="supporting" color="secondary">
                  Pick where it runs, which framework to start from, and the
                  window you want to aim for. Everything here has a default,
                  so you can skip this step.
                </Text>
              </VStack>

              {stackStatus === "loading" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3">
                  <Spinner size="md" />
                  <Text type="supporting" color="secondary">
                    Reading your answers and picking a stack…
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
                    onChange={(value) => {
                      const next = value as Platform;
                      setPlatform(next);
                      setFramework((current) =>
                        isFrameworkFor(next, current) ? current : FRAMEWORKS[next][0].value,
                      );
                    }}>
                    {PLATFORMS.map((option) => (
                      <RadioListItem
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        description={option.description}
                      />
                    ))}
                  </RadioList>
                  <RadioList
                    label="Framework"
                    value={framework}
                    onChange={setFramework}
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
                  <Selector
                    label="Target timeline"
                    options={TIMELINES}
                    value={timeline}
                    onChange={(value) => setTimeline(value as Timeline)}
                    description="A target, not a deadline."
                  />
                </FormLayout>
              )}
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
                <Heading level={2}>Review and create</Heading>
                <Text type="supporting" color="secondary">
                  Check the brief. Creating a project only writes to this
                  browser session.
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
                  onClick={() => setStep(REVIEW_STEP)}
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
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                />
                <Button
                  label={
                    isLastStep
                      ? "Create project"
                      : step === 1 && questionStatus === "loading"
                        ? "Drafting questions…"
                        : "Next"
                  }
                  variant="primary"
                  className="min-h-11 md:min-h-0"
                  isDisabled={
                    step === 1 &&
                    (questionStatus === "loading" || questionStatus === "idle")
                  }
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
