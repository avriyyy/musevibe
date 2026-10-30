"use client";

/**
 * Project-aware chat prompt. The workspace chat answers from the live
 * project: name, idea, brief, document titles, and the task board, so it
 * can discuss what is actually on screen instead of guessing.
 */

import type { Project, ProjectDoc, Task } from "./types";
import type { ChatQuote } from "./pick";
import { targetLine } from "./pick";

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
export function formatPins(pins: Array<ChatQuote>): string {
  if (!pins.length) return "";
  return pins
    .map((pin) => {
      const where = pin.text ? `: "${pin.text}"` : "";
      const note = pin.comment.trim() ? ` — ${pin.comment.trim()}` : "";
      return `- ${pin.label}${where}${note}${targetLine(pin.target)}`;
    })
    .join("\n");
}

export function buildActionPrompt(
  project: Project,
  brief: string,
  docs: ProjectDoc[],
  tasks: Task[],
  pages: Array<{ slug: string; title: string; generated: boolean }>,
  pins: Array<ChatQuote>,
  message: string,
): string {
  const lines = [
    `You operate the MuseVibe project "${project.name}". The user prompt below is a COMMAND, not a conversation. Carry it out with the listed actions and answer with JSON only. Never chat, explain, or ask follow-up questions in prose.`,
    `Idea: ${clamp(project.idea, 400)}`,
  ];
  if (brief.trim()) lines.push(`Brief: ${clamp(brief.trim(), 1200)}`);
  if (docs.length) {
    lines.push(
      `Documents: ${docs.map((doc) => `${doc.kind} "${doc.title || doc.kind}"`).join(", ")}`,
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
  if (pinned) lines.push(`Pinned context (exact targets in brackets):\n${pinned}`);
  // Include the current markdown of the pinned or named document(s) only,
  // bounded so a long doc cannot flood the prompt. Pinned edits get a larger
  // window (12k chars) so the model sees the full document, not a slice it
  // might then "complete" by dropping trailing sections.
  const relevantDocs = selectRelevantDocs(docs, pins, message);
  const FULL_DOC_CHARS = 12000;
  for (const doc of relevantDocs) {
    const raw = doc.markdown.trim();
    const truncated = raw.length > FULL_DOC_CHARS;
    const body = truncated ? raw.slice(0, FULL_DOC_CHARS) : raw;
    lines.push(
      ``,
      `Current "${doc.title || doc.kind}" document (kind=${doc.kind}, edit exactly this document, preserve unrelated sections):`,
      `"""${body || "(empty document)"}"""`,
      ...(truncated
        ? [
            `(Note: the document above was truncated at ${FULL_DOC_CHARS} chars for prompt size; the update_doc markdown you return must still be the COMPLETE new document — reproduce the full document with your edit applied, never a shortened excerpt.)`,
          ]
        : []),
    );
  }
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
    `- move_task {title, status}: move the task whose title matches EXACTLY (case-insensitive full-title match). status is one of: todo, doing, review, blocked, done, cancelled.`,
    `- generate_page {slug, note?}: regenerate one planned page; note carries the user's change request. slug must be one of: ${pages.map((page) => page.slug).join(", ") || "(none)"}.`,
    `- rename_project {name}: rename the project.`,
    ``,
    `Rules:`,
    `- Pick the smallest action list that fulfills the command; unrelated pins are context only.`,
    `- A pin with [target page slug="..."] must become generate_page for that exact slug with the pin comment as note. A pin with [target document kind="..."] must become update_doc for that exact kind. A pinned task with "done/finish/complete" becomes move_task to done for that exact task title (copy the pinned title verbatim). Never choose a different page slug, document kind, or task title than the pinned target.`,
    `- update_doc markdown is the COMPLETE new document: keep every unrelated section, heading, and detail exactly as in the current document above, changing only what the command and pin ask for. Concrete and specific, no em dashes, no TODO or placeholders. Never return a blank, shortened, or excerpt-only document; if you cannot produce the full document, return no update_doc action.`,
    `- generate_page note is a surgical change to the annotated component only; the page prompt already carries the current HTML to preserve.`,
    `- If the command matches nothing actionable, return {"note":"<what you need, plainly>","actions":[]}.`,
  );
  return lines.join("\n");
}

/** Which documents the model needs verbatim: pinned docs first, else a doc kind named in the command. */
function selectRelevantDocs(
  docs: ProjectDoc[],
  pins: Array<ChatQuote>,
  message: string,
): ProjectDoc[] {
  const pinnedKinds = pins
    .map((pin) => pin.target?.kind === "doc" ? pin.target.docKind : undefined)
    .filter((kind): kind is string => Boolean(kind));
  if (pinnedKinds.length) {
    const found = docs.filter((doc) => pinnedKinds.includes(doc.kind));
    if (found.length) return found.slice(0, 2);
  }
  const lowered = message.toLowerCase();
  const named = docs.filter((doc) => {
    const kind = doc.kind.toLowerCase();
    const title = (doc.title || "").toLowerCase();
    return (
      (kind.length >= 2 && lowered.includes(kind)) ||
      (title.length >= 3 && lowered.includes(title))
    );
  });
  return named.slice(0, 1);
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

/** Normalize a markdown heading for integrity comparison. Strips leading
 * heading markers so "# Title", "## Title", and a user-typed "Title" compare
 * the same. */
function normalizeHeading(value: string): string {
  return value
    .replace(/^#{1,6}\s*/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** All ## (and deeper) headings in a document, in order. */
export function extractMarkdownHeadings(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{2,}\s+\S/.test(line))
    .map(normalizeHeading);
}

/**
 * True when the user's command explicitly asks to remove content. English and
 * Indonesian verbs are accepted; Indonesian stems match with affixes
 * (menghapus, dihapuskan, menghilangkan, membuang, menyingkirkan).
 */
const REMOVAL_PATTERN =
  /\b(remove|removes|removed|removing|delet(e|es|ed|ing)|drop(s|ped|ping)?|cut|strip|omit)\b|hapus|hilang|buang|singkir/i;

export function isRemovalRequest(message: string, pins: Array<ChatQuote>): boolean {
  const haystack = [
    message,
    ...pins.map((pin) => `${pin.comment} ${pin.text}`),
  ]
    .join(" ")
    .toLowerCase();
  return REMOVAL_PATTERN.test(haystack);
}

/** True when one source line names the heading while asking to remove it. */
function isHeadingRemovalAllowed(
  heading: string,
  message: string,
  pins: Array<ChatQuote>,
): boolean {
  const core = heading.trim().toLowerCase();
  if (!core) return false;
  const sources = [message, ...pins.map((pin) => `${pin.comment} ${pin.text}`)];
  return sources.some((source) => {
    const lowered = (source || "").toLowerCase();
    return lowered.includes(core) && REMOVAL_PATTERN.test(lowered);
  });
}

/**
 * Fail-closed integrity check for a pinned document edit. The replacement
 * must be non-trivial and must preserve every existing ## heading by
 * default. A missing heading is allowed only when the user explicitly named
 * that heading in the same command or pin that asks to remove/delete it.
 * Truncated or blank model output fails and the caller must leave the
 * stored document unchanged.
 */
export function checkPinnedDocIntegrity(
  previous: string,
  next: string,
  message: string,
  pins: Array<ChatQuote>,
): { ok: boolean; reason?: string } {
  const before = previous.trim();
  const after = (next ?? "").trim();
  if (!after) return { ok: false, reason: "the replacement was blank" };
  // A complete document rewrite is never a one-liner.
  if (after.length < 80) {
    return { ok: false, reason: "the replacement was too short to be complete" };
  }
  if (!before) return { ok: true };
  const beforeWords = before.split(/\s+/).length;
  const afterWords = after.split(/\s+/).length;
  // A pinned edit that loses more than half its words is truncation, not an edit.
  if (afterWords < beforeWords * 0.4 && afterWords < beforeWords - 120) {
    return { ok: false, reason: "the replacement looks truncated" };
  }
  const oldHeadings = extractMarkdownHeadings(before);
  if (!oldHeadings.length) return { ok: true };
  const nextSet = new Set(extractMarkdownHeadings(after));
  const missing = oldHeadings.filter((heading) => !nextSet.has(heading));
  if (!missing.length) return { ok: true };
  const blocked = missing.filter(
    (heading) => !isHeadingRemovalAllowed(heading, message, pins),
  );
  if (blocked.length) {
    return {
      ok: false,
      reason: `a section went missing (${blocked.slice(0, 2).join("; ")})`,
    };
  }
  return { ok: true };
}
