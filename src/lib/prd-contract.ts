/**
 * Single source of truth for the PRD contract.
 *
 * first-run preparation, manual PRD generation, repair prompts, and the PRD
 * document entry in docs.ts all use these exact headings in this exact order.
 * Keeping them here (instead of in
 * plan.ts or docs.ts) avoids a circular import: both modules import from
 * this file, never from each other.
 */

import type { Project } from "./types";
import { answerToText } from "./wizard";
import { platformLabel, timelineLabel } from "./project-options";
import { frameworkLabel } from "./stack-options";

export const PRD_SECTIONS = [
  "## Problem",
  "## Who it is for",
  "## The core flow",
  "## What ships first",
  "## Out of scope for v1",
  "## How we know it works",
] as const;

export const PRD_GUIDANCE = [
  "Problem names only pain stated in the idea or setup answers; if none is stated, write a concise hypothesis and label it as such.",
  "Who it is for names the first user in one paragraph: who they are and what they want without learning a new tool.",
  "The core flow is numbered steps from first open to the value moment.",
  "What ships first is a bullet list of 4 to 6 items that together deliver the core flow.",
  "Out of scope for v1 is a bullet list of 3 to 5 items v1 deliberately skips.",
  "How we know it works is a manual check a developer can do, never a made-up metric.",
  "Use only facts from the idea and setup answers; do not claim competitor behavior, market facts, or user research unless the user supplied them.",
  "Mark unconfirmed product choices as assumptions instead of presenting them as established user needs.",
] as const;

/** Minimum words required by both the prompt and the PRD quality gate. */
export const PRD_MIN_WORDS = 250;

/** Wizard answers as one compact paragraph for prompts. */
export function prdAnswersText(project: Project): string {
  const parts: string[] = [];
  let total = 0;
  for (const entry of project.answers ?? []) {
    const value = answerToText(entry.values ?? entry.answer);
    if (!value) continue;
    const pair = `${entry.question} ${value}`;
    parts.push(pair);
    total += pair.length;
    if (total >= 4000) break;
  }
  const joined = parts.join("; ");
  const normalized = joined.replace(/\s+/g, " ").trim();
  return normalized.length > 4000 ? `${normalized.slice(0, 3999).trimEnd()}…` : normalized;
}

/** Selected stack and timeline as one short line for prompts. */
export function prdStackText(project: Project): string {
  const bits: string[] = [];
  if (project.platform) {
    bits.push(platformLabel(project.platform));
    if (project.framework) {
      bits.push(frameworkLabel(project.platform, project.framework));
    }
  }
  if (project.timeline) bits.push(timelineLabel(project.timeline));
  return bits.join(" · ");
}

/**
 * The one PRD prompt. Used for the first draft and for regeneration:
 * wizard answers and the selected stack are included whenever available,
 * so a regenerated PRD never loses the setup context.
 */
export function buildUnifiedPrdPrompt(project: Project): string {
  const idea = project.idea.replace(/\s+/g, " ").trim().slice(0, 800);
  const answers = prdAnswersText(project);
  const stack = prdStackText(project);
  return [
    "You are the planning partner in MuseVibe. Turn one app idea and the setup answers into a first-version PRD a solo developer can build from.",
    `Project name: "${project.name}".`,
    `The idea: "${idea}".`,
    answers ? `What the user answered during setup: "${answers}".` : "",
    stack ? `Chosen stack and timeline: ${stack}.` : "",
    "",
    "Write a markdown brief with exactly these sections, in this order:",
    ...PRD_SECTIONS,
    "",
    "Rules:",
    `- ${PRD_MIN_WORDS} to 380 words total. Concrete and specific to this product.`,
    "- Use short paragraphs. Bullets only in 'What ships first' and 'Out of scope for v1', 4 to 6 items each.",
    "- The core flow is numbered steps from first open to the value moment.",
    "- 'How we know it works' is a manual check a developer can do, never a made-up metric.",
    "- No em dashes. No pricing, growth numbers, testimonials, or invented research.",
    "- Use only facts from the idea and setup answers; do not claim competitor behavior, market facts, or user research unless the user supplied them.",
    "- Mark unconfirmed product choices as assumptions instead of presenting them as established user needs.",
    "- Do not invent user situations, behaviors, pain points, or consequences; if one is not stated, label it 'Hypothesis:' and keep it narrowly tied to the idea.",
    "- Start with '# <project name>' and nothing else before it.",
    "- Return only the markdown, no fences or commentary.",
  ]
    .filter(Boolean)
    .join("\n");
}
