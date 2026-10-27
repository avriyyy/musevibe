/**
 * Setup-wizard questions. The AI drafts a short questionnaire from the idea the
 * user typed on the landing page; the parser below is the trust boundary, and
 * the fallback keeps the wizard usable when the provider is offline or returns
 * anything unexpected.
 */

export type WizardQuestionType = "text" | "textarea" | "single" | "multi";

export type WizardAnswerValue = string | string[];

export type WizardAnswers = Record<string, WizardAnswerValue>;

export interface WizardQuestion {
  id: string;
  label: string;
  description?: string;
  type: WizardQuestionType;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

const MAX_QUESTIONS = 6;
const MAX_LABEL = 100;
const MAX_DESCRIPTION = 160;
const MAX_PLACEHOLDER = 120;
const MAX_OPTION = 60;
const MAX_OPTIONS = 6;

export const FALLBACK_QUESTIONS: WizardQuestion[] = [
  {
    id: "audience",
    label: "Who is this for?",
    description: "Pick the closest group. It shapes the tone and the default screens.",
    type: "single",
    options: ["Just me", "A small team", "Public users", "Businesses"],
    required: true,
  },
  {
    id: "core-action",
    label: "What is the one action that must work on day one?",
    description: "One sentence. If everything else broke, this would still have to work.",
    type: "textarea",
    required: true,
    placeholder: "e.g. Add a habit and see today's streak",
  },
  {
    id: "first-build",
    label: "Which pieces belong in the first build?",
    description: "Leave out anything that can wait. You can add it after the demo.",
    type: "multi",
    options: [
      "Accounts and sign-in",
      "Data storage",
      "Payments",
      "Notifications",
      "Dashboard or analytics",
      "File uploads",
    ],
    required: true,
  },
  {
    id: "feel",
    label: "What should it feel like?",
    type: "single",
    options: ["Calm and minimal", "Bold and playful", "Dense and technical", "Warm and friendly"],
    required: true,
  },
  {
    id: "out-of-scope",
    label: "Anything to leave out of the first build?",
    description: "Optional. Naming it now keeps the PRD and tasks honest.",
    type: "textarea",
    required: false,
    placeholder: "e.g. No team accounts, no mobile app yet",
  },
];

export function buildQuestionPrompt(idea: string): string {
  const trimmed = idea.replace(/\s+/g, " ").trim().slice(0, 800);

  return [
    "You are the setup wizard for MuseVibe, a workspace that turns one app idea into a PRD, a task board, wireframes, and starter code.",
    `The user's idea: "${trimmed}"`,
    "",
    "Write 4 to 6 short questions that pin down what to build before anything is generated. Ask about this specific product, not about the tech stack, platform, or timeline.",
    "Return ONLY a JSON object with this shape:",
    '{"questions":[{"id":"audience","label":"Who is this for?","description":"Why it matters","type":"single","options":["Just me","A small team"],"required":true,"placeholder":""}]}',
    "",
    "Rules:",
    '- type is one of "text", "textarea", "single", "multi".',
    '- "single" and "multi" need 2 to 5 short options; leave options out for text types.',
    "- id is lowercase kebab-case and unique. label max 80 characters. description max 140 characters. placeholder max 100 characters.",
    "- At most two questions may require a written answer. Mark optional questions with required: false.",
    "- No markdown fences, no commentary.",
  ].join("\n");
}

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "question";
}

function uniqueId(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  const id = `${base}-${suffix}`;
  used.add(id);
  return id;
}

function normalizeType(value: unknown): WizardQuestionType | null {
  if (typeof value !== "string") return null;
  const type = value.toLowerCase().trim();
  if (type === "text" || type === "textarea" || type === "single" || type === "multi") {
    return type;
  }
  if (type === "select" || type === "radio" || type === "choice") return "single";
  if (type === "checkbox" || type === "multiselect" || type === "multiple") return "multi";
  return null;
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
 * Accepts the provider's raw text (or an already-parsed payload) and returns
 * only questions that are safe to render. Anything malformed is dropped; if
 * fewer than three survive, the caller should use the fallback set.
 */
export function parseWizardQuestions(raw: unknown): WizardQuestion[] | null {
  const parsed = unwrapJson(raw);
  if (!parsed) return null;

  const container = parsed as { questions?: unknown } | null;
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(container?.questions)
      ? container.questions
      : null;
  if (!items) return null;

  const usedIds = new Set<string>();
  const questions: WizardQuestion[] = [];

  for (const item of items) {
    if (questions.length >= MAX_QUESTIONS) break;
    if (!item || typeof item !== "object") continue;

    const entry = item as Record<string, unknown>;
    const label = readString(entry.label, MAX_LABEL);
    if (!label) continue;

    const type = normalizeType(entry.type);
    if (!type) continue;

    let options: string[] | undefined;
    if (type === "single" || type === "multi") {
      const rawOptions = Array.isArray(entry.options) ? entry.options : null;
      if (!rawOptions) continue;

      options = [];
      for (const option of rawOptions) {
        const value = readString(option, MAX_OPTION);
        if (value && !options.includes(value)) options.push(value);
        if (options.length >= MAX_OPTIONS) break;
      }
      if (options.length < 2) continue;
    }

    const rawId = typeof entry.id === "string" ? entry.id : label;
    const description = readString(entry.description, MAX_DESCRIPTION) ?? undefined;
    const placeholder = readString(entry.placeholder, MAX_PLACEHOLDER) ?? undefined;

    questions.push({
      id: uniqueId(slugify(rawId), usedIds),
      label,
      description,
      type,
      options,
      required: entry.required === true,
      placeholder,
    });
  }

  return questions.length >= 3 ? questions : null;
}

export function answerToText(value: WizardAnswerValue | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value.trim() : "";
}

export function isAnswered(value: WizardAnswerValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

export function deriveProjectName(idea: string): string {
  const words = idea
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
  if (!words) return "";
  return words.length > 48 ? `${words.slice(0, 47).trimEnd()}…` : words;
}
