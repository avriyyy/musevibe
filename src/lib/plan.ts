/**
 * Planning prompts and parsers. The wizard answers are the only context source:
 * they turn a one-line idea into a brief and a first task list without asking
 * the user to repeat themselves.
 */

import type { Project, Task, TaskStatus } from "./types";
import { answerToText } from "./wizard";
import { platformLabel, timelineLabel } from "./project-options";
import { frameworkLabel } from "./stack-options";

const MAX_ANSWERS = 1600;
const MAX_PRD_CONTEXT = 3200;
const MAX_TASK_TITLE = 110;
const MAX_TASK_NOTES = 160;
const MAX_TASKS = 10;

export function clampText(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

/** Q&A pairs as one compact paragraph for prompts. */
export function describeAnswers(project: Project): string {
  const parts: string[] = [];
  let total = 0;
  for (const entry of project.answers ?? []) {
    const value = answerToText(entry.values ?? entry.answer);
    if (!value) continue;
    const pair = `${entry.question} ${value}`;
    parts.push(pair);
    total += pair.length;
    if (total >= MAX_ANSWERS) break;
  }
  return clampText(parts.join("; "), MAX_ANSWERS);
}

export function stackSummary(project: Project): string {
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

export function buildPrdPrompt(project: Project): string {
  const idea = clampText(project.idea, 800);
  const answers = describeAnswers(project);
  const stack = stackSummary(project);

  return [
    "You are the planning partner in MuseVibe. Turn one app idea and the setup answers into a first-version PRD a solo developer can build from.",
    `Project name: "${project.name}".`,
    `The idea: "${idea}".`,
    answers ? `What the user answered during setup: "${answers}".` : "",
    stack ? `Chosen stack and timeline: ${stack}.` : "",
    "",
    "Write a markdown brief with exactly these sections, in this order:",
    "## Problem",
    "## Who it is for",
    "## The core flow",
    "## What ships first",
    "## Out of scope for v1",
    "## How we know it works",
    "",
    "Rules:",
    "- 220 to 380 words total. Concrete and specific to this product.",
    "- Use short paragraphs. Bullets only in 'What ships first' and 'Out of scope for v1', 4 to 6 items each.",
    "- The core flow is numbered steps from first open to the value moment.",
    "- 'How we know it works' is a manual check a developer can do, never a made-up metric.",
    "- No em dashes. No pricing, growth numbers, testimonials, or invented research.",
    "- Start with '# <project name>' and nothing else before it.",
    "- Return only the markdown, no fences or commentary.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildTasksPrompt(project: Project, prd: string): string {
  const brief = clampText(prd, MAX_PRD_CONTEXT);
  const answers = describeAnswers(project);
  const stack = stackSummary(project);

  return [
    "You break a first-version PRD into build tasks for one solo developer working in MuseVibe.",
    `Project: "${project.name}".`,
    `The idea: "${clampText(project.idea, 400)}".`,
    answers ? `Setup answers: "${answers}".` : "",
    stack ? `Stack: ${stack}.` : "",
    "",
    `The PRD:\n${brief}`,
    "",
    "Return ONLY a JSON object with this shape, no markdown fences, no commentary:",
    '{"tasks":[{"title":"Set up the project shell","status":"todo","notes":"one short detail"}]}',
    "",
    "Rules:",
    "- 7 to 9 tasks that together deliver what ships first in the PRD.",
    "- Order them the way they should be built. All statuses are \"todo\".",
    "- Each title starts with a verb, is specific, and stays under 90 characters.",
    "- notes is optional, under 120 characters, and never repeats the title.",
    "- Do not add tasks for hiring, marketing, analytics, or a store launch unless the PRD asks for them.",
  ]
    .filter(Boolean)
    .join("\n");
}

function unwrapJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  let text = raw.trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) text = text.slice(first, last + 1);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown): TaskStatus {
  if (value === "doing" || value === "done" || value === "todo") return value;
  return "todo";
}

/**
 * Accepts the provider's raw text and returns tasks that are safe to render.
 * Anything malformed is dropped; fewer than four survivors means the caller
 * should fall back to the local list.
 */
export function parseTasks(raw: unknown, idPrefix: string): Task[] | null {
  const parsed = unwrapJson(raw);
  if (!parsed) return null;

  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { tasks?: unknown }).tasks)
      ? (parsed as { tasks: unknown[] }).tasks
      : null;
  if (!items) return null;

  const tasks: Task[] = [];
  for (const item of items) {
    if (tasks.length >= MAX_TASKS) break;
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const title = clampText(
      typeof entry.title === "string"
        ? entry.title
        : typeof entry.task === "string"
          ? entry.task
          : "",
      MAX_TASK_TITLE,
    );
    if (!title) continue;
    const notes = clampText(
      typeof entry.notes === "string" ? entry.notes : "",
      MAX_TASK_NOTES,
    );
    tasks.push({
      id: `${idPrefix}-${tasks.length}`,
      title,
      status: normalizeStatus(entry.status),
      ...(notes ? { notes } : {}),
    });
  }

  return tasks.length >= 4 ? tasks : null;
}

