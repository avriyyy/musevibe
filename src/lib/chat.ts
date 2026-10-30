"use client";

/**
 * Project-aware chat prompt. The workspace chat answers from the live
 * project: name, idea, brief, document titles, and the task board, so it
 * can discuss what is actually on screen instead of guessing.
 */

import type { Project, ProjectDoc, Task } from "./types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function buildChatPrompt(
  project: Project,
  brief: string,
  docs: ProjectDoc[],
  tasks: Task[],
  history: ChatMessage[],
  message: string,
): string {
  const lines = [
    `You are MuseVibe, a concise product assistant inside a project workspace.`,
    `Answer in the user's language. Keep replies short and concrete. Never use em dashes.`,
    ``,
    `Project: ${project.name}`,
    `Idea: ${clamp(project.idea, 500)}`,
  ];
  if (brief.trim()) {
    lines.push(`Brief: ${clamp(brief.trim(), 1500)}`);
  }
  if (docs.length) {
    lines.push(
      `Documents: ${docs.map((doc) => doc.title || doc.kind).join(", ")}`,
    );
  }
  if (tasks.length) {
    lines.push(
      `Tasks (${tasks.length}): ${tasks
        .slice(0, 12)
        .map((task) => `[${task.status}] ${task.title}`)
        .join("; ")}${tasks.length > 12 ? "; …" : ""}`,
    );
  }
  const recent = history.slice(-8);
  if (recent.length) {
    lines.push(``, `Conversation so far:`);
    for (const turn of recent) {
      lines.push(`${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`);
    }
  }
  lines.push(``, `User: ${message}`, ``, `Assistant:`);
  return lines.join("\n");
}

/**
 * Action-only chat. The workspace has no conversation thread: every prompt
 * is a command that changes something (a document, a task, a page, the
 * project name). The model answers with machine-readable JSON only, the
 * workspace applies the listed actions, and the user sees a one-line
 * receipt instead of chatter.
 */

export type ChatAction =
  | { type: "update_doc"; kind: string; markdown: string }
  | { type: "add_task"; title: string; notes?: string }
  | { type: "move_task"; title: string; status: string }
  | { type: "generate_page"; slug: string; note?: string }
  | { type: "rename_project"; name: string };

export interface ChatActionResult {
  note: string;
  actions: ChatAction[];
}

/** Pinned quotes rendered the same way they appear above the composer. */
export function formatPins(pins: Array<{ label: string; text: string; comment: string }>): string {
  if (!pins.length) return "";
  return pins
    .map((pin) => {
      const where = pin.text ? `: "${pin.text}"` : "";
      const note = pin.comment.trim() ? ` — ${pin.comment.trim()}` : "";
      return `- ${pin.label}${where}${note}`;
    })
    .join("\n");
}

export function buildActionPrompt(
  project: Project,
  brief: string,
  docs: ProjectDoc[],
  tasks: Task[],
  pages: Array<{ slug: string; title: string; generated: boolean }>,
  pins: Array<{ label: string; text: string; comment: string }>,
  message: string,
): string {
  const lines = [
    `You operate the MuseVibe project "${project.name}". The user prompt below is a COMMAND, not a conversation. Carry it out with the listed actions and answer with JSON only. Never chat, explain, or ask follow-up questions in prose.`,
    `Idea: ${clamp(project.idea, 400)}`,
  ];
  if (brief.trim()) lines.push(`Brief: ${clamp(brief.trim(), 1200)}`);
  if (docs.length) {
    lines.push(
      `Documents (kind): ${docs.map((doc) => doc.kind).join(", ")}`,
    );
  }
  if (tasks.length) {
    lines.push(
      `Tasks: ${tasks.map((task) => `[${task.status}] ${task.title}`).join("; ")}`,
    );
  }
  if (pages.length) {
    lines.push(
      `Pages: ${pages.map((page) => `${page.slug} "${page.title}"${page.generated ? "" : " (not generated yet)"}`).join("; ")}`,
    );
  }
  const pinned = formatPins(pins);
  if (pinned) lines.push(`Pinned context:\n${pinned}`);
  lines.push(
    ``,
    `User command: ${message || "(no text, act on the pinned context)"}`,
    ``,
    `Return ONLY a JSON object with this shape, no fences, no commentary:`,
    `{"note":"one short sentence saying what changed","actions":[{"type":"update_doc","kind":"prd","markdown":"...full new markdown..."}]}`,
    ``,
    `Action types (use only these):`,
    `- update_doc {kind, markdown}: rewrite one plan document fully. kind is one of: ${docs.map((doc) => doc.kind).join(", ") || "prd"}.`,
    `- add_task {title, notes?}: append one task. Title starts with a verb, under 90 chars.`,
    `- move_task {title, status}: move the task whose title matches best. status is one of: todo, doing, review, blocked, done, cancelled.`,
    `- generate_page {slug, note?}: regenerate one planned page; note carries the user's change request. slug must be one of: ${pages.map((page) => page.slug).join(", ") || "(none)"}.`,
    `- rename_project {name}: rename the project.`,
    ``,
    `Rules:`,
    `- Pick the smallest action list that fulfills the command; unrelated pins are context only.`,
    `- A pinned change request on a page becomes generate_page with that request as note. A pinned task with "done/finish/complete" becomes move_task to done.`,
    `- update_doc markdown is the COMPLETE new document, concrete and specific, no em dashes, no TODO or placeholders.`,
    `- If the command matches nothing actionable, return {"note":"<what you need, plainly>","actions":[]}.`,
  );
  return lines.join("\n");
}

/** Parse the model's action JSON; null when it chatted instead. */
export function parseActionResponse(raw: unknown): ChatActionResult | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  try {
    const data = JSON.parse(text.slice(first, last + 1)) as {
      note?: unknown;
      actions?: unknown;
    };
    if (!Array.isArray(data.actions)) return null;
    const actions: ChatAction[] = [];
    for (const entry of data.actions) {
      if (typeof entry !== "object" || entry === null) continue;
      const item = entry as Record<string, unknown>;
      if (item.type === "update_doc" && typeof item.kind === "string" && typeof item.markdown === "string") {
        actions.push({ type: "update_doc", kind: item.kind, markdown: item.markdown });
      } else if (item.type === "add_task" && typeof item.title === "string" && item.title.trim()) {
        actions.push({
          type: "add_task",
          title: item.title.trim().slice(0, 110),
          notes: typeof item.notes === "string" ? item.notes.trim().slice(0, 160) : undefined,
        });
      } else if (item.type === "move_task" && typeof item.title === "string" && typeof item.status === "string") {
        actions.push({ type: "move_task", title: item.title, status: item.status });
      } else if (item.type === "generate_page" && typeof item.slug === "string") {
        actions.push({
          type: "generate_page",
          slug: item.slug,
          note: typeof item.note === "string" ? item.note.trim().slice(0, 500) : undefined,
        });
      } else if (item.type === "rename_project" && typeof item.name === "string" && item.name.trim()) {
        actions.push({ type: "rename_project", name: item.name.trim().slice(0, 80) });
      }
    }
    return {
      note: typeof data.note === "string" && data.note.trim() ? data.note.trim().slice(0, 200) : actions.length ? "Done." : "Nothing matched that command.",
      actions,
    };
  } catch {
    return null;
  }
}
