/**
 * Setup-wizard questions. The AI drafts a short questionnaire from the idea the
 * user typed on the landing page; the parser below is the trust boundary, and
 * the fallback keeps the wizard usable when the provider is offline or returns
 * anything unexpected.
 */

export type WizardQuestionType = "text" | "textarea" | "single" | "multi";

export type WizardAnswerValue = string | string[];

export type WizardAnswers = Record<string, WizardAnswerValue>;

/** Internal choice value used to persist a user-entered answer separately from listed options. */
const CUSTOM_ANSWER_PREFIX = "__musevibe_custom_answer__:";

export const CUSTOM_ANSWER_OPTION = "__musevibe_type_your_answer__";

export function toCustomAnswer(value: string): string {
  return `${CUSTOM_ANSWER_PREFIX}${value}`;
}

export function isCustomAnswer(value: WizardAnswerValue | undefined): boolean {
  if (typeof value === "string") return value.startsWith(CUSTOM_ANSWER_PREFIX);
  return Array.isArray(value) && value.some((item) => item.startsWith(CUSTOM_ANSWER_PREFIX));
}

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

/** Stable questionnaire coverage. First four are required. */
export const REQUIRED_QUESTION_IDS = ["audience", "problem", "core-action", "first-build"] as const;
export const OPTIONAL_QUESTION_IDS = ["constraints-integrations", "out-of-scope"] as const;
export const CANONICAL_QUESTION_IDS = [...REQUIRED_QUESTION_IDS, ...OPTIONAL_QUESTION_IDS] as const;

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
    id: "problem",
    label: "What problem does this solve?",
    description: "Pick the closest challenge; choose “Type your answer” if none fit.",
    type: "single",
    options: [
      "Too much manual work",
      "Information is scattered",
      "It's hard to stay consistent",
      "Current tools are too complex",
    ],
    required: true,
    placeholder: "Describe the problem you want to solve",
  },
  {
    id: "core-action",
    label: "What is the core workflow that must work on day one?",
    description: "Pick the main thing people will do; choose “Type your answer” if needed.",
    type: "single",
    options: [
      "Create and organize items",
      "Search and find information",
      "Track progress over time",
      "Share or collaborate",
    ],
    required: true,
    placeholder: "Describe the main action",
  },
  {
    id: "first-build",
    label: "What should the first version include?",
    description: "Pick the closest starting point; choose “Type your answer” for something else.",
    type: "multi",
    options: [
      "A simple dashboard",
      "A list with detail pages",
      "A guided create flow",
      "Progress and status tracking",
    ],
    required: true,
    placeholder: "Describe what the first version should include",
  },
  {
    id: "constraints-integrations",
    label: "Any constraints or integrations to respect?",
    description: "Optional. Select any that apply, or add your own.",
    type: "multi",
    options: [
      "Must work offline",
      "Import existing data",
      "Use an existing service",
      "Keep data private or local",
    ],
    required: false,
    placeholder: "Add a constraint or integration",
  },
  {
    id: "out-of-scope",
    label: "Anything to leave out of the first build?",
    description: "Optional. Select anything to leave out, or add your own.",
    type: "multi",
    options: [
      "No accounts or teams yet",
      "No payments or subscriptions",
      "No mobile app yet",
      "No admin dashboard",
    ],
    required: false,
    placeholder: "Add anything to leave out",
  },
];

