/**
 * Pure wizard hydration helpers. Extracted so project switching can be
 * unit-checked without mounting React: given a stored project, resolve only
 * that project's cached answers/questions/settings, never another project's
 * local state.
 */

import type { Platform, Timeline } from "./project-options";
import { FRAMEWORKS, isFrameworkFor } from "./stack-options";
import type { Project, ProjectAnswer } from "./types";
import {
  CUSTOM_ANSWER_OPTION,
  isCustomAnswer,
  toCustomAnswer,
  type WizardAnswers,
  type WizardQuestion,
} from "./wizard";

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
      const values = value.map((item) => String(item).trim()).filter(Boolean);
      if (question.type === "single") {
        const kept = values.find((option) => options.has(option));
        const custom = values.find((option) => isCustomAnswer(option));
        if (kept) {
          next[question.id] = kept;
        } else if (custom) {
          next[question.id] = custom;
        } else if (values.length) {
          next[question.id] = toCustomAnswer(values.join(", "));
        }
      } else if (question.type === "multi") {
        // Unknown options and custom entries from an older questionnaire still
        // carry meaning; keep them rather than erasing the user's answer.
        const preserved = values.map((item) =>
          item === CUSTOM_ANSWER_OPTION ? toCustomAnswer("") : item,
        );
        const unique = [...new Set(preserved)];
        if (unique.length) next[question.id] = unique;
      }
    } else if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (question.type === "single") {
        if ((question.options ?? []).includes(trimmed)) {
          next[question.id] = trimmed;
        } else if (isCustomAnswer(trimmed)) {
          next[question.id] = trimmed;
        } else {
          // Preserve answers from older free-response questions as custom text.
          next[question.id] = toCustomAnswer(trimmed);
        }
      } else if (question.type === "multi") {
        // A legacy free-response answer restored into options: split on
        // commas and keep what matches, else keep the raw text as one item.
        if (isCustomAnswer(trimmed)) {
          next[question.id] = [trimmed];
          continue;
        }
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
