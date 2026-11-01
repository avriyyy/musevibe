import type {
  CloudWorkspaceRecord,
  CloudWorkspaceSnapshot,
  CodeFile,
  Project,
  ProjectDoc,
  Screen,
  Task,
} from "./types";

export const MAX_WORKSPACE_BYTES = 3 * 1024 * 1024;
export const MAX_WORKSPACES_PER_ACCOUNT = 500;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_STATUSES = new Set<Task["status"]>([
  "todo",
  "doing",
  "review",
  "blocked",
  "done",
  "cancelled",
]);
const DOC_SOURCES = new Set<ProjectDoc["source"]>([
  "ai",
  "local",
  "edited",
  undefined,
]);
const PROJECT_KEYS = new Set([
  "id", "name", "brandName", "idea", "createdAt", "lastOpenedAt", "status",
  "wizardStep", "platform", "timeline", "framework", "model", "answers",
  "questions", "questionSource", "logoUrl", "logoOrigin", "logoRemoveBg",
  "logoFormat", "logoHistory", "logoBrief", "designSystem", "pagePlan",
  "pagePlanSource", "planningPrep", "planningRun",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: Set<string>): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

function isShortString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isOptionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || isShortString(value, maxLength);
}

function isStringArray(value: unknown, maxItems: number, maxLength: number): boolean {
  return Array.isArray(value) && value.length <= maxItems && value.every((entry) => isShortString(entry, maxLength));
}

function isAnswer(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["qid", "question", "answer", "values"]))) return false;
  const valuesValid =
    value.values === undefined ||
    isShortString(value.values, 20_000) ||
    isStringArray(value.values, 100, 2_000);
  return isShortString(value.qid, 128) && isShortString(value.question, 500) &&
    isShortString(value.answer, 20_000) && valuesValid;
}

function isQuestion(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["id", "label", "description", "type", "options", "required", "placeholder"]))) return false;
  return isShortString(value.id, 128) && isShortString(value.label, 500) &&
    isOptionalString(value.description, 1_000) &&
    ["text", "textarea", "single", "multi"].includes(String(value.type)) &&
    (value.options === undefined || isStringArray(value.options, 50, 500)) &&
    typeof value.required === "boolean" && isOptionalString(value.placeholder, 500);
}

function isDesignSystem(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["id", "name", "designMd", "tokensCss", "source", "refUrl"]))) return false;
  return isShortString(value.id, 200) && isShortString(value.name, 500) &&
    isShortString(value.designMd, 150_000) && isShortString(value.tokensCss, 100_000) &&
    ["template", "upload", "link"].includes(String(value.source)) &&
    isOptionalString(value.refUrl, 4_000);
}

function isPlannedPage(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["slug", "title", "brief", "sections", "primaryAction"]))) return false;
  return isShortString(value.slug, 200) && isShortString(value.title, 500) &&
    isShortString(value.brief, 20_000) &&
    (value.sections === undefined || isStringArray(value.sections, 100, 2_000)) &&
    isOptionalString(value.primaryAction, 2_000);
}

