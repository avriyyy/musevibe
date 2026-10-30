/**
 * Pure wizard hydration helpers. Extracted so project switching can be
 * unit-checked without mounting React: given a stored project, resolve only
 * that project's cached answers/questions/settings, never another project's
 * local state.
 */

import type { Platform, Timeline } from "./project-options";
import { FRAMEWORKS, isFrameworkFor } from "./stack-options";
import type { Project, ProjectAnswer } from "./types";
import type { WizardAnswers, WizardQuestion } from "./wizard";

export function restoreWizardAnswers(
  list: WizardQuestion[],
  saved: ProjectAnswer[] | undefined,
): WizardAnswers {
  if (!saved?.length) return {};
  const next: WizardAnswers = {};
  for (const question of list) {
    const entry =
      saved.find((item) => item.qid === question.id) ??
      saved.find((item) => item.question === question.label);
    if (!entry) continue;
    const value = entry.values ?? entry.answer;
    if (Array.isArray(value)) {
      // Older multi-select answers restored into a free-response control
      // become a readable comma-separated string instead of being dropped.
      if (question.type === "text" || question.type === "textarea") {
        const joined = value
          .map((item) => String(item).trim())
          .filter(Boolean)
          .join(", ");
        if (joined) next[question.id] = joined;
        continue;
      }
      const options = new Set(question.options ?? []);
      const kept = value
        .map((item) => String(item))
        .filter((option) => options.has(option));
      if (kept.length) {
        next[question.id] = question.type === "single" ? kept[0] : kept;
      } else if (question.type === "multi") {
        // Unknown options from an older questionnaire still carry meaning;
        // keep them as-is rather than erasing the user's answer.
        const raw = value.map((item) => String(item).trim()).filter(Boolean);
        if (raw.length) next[question.id] = raw;
      }
    } else if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (question.type === "single") {
        if ((question.options ?? []).includes(trimmed)) {
          next[question.id] = trimmed;
        } else if ((question.options ?? []).length === 0) {
          next[question.id] = trimmed;
        }
      } else if (question.type === "multi") {
        // A legacy free-response answer restored into options: split on
        // commas and keep what matches, else keep the raw text as one item.
        const options = new Set(question.options ?? []);
        const parts = trimmed
          .split(/[,;]\s*/)
          .map((part) => part.trim())
          .filter(Boolean);
        const kept = parts.filter((part) => options.has(part));
        if (kept.length) {
          next[question.id] = kept;
        } else if (trimmed) {
          next[question.id] = [trimmed];
        }
      } else {
        next[question.id] = trimmed;
      }
    }
  }
  return next;
}

export function resolveWizardFramework(
  platform: Platform,
  savedFramework: string | undefined,
): string {
  if (savedFramework && isFrameworkFor(platform, savedFramework)) return savedFramework;
  return FRAMEWORKS[platform][0].value;
}

export interface WizardHydratedState {
  platform: Platform;
  timeline: Timeline;
  framework: string;
  stackTouched: boolean;
  logoUrl: string | null;
  logoRemoveBg: boolean;
  logoFormat: "svg" | "png";
  hasCachedQuestions: boolean;
  restoredAnswers: WizardAnswers;
  wizardStep: number;
  hasSavedDesign: boolean;
}

export function resolveWizardHydration(
  project: Pick<
    Project,
    | "platform"
    | "timeline"
    | "framework"
    | "logoUrl"
    | "logoRemoveBg"
    | "logoFormat"
    | "questions"
    | "answers"
    | "wizardStep"
    | "designSystem"
  >,
  reviewStep: number,
): WizardHydratedState {
  const platform = project.platform ?? "web";
  return {
    platform,
    timeline: project.timeline ?? "two-weeks",
    framework: resolveWizardFramework(platform, project.framework),
    stackTouched: !!(project.platform || project.framework),
    logoUrl: project.logoUrl ?? null,
    logoRemoveBg: project.logoRemoveBg ?? true,
    logoFormat: project.logoFormat ?? "svg",
    hasCachedQuestions: !!(project.questions?.length),
    restoredAnswers: restoreWizardAnswers(project.questions ?? [], project.answers),
    wizardStep: Math.min(project.wizardStep ?? 0, reviewStep),
    hasSavedDesign: !!project.designSystem,
  };
}
