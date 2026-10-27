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
import { useVibe } from "@/lib/store";

const STEPS = [
  { label: "Project" },
  { label: "Questions" },
  { label: "Scope", isOptional: true },
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

  const [questions, setQuestions] = useState<WizardQuestion[]>([]);
  const [questionStatus, setQuestionStatus] = useState<QuestionStatus>(() =>
    idea.trim() ? "loading" : "idle",
  );
  const [questionSource, setQuestionSource] = useState<QuestionSource>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});

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

  const errorsByStep: Record<string, string>[] = [projectErrors, questionErrors, {}, {}];
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
      answers: answersList,
    });
    setDraftIdea("");
    router.push("/");
  };

  const goToStep = (next: number) => {
    if (next > 1 && questionsPending) return;
    if (next === 1 && idea.trim() && generatedFor !== idea.trim()) {
      void generateQuestions(idea);
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
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(REVIEW_STEP);
      return;
    }

    if (questionsPending) {
      setStep(1);
      void generateQuestions(idea);
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
        <LayoutContent>
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
                  Pick where it runs and the window you want to aim for. Both
                  have defaults, so you can skip this step.
                </Text>
              </VStack>
              <FormLayout defaultOptionality="optional">
                <RadioList
                  label="Platform"
                  value={platform}
                  onChange={(value) => setPlatform(value as Platform)}>
                  {PLATFORMS.map((option) => (
                    <RadioListItem
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </RadioList>
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
                <MetadataListItem label="Timeline">
                  {timelineLabel(timeline)}
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
                  isDisabled={step === 1 && questionStatus === "loading"}
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
