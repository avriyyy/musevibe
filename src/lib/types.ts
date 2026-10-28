import type { Platform, Timeline } from "./project-options";
import type { WizardAnswerValue, WizardQuestion } from "./wizard";

export type TaskStatus = "todo" | "doing" | "review" | "blocked" | "done" | "cancelled";

export interface ProjectAnswer {
  qid: string;
  question: string;
  answer: string;
  values?: WizardAnswerValue;
}

export interface ProjectDoc {
  id: string;
  /** One of the six plan kinds, or "note" for a custom supporting document. */
  kind: string;
  title: string;
  markdown: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  createdAt: string;
  lastOpenedAt?: string;
  /** Draft means the setup wizard is not finished yet and can be resumed. */
  status?: "draft" | "ready";
  /** Last wizard step reached, so an unfinished draft resumes where it stopped. */
  wizardStep?: number;
  platform?: Platform;
  timeline?: Timeline;
  /** Framework value from the stack picker, e.g. "nextjs". */
  framework?: string;
  /** Chat model chosen in the composer, reused by the wizard generators. */
  model?: string;
  answers?: ProjectAnswer[];
  /** Cached questionnaire so a refresh reuses it instead of calling the AI again. */
  questions?: WizardQuestion[];
  questionSource?: "ai" | "local";
  /** Image URL or data URL for the project logo. Absent means initials. */
  logoUrl?: string;
}

export interface Prd {
  problem: string;
  users: string;
  features: string[];
  scopeOut: string[];
  raw: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  linkedScreenId?: string;
  notes?: string;
}

export interface Screen {
  id: string;
  name: string;
  canvasJson: string; // tldraw snapshot JSON (stringified)
  components: string[];
}

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  language: string;
}