function isPlanningRun(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["id", "startedAt", "finishedAt", "units"]))) return false;
  if (!isShortString(value.id, 200) || !isShortString(value.startedAt, 100) ||
      !isOptionalString(value.finishedAt, 100) || !isRecord(value.units) ||
      Object.keys(value.units).length > 100) return false;
  const statuses = new Set(["queued", "generating", "checking", "retrying", "failed", "done", "local"]);
  return Object.values(value.units).every((unit) =>
    isRecord(unit) &&
    hasOnlyKeys(unit, new Set(["status", "percent", "startedAt", "settledAt"])) &&
    typeof unit.status === "string" && statuses.has(unit.status) &&
    typeof unit.percent === "number" && Number.isFinite(unit.percent) && unit.percent >= 0 && unit.percent <= 100 &&
    isOptionalString(unit.startedAt, 100) && isOptionalString(unit.settledAt, 100),
  );
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value) || !hasOnlyKeys(value, PROJECT_KEYS)) return false;
  return (
    isUuid(value.id) &&
    isShortString(value.name, 160) &&
    isShortString(value.idea, 20_000) &&
    isShortString(value.createdAt, 100) &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    isOptionalString(value.brandName, 160) &&
    (value.lastOpenedAt === undefined || (isShortString(value.lastOpenedAt, 100) && Number.isFinite(Date.parse(value.lastOpenedAt)))) &&
    (value.status === undefined || value.status === "draft" || value.status === "ready") &&
    (value.wizardStep === undefined || (Number.isInteger(value.wizardStep) && Number(value.wizardStep) >= 0 && Number(value.wizardStep) <= 20)) &&
    (value.platform === undefined || ["web", "mobile", "desktop"].includes(String(value.platform))) &&
    (value.timeline === undefined || ["weekend", "week", "two-weeks", "month"].includes(String(value.timeline))) &&
    isOptionalString(value.framework, 200) &&
    isOptionalString(value.model, 200) &&
    (value.answers === undefined || (Array.isArray(value.answers) && value.answers.length <= 100 && value.answers.every(isAnswer))) &&
    (value.questions === undefined || (Array.isArray(value.questions) && value.questions.length <= 100 && value.questions.every(isQuestion))) &&
    (value.questionSource === undefined || value.questionSource === "ai" || value.questionSource === "local") &&
    isOptionalString(value.logoUrl, 2_500_000) &&
    (value.logoOrigin === undefined || value.logoOrigin === "ai" || value.logoOrigin === "upload") &&
    (value.logoRemoveBg === undefined || typeof value.logoRemoveBg === "boolean") &&
    (value.logoFormat === undefined || value.logoFormat === "png" || value.logoFormat === "svg") &&
    (value.logoHistory === undefined || isStringArray(value.logoHistory, 20, 2_500_000)) &&
    isOptionalString(value.logoBrief, 20_000) &&
    (value.designSystem === undefined || isDesignSystem(value.designSystem)) &&
    (value.pagePlan === undefined || (Array.isArray(value.pagePlan) && value.pagePlan.length <= 100 && value.pagePlan.every(isPlannedPage))) &&
    (value.pagePlanSource === undefined || value.pagePlanSource === "ai" || value.pagePlanSource === "local") &&
    (value.planningPrep === undefined || value.planningPrep === "in-progress" || value.planningPrep === "complete") &&
    (value.planningRun === undefined || isPlanningRun(value.planningRun))
  );
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, new Set(["id", "title", "status", "linkedScreenId", "notes"])) &&
    isShortString(value.id, 128) &&
    isShortString(value.title, 500) &&
    typeof value.status === "string" &&
    TASK_STATUSES.has(value.status as Task["status"]) &&
    (value.linkedScreenId === undefined || isShortString(value.linkedScreenId, 128)) &&
    (value.notes === undefined || isShortString(value.notes, 20_000))
  );
}

function isScreen(value: unknown): value is Screen {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, new Set(["id", "name", "canvasJson", "components"])) &&
    isShortString(value.id, 128) &&
    isShortString(value.name, 500) &&
    isShortString(value.canvasJson, 1_000_000) &&
    Array.isArray(value.components) &&
    value.components.length <= 200 &&
    value.components.every((entry) => isShortString(entry, 200))
  );
}

function isFile(value: unknown): value is CodeFile {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, new Set(["id", "path", "content", "language", "source", "updatedAt"])) &&
    isShortString(value.id, 128) &&
    isShortString(value.path, 500) &&
    isShortString(value.content, 1_000_000) &&
    isShortString(value.language, 100) &&
    (value.source === undefined || value.source === "ai" || value.source === "local") &&
    (value.updatedAt === undefined || isShortString(value.updatedAt, 100))
  );
}

function isDoc(value: unknown): value is ProjectDoc {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, new Set(["id", "kind", "title", "markdown", "updatedAt", "source"])) &&
    isShortString(value.id, 128) &&
    isShortString(value.kind, 100) &&
    isShortString(value.title, 500) &&
    isShortString(value.markdown, 1_000_000) &&
    isShortString(value.updatedAt, 100) &&
    DOC_SOURCES.has(value.source as ProjectDoc["source"])
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isWorkspaceSnapshot(value: unknown): value is CloudWorkspaceSnapshot {
  if (!isRecord(value) || !hasOnlyKeys(value, new Set(["version", "project", "prd", "tasks", "screens", "files", "docs"])) || value.version !== 1) return false;
  return (
    isProject(value.project) &&
    typeof value.prd === "string" &&
    value.prd.length <= 1_000_000 &&
    Array.isArray(value.tasks) &&
    value.tasks.length <= 2_000 &&
    value.tasks.every(isTask) &&
    Array.isArray(value.screens) &&
    value.screens.length <= 250 &&
    value.screens.every(isScreen) &&
    Array.isArray(value.files) &&
    value.files.length <= 500 &&
    value.files.every(isFile) &&
    Array.isArray(value.docs) &&
    value.docs.length <= 200 &&
    value.docs.every(isDoc)
  );
}

export function isCloudWorkspaceRecord(value: unknown): value is CloudWorkspaceRecord {
  return (
    isRecord(value) &&
    isWorkspaceSnapshot(value.snapshot) &&
    isShortString(value.revision, 100) &&
    Number.isFinite(Date.parse(value.revision))
  );
}

export function workspaceSnapshotFitsLimit(value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    return (
      typeof serialized === "string" &&
      new TextEncoder().encode(serialized).byteLength <= MAX_WORKSPACE_BYTES
    );
  } catch {
    return false;
  }
}
