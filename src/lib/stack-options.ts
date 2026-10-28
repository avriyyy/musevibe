/**
 * Stack picker. Each platform offers two real frameworks; the AI recommends one
 * of them from the idea plus the questionnaire answers, and the user can always
 * override. Anything the provider returns is validated before it touches state.
 */

import type { Platform } from "./project-options";

export interface FrameworkOption {
  value: string;
  label: string;
  description: string;
}

export const FRAMEWORKS: Record<Platform, FrameworkOption[]> = {
  web: [
    {
      value: "nextjs",
      label: "Next.js",
      description: "React with server rendering and API routes in one deploy.",
    },
    {
      value: "vite-react",
      label: "Vite + React",
      description: "Client-side React with a fast dev loop, needs a separate backend.",
    },
  ],
  mobile: [
    {
      value: "expo",
      label: "Expo",
      description: "Managed React Native workflow, fastest path to store builds.",
    },
    {
      value: "react-native",
      label: "React Native",
      description: "Bare workflow with full native control, no managed layer.",
    },
  ],
  desktop: [
    {
      value: "tauri",
      label: "Tauri",
      description: "Lightweight desktop shell using the system webview.",
    },
    {
      value: "electron",
      label: "Electron",
      description: "Bundled Chromium shell, larger installs but mature tooling.",
    },
  ],
};

export interface StackRecommendation {
  platform: Platform;
  framework: string;
  reason: string;
}

export function frameworkLabel(platform: Platform, value: string | undefined): string {
  if (!value) return "Not set";
  return FRAMEWORKS[platform]?.find((option) => option.value === value)?.label ?? value;
}

export function isFrameworkFor(platform: Platform, value: string): boolean {
  return FRAMEWORKS[platform]?.some((option) => option.value === value) ?? false;
}

export function buildStackPrompt(idea: string, answers: string): string {
  const trimmedIdea = idea.replace(/\s+/g, " ").trim().slice(0, 800);
  const trimmedAnswers = answers.replace(/\s+/g, " ").trim().slice(0, 2000);

  return [
    "You pick the starting stack for a solo dev building their first version in MuseVibe.",
    `The app idea: "${trimmedIdea}".`,
    trimmedAnswers ? `What the user already answered: "${trimmedAnswers}".` : "",
    "",
    "Choose one platform and one framework from exactly these pairs:",
    "When no answers are given yet, base the pick on the idea alone.",
    '- web: "nextjs", "vite-react".',
    '- mobile: "expo", "react-native".',
    '- desktop: "tauri", "electron".',
    "",
    "Prefer the simplest pair that ships the idea: landing pages and forms are web, store distribution is mobile, installable tools are desktop.",
    "Return ONLY a JSON object with this shape, no markdown fences, no commentary:",
    '{"platform":"web","framework":"nextjs","reason":"one sentence, max 140 characters"}',
  ]
    .filter(Boolean)
    .join("\n");
}

function readReason(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 159).trimEnd()}…`;
}

/**
 * Accept the provider's raw text and return a validated recommendation, or
 * null when nothing usable survives. Unknown platforms and frameworks are
 * rejected rather than rendered.
 */
export function parseStackRecommendation(raw: unknown): StackRecommendation | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(first, last + 1)) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const entry = parsed as Record<string, unknown>;
  const platform = entry.platform;
  if (platform !== "web" && platform !== "mobile" && platform !== "desktop") return null;
  const framework = entry.framework;
  if (typeof framework !== "string" || !isFrameworkFor(platform, framework)) return null;

  return { platform, framework, reason: readReason(entry.reason) };
}
