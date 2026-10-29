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
