"use client";

/**
 * Project setup wizard. Three steps: the idea, the shape of the first build,
 * and a review before anything is written.
 *
 * Validation lives in one place so the Next button, the Stepper, and the
 * review banner all read the same rules. Errors stay hidden until a step has
 * been attempted, so an untouched field is never pre-flagged.
 */

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
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
import { useVibe } from "@/lib/store";

const STEPS = [
  { label: "Project" },
  { label: "Scope", isOptional: true },
  { label: "Review" },
];

const footerZone: CSSProperties = { flexBasis: 0 };

export default function FormWizardPage() {
  const router = useRouter();
  const addProject = useVibe((state) => state.addProject);
  const isNarrow = useMediaQuery("(max-width: 640px)");

  const nameRef = useRef<HTMLInputElement>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const submitted = useRef(false);

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());

  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [timeline, setTimeline] = useState<Timeline>("two-weeks");

  const projectErrors: Record<string, string> = {};
  if (!name.trim()) {
    projectErrors.name = "Name the project before you continue.";
  }
  if (!idea.trim()) {
    projectErrors.idea = "Write the one sentence you want to build from.";
  }

  const errorsByStep: Record<string, string>[] = [projectErrors, {}, {}];
  const shownErrors = (index: number) =>
    attempted.has(index) ? errorsByStep[index] : {};
  const currentErrors = shownErrors(step);
  const isLastStep = step === STEPS.length - 1;

  const outstanding = STEPS.map((s, index) => ({
    ...s,
    index,
    issues: Object.values(errorsByStep[index]),
  })).filter((s) => s.issues.length > 0);

  const focusFirstError = (index: number) => {
    if (index !== 0) return false;
    const target = !name.trim()
      ? nameRef
      : !idea.trim()
        ? ideaRef
        : null;
    if (!target) return false;
    requestAnimationFrame(() => target.current?.focus());
    return true;
  };

  const createProject = () => {
    if (submitted.current) return;
    submitted.current = true;
    addProject({
      id: crypto.randomUUID(),
      name: name.trim(),
      idea: idea.trim(),
      createdAt: new Date().toISOString(),
      platform,
      timeline,
    });
    router.push("/");
  };

  const goNext = () => {
    if (isLastStep) {
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
      return;
    }

    setAttempted((previous) => new Set(previous).add(step));
    if (focusFirstError(step)) return;
    setStep((current) => current + 1);
  };

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
                onClick={() => router.push("/")}
              />
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={setStep}
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

          {step === 2 && (
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
                  onClick={() => setStep(2)}
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
                  label={isLastStep ? "Create project" : "Next"}
                  variant="primary"
                  className="min-h-11 md:min-h-0"
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
