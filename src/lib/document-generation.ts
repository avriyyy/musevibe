import type { Project } from "./types";
import {
  buildDocPrompt,
  buildDocRepairPrompt,
  inspectDocMarkdownAsync,
  mergeDocRepairMarkdown,
  parseDocMarkdown,
  type DocKind,
} from "./docs";

export interface DocumentAiReply {
  text: string;
  source: "ai" | "local";
  reason?: string;
  status?: number;
}

export type DocumentGenerationPhase = "generating" | "checking" | "retrying";

export type DocumentGenerationResult =
  | { ok: true; markdown: string }
  | {
      ok: false;
      reason: "provider";
      reply?: DocumentAiReply;
      stage: "draft" | "repair";
      detail?: string;
    }
  | { ok: false; reason: "invalid"; missing: string[] }
  | { ok: false; reason: "cancelled" };

export interface GenerateValidatedDocumentOptions {
  kind: DocKind;
  project: Project;
  brief: string;
  signal?: AbortSignal;
  request: (
    kind: "prd" | "doc",
    prompt: string,
    signal?: AbortSignal,
  ) => Promise<DocumentAiReply>;
  onPhase?: (phase: DocumentGenerationPhase) => void;
}

/**
 * Generate one document, validate it, and make at most one targeted AI repair.
 * No model failure or invalid answer is converted into document content.
 */
export async function generateValidatedDocument({
  kind,
  project,
  brief,
  signal,
  request,
  onPhase,
}: GenerateValidatedDocumentOptions): Promise<DocumentGenerationResult> {
  const cancelled = (): boolean => Boolean(signal?.aborted);
  if (cancelled()) return { ok: false, reason: "cancelled" };

  let firstReply: DocumentAiReply;
  try {
    onPhase?.("generating");
    firstReply = await request(
      kind === "prd" ? "prd" : "doc",
      buildDocPrompt(kind, project, brief),
      signal,
    );
  } catch (error) {
    if (cancelled()) return { ok: false, reason: "cancelled" };
    return {
      ok: false,
      reason: "provider",
      stage: "draft",
      detail: error instanceof Error ? error.message : undefined,
    };
  }
  if (cancelled()) return { ok: false, reason: "cancelled" };
  if (firstReply.source !== "ai") {
    return { ok: false, reason: "provider", reply: firstReply, stage: "draft" };
  }

  let firstMarkdown = "";
  let firstMissing: string[] = [];
  try {
    onPhase?.("checking");
    firstMarkdown = mergeDocRepairMarkdown(
      kind,
      project,
      parseDocMarkdown(firstReply.text),
      "",
    );
    const check = await inspectDocMarkdownAsync(kind, firstMarkdown);
    if (cancelled()) return { ok: false, reason: "cancelled" };
    if (check.ok) return { ok: true, markdown: firstMarkdown };
    firstMissing = check.missing;
  } catch (error) {
    if (cancelled()) return { ok: false, reason: "cancelled" };
    firstMissing = [
      `The document quality checks could not complete${error instanceof Error ? `: ${error.message}` : "."}`,
    ];
  }

  let repairReply: DocumentAiReply;
  try {
    onPhase?.("retrying");
    repairReply = await request(
      kind === "prd" ? "prd" : "doc",
      buildDocRepairPrompt(kind, project, brief, firstMarkdown, firstMissing),
      signal,
    );
  } catch (error) {
    if (cancelled()) return { ok: false, reason: "cancelled" };
    return {
      ok: false,
      reason: "provider",
      stage: "repair",
      detail: error instanceof Error ? error.message : undefined,
    };
  }
  if (cancelled()) return { ok: false, reason: "cancelled" };
  if (repairReply.source !== "ai") {
    return { ok: false, reason: "provider", reply: repairReply, stage: "repair" };
  }

  try {
    onPhase?.("checking");
    const repaired = mergeDocRepairMarkdown(
      kind,
      project,
      firstMarkdown,
      parseDocMarkdown(repairReply.text),
    );
    const check = await inspectDocMarkdownAsync(kind, repaired);
    if (cancelled()) return { ok: false, reason: "cancelled" };
    return check.ok
      ? { ok: true, markdown: repaired }
      : { ok: false, reason: "invalid", missing: check.missing };
  } catch (error) {
    if (cancelled()) return { ok: false, reason: "cancelled" };
    return {
      ok: false,
      reason: "invalid",
      missing: [
        `The repaired document could not pass quality checks${error instanceof Error ? `: ${error.message}` : "."}`,
      ],
    };
  }
}