export function buildQuestionPrompt(idea: string): string {
  const trimmed = idea.replace(/\s+/g, " ").trim().slice(0, 800);

  return [
    "You are the setup wizard for MuseVibe, a workspace that turns one app idea into a PRD, a task board, wireframes, and starter code.",
    `The user's idea: "${trimmed}"`,
    "",
    "Write exactly 6 short questions that pin down what to build before anything is generated. Make each question specific to this product, not about the tech stack, platform, framework, or timeline (a separate step already captures those).",
    "Use exactly these stable ids and coverage, in this order. Choose the answer type for each question based on what users may reasonably need:",
    '1. id "audience" (required): who the product is for; usually single-select.',
    '2. id "problem" (required): the problem or need it solves.',
    '3. id "core-action" (required): the core workflow that must work on day one; usually single-select.',
    '4. id "first-build" (required): what the first version includes — screens, features, or data; use multi-select when several can apply.',
    '5. id "constraints-integrations" (optional): constraints or integrations to respect; use multi-select when several can apply.',
    '6. id "out-of-scope" (optional): what the first build deliberately leaves out; use multi-select when several can apply.',
    "",
    "Return ONLY a JSON object with this shape:",
    '{"questions":[{"id":"audience","label":"Who is this for?","description":"Pick the closest match or use the custom-answer choice","type":"single","options":["Just me","A small team","Public users"],"required":true,"placeholder":"Describe your audience"}]}',
    "",
    "Rules:",
    '- Use type "single" when one best answer is expected; use type "multi" when several answers can apply at once (for example, features, constraints, integrations, or exclusions). Mix the two types where appropriate; do not make every question the same type.',
    '- Every question must provide 3 to 5 concise, useful options tailored to the idea. The interface adds a separate "Type your answer" choice, so do not include it in options.',
    '- Include a short placeholder for the input shown when the user chooses "Type your answer".',
    "- Keep the six ids above verbatim (lowercase kebab-case). label max 80 characters. description max 140 characters. placeholder max 100 characters.",
    "- Mark the first four required: true and the last two required: false.",
    "- Do not ask about platform, framework, timeline, or tech stack.",
    "- Do not suggest accounts, sign-in, auth, backend, or payments as default scope.",
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
 * only the six canonical questions in canonical order. Anything else falls
 * back: the six ids are required coverage (the two optional ids mean
 * optional answers, not optional questions), questions must be choice-based,
 * and any extra, duplicate, missing, or mistyped entry
 * returns null so the caller uses FALLBACK_QUESTIONS. Cached drafts bypass
 * this gate entirely, so old questionnaires stay usable and no migration is
 * forced.
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

  // Exactly six entries: no missing optionals, no noncanonical extras.
  if (items.length !== MAX_QUESTIONS) return null;

  const canonicalSet = new Set<string>(CANONICAL_QUESTION_IDS as readonly string[]);
  const requiredSet = new Set<string>(REQUIRED_QUESTION_IDS as readonly string[]);
  const byId = new Map<string, WizardQuestion>();

  for (const item of items) {
    if (!item || typeof item !== "object") return null;

    const entry = item as Record<string, unknown>;
    const rawId = typeof entry.id === "string" ? entry.id : "";
    const id = slugify(rawId);
    if (!canonicalSet.has(id)) return null;
    if (byId.has(id)) return null;

    const label = readString(entry.label, MAX_LABEL);
    if (!label) return null;

    const type = normalizeType(entry.type);
    if (!type) return null;

    // Keep new questions choice-first; unsupported free-text responses use the UI's custom option.
    if (type !== "single" && type !== "multi") return null;

    let options: string[] | undefined;
    if (type === "single" || type === "multi") {
      const rawOptions = Array.isArray(entry.options) ? entry.options : null;
      if (!rawOptions) return null;

      options = [];
      for (const option of rawOptions) {
        const value = readString(option, MAX_OPTION);
        if (value && !options.includes(value)) options.push(value);
        if (options.length >= MAX_OPTIONS) break;
      }
      if (options.length < 2) return null;
    }

    const description = readString(entry.description, MAX_DESCRIPTION) ?? undefined;
    const placeholder = readString(entry.placeholder, MAX_PLACEHOLDER) ?? undefined;

    byId.set(id, {
      id,
      label,
      description,
      type,
      options,
      // First four required, last two optional; never trust the model flag.
      required: requiredSet.has(id),
      placeholder,
    });
  }

  for (const canonicalId of CANONICAL_QUESTION_IDS) {
    if (!byId.has(canonicalId)) return null;
  }

  return CANONICAL_QUESTION_IDS.map((canonicalId) => byId.get(canonicalId) as WizardQuestion);
}

export function answerToText(value: WizardAnswerValue | undefined): string {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item.startsWith(CUSTOM_ANSWER_PREFIX)
          ? item.slice(CUSTOM_ANSWER_PREFIX.length).trim()
          : item.trim(),
      )
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "string" && isCustomAnswer(value)) {
    return value.slice(CUSTOM_ANSWER_PREFIX.length).trim();
  }
  return typeof value === "string" ? value.trim() : "";
}

export function isAnswered(value: WizardAnswerValue | undefined): boolean {
  return answerToText(value).length > 0;
}

export function deriveProjectName(idea: string): string {
  return idea.trim() ? "New project" : "";
}
/** Prompt for a concise internal workspace label, never the customer-facing brand. */
export function buildNamePrompt(idea: string): string {
  const trimmed = idea.replace(/\s+/g, " ").trim().slice(0, 500);
  return [
    "Give this app idea a concise internal workspace project label, not a customer-facing brand name.",
    `Idea: "${trimmed}".`,
    "",
    "Rules: 2 to 5 words, Title Case, plain words only. Summarize the idea; do not copy request wording or instructions.",
    "No quotes, no punctuation, no tagline, no explanation.",
    "Reply with ONLY the name.",
  ].join("\n");
}

/**
 * Accept the model's raw reply and return a clean name, or null when nothing
 * usable survives. The caller falls back to deriveProjectName.
 */
export function parseProjectName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const firstLine = raw.split("\n")[0]?.trim() ?? "";
  const cleaned = firstLine
    .replace(/^["'`*#>\\-\\s]+/, "")
    .replace(/["'`*\\s.]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
  return cleaned || null;
}
