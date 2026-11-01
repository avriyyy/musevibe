/**
 * Planning prompts and parsers. The wizard answers are the only context source:
 * they turn a one-line idea into a brief and a first task list without asking
 * the user to repeat themselves.
 */

import type { Project, Task, TaskStatus } from "./types";
import { answerToText } from "./wizard";
import {
  buildUnifiedPrdPrompt,
  prdAnswersText,
  prdStackText,
} from "./prd-contract";

const MAX_PRD_CONTEXT = 3200;
const MAX_TASK_TITLE = 89;
const MAX_TASK_NOTES = 119;
const MAX_TASKS = 9;

export function clampText(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

/** Capitalize a clause and drop a trailing stop, so it fits mid-sentence. */
function sentence(value: string): string {
  const trimmed = value.trim().replace(/[.!?]+$/, "");
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

/** Q&A pairs as one compact paragraph for prompts. */
export function describeAnswers(project: Project): string {
  return prdAnswersText(project);
}

export function stackSummary(project: Project): string {
  return prdStackText(project);
}

/**
 * Small shared planning memory for downstream generation. It carries only the
 * user decisions and a short approved-PRD excerpt, rather than replaying the
 * whole document into every independent agent-like task.
 */
export function buildPlanningMemory(project: Project, prd: string): string {
  const answers = new Map(
    (project.answers ?? []).map((entry) => [
      entry.qid,
      answerToText(entry.values ?? entry.answer),
    ]),
  );
  const decisions: Array<[string, string | undefined]> = [
    ["Audience", answers.get("audience")],
    ["Problem", answers.get("problem")],
    ["Core workflow", answers.get("core-action")],
    ["First version", answers.get("first-build")],
    ["Constraints and integrations", answers.get("constraints-integrations")],
    ["Out of scope", answers.get("out-of-scope")],
  ];
  const setup = decisions
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${clampText(value ?? "", 140)}`);
  const stack = stackSummary(project);
  return [
    "Shared planning memory (user decisions are the source of truth):",
    ...setup,
    stack ? `Stack: ${clampText(stack, 180)}` : "",
    prd.trim() ? `Approved PRD excerpt: ${clampText(prd, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2600);
}

export function buildPrdPrompt(project: Project): string {
  return buildUnifiedPrdPrompt(project);
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

/**
 * Accepts the provider's raw text and returns tasks that are safe to render.
 * Anything malformed is dropped; fewer than seven survivors means the caller
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
      // The request explicitly asks for a first-pass checklist, so generated
      // tasks must not arrive pre-completed or blocked.
      status: "todo",
      ...(notes ? { notes } : {}),
    });
  }

  return tasks.length >= 7 ? tasks : null;
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
    [core ? `Wire the flow: ${sentence(clampText(core, 80))}` : "Wire the core action end to end", ""],
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