/** Local brief built from the same fields the prompt uses, for offline demos. */
export function fallbackPrd(project: Project): string {
  const answers = (project.answers ?? [])
    .map((entry) => ({
      question: entry.question,
      value: answerToText(entry.values ?? entry.answer),
    }))
    .filter((entry) => entry.value);

  const core =
    answers.find((entry) => /action|day one|core/i.test(entry.question))?.value ??
    "work through the main screen and keep the result";
  const audience =
    answers.find((entry) => /who|audience|for/i.test(entry.question))?.value ??
    "the first user";
  const scopeOut = answers.find((entry) => /leave out|out of scope|skip/i.test(entry.question))?.value;

  const ships = [
    "The core screen that delivers the idea",
    `A working path for: ${clampText(core, 160)}`,
    "Local data so a reload keeps the work",
    "Empty, loading, and error states on every screen",
  ];
  const excluded = [
    scopeOut ? clampText(scopeOut, 160) : "Accounts and team features",
    "Payments and billing",
    "Notifications and email",
  ];

  const lines = [
    `# ${project.name}`,
    "",
    "## Problem",
    `${clampText(project.idea, 240)} is still just a note. The first version should prove the idea works before it grows a feature list.`,
    "",
    "## Who it is for",
    `${clampText(audience, 160)}. They want the result without learning a new tool first.`,
    "",
    "## The core flow",
    `1. Open the app and see the main screen.`,
    `2. ${clampText(core, 200)}.`,
    "3. See the result and keep it for next time.",
    "",
    "## What ships first",
    ...ships.map((item) => `- ${item}`),
    "",
    "## Out of scope for v1",
    ...excluded.map((item) => `- ${item}`),
    "",
    "## How we know it works",
    `A new person can finish this check without help: ${clampText(core, 160)}.`,
  ];
  return lines.join("\n");
}

/** Local task list that matches the fallback brief, so the demo never stalls. */
export function fallbackTasks(project: Project): Task[] {
  const stack = stackSummary(project);
  const core =
    (project.answers ?? [])
      .map((entry) => answerToText(entry.values ?? entry.answer))
      .find((value) => value.length > 8) ?? "";

  const titles = [
    ["Set up the app shell and base layout", stack ? `Target: ${clampText(stack, 120)}` : ""],
    ["Build the main screen and its empty state", ""],
    [core ? `Wire the flow: ${clampText(core, 80)}` : "Wire the core action end to end", ""],
    ["Add local data so reloads keep the work", ""],
    ["Handle loading and error states", ""],
    ["Review the flow on a small screen", ""],
    ["Run a full pass from open to result", ""],
  ] as const;

  return titles.map(([title, notes], index) => ({
    id: `local-task-${index}`,
    title,
    status: "todo" as TaskStatus,
    ...(notes ? { notes } : {}),
  }));
}
