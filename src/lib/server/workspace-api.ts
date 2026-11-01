import { randomUUID } from "node:crypto";
import type { CloudWorkspaceSnapshot } from "../types";
import {
  isCloudWorkspaceRecord,
  isWorkspaceSnapshot,
  MAX_WORKSPACES_PER_ACCOUNT,
  MAX_WORKSPACE_BYTES,
  workspaceSnapshotFitsLimit,
} from "../workspace-snapshot";
import { workspaceJson } from "./workspace-auth";

export type WorkspaceApiUser = { id: string };
export type WorkspaceAuthenticator = (
  request: Request,
) => Promise<{ user: WorkspaceApiUser } | { response: Response }>;

export type WorkspaceUpdateResult =
  | { kind: "saved"; revision: string }
  | { kind: "conflict" }
  | { kind: "missing" };

export interface WorkspaceRepository {
  listOwned(ownerId: string, limit: number): Promise<unknown[]>;
  updateOwned(
    ownerId: string,
    projectId: string,
    expectedRevision: string,
    snapshot: CloudWorkspaceSnapshot,
  ): Promise<WorkspaceUpdateResult>;
  countOwned(ownerId: string): Promise<number>;
  createOwned(ownerId: string, snapshot: CloudWorkspaceSnapshot): Promise<string | null>;
}

type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean };

async function readLimitedJson(request: Request, maxBytes: number): Promise<JsonReadResult> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, tooLarge: true };
  }
  if (!request.body) return { ok: false, tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, tooLarge: false };
  } finally {
    reader.releaseLock();
  }
}

export function createWorkspaceApi(options: {
  authenticate: WorkspaceAuthenticator;
  repository: () => WorkspaceRepository | null;
  newId?: () => string;
  now?: () => string;
}) {
  const newId = options.newId ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  type AuthorizedContext =
    | { response: Response }
    | { user: WorkspaceApiUser; repository: WorkspaceRepository };

  async function authorizeAndGetRepository(request: Request): Promise<AuthorizedContext> {
    const auth = await options.authenticate(request);
    if ("response" in auth) return { response: auth.response } as const;
    const repository = options.repository();
    if (!repository) {
      return {
        response: workspaceJson({ error: "Workspace storage is not configured." }, 503),
      } as const;
    }
    return { user: auth.user, repository } as const;
  }

  return {
    GET: async (request: Request): Promise<Response> => {
      const context = await authorizeAndGetRepository(request);
      if ("response" in context) return context.response;
      try {
        const records = await context.repository.listOwned(
          context.user.id,
          MAX_WORKSPACES_PER_ACCOUNT,
        );
        if (!Array.isArray(records) || !records.every(isCloudWorkspaceRecord)) {
          return workspaceJson({ error: "Stored workspace data needs repair." }, 500);
        }
        return workspaceJson({ workspaces: records });
      } catch {
        return workspaceJson({ error: "Workspace storage is unavailable." }, 503);
      }
    },

    POST: async (request: Request): Promise<Response> => {
      const context = await authorizeAndGetRepository(request);
      if ("response" in context) return context.response;

      const parsed = await readLimitedJson(request, MAX_WORKSPACE_BYTES);
      if (!parsed.ok && parsed.tooLarge) {
        return workspaceJson({ error: "Workspace is too large to save." }, 413);
      }
      if (!parsed.ok) {
        return workspaceJson({ error: "A valid JSON workspace is required." }, 400);
      }
      const body = parsed.value;

      if (
        typeof body !== "object" ||
        body === null ||
        !("snapshot" in body) ||
        !("expectedRevision" in body) ||
        !isWorkspaceSnapshot(body.snapshot) ||
        typeof body.expectedRevision !== "string" ||
        body.expectedRevision.length > 100 ||
        !Number.isFinite(Date.parse(body.expectedRevision)) ||
        !workspaceSnapshotFitsLimit(body.snapshot)
      ) {
        return workspaceJson({ error: "Workspace data is invalid or too large." }, 400);
      }

      try {
        const result = await context.repository.updateOwned(
          context.user.id,
          body.snapshot.project.id,
          body.expectedRevision,
          body.snapshot,
        );
        if (result.kind === "conflict") {
          return workspaceJson({ error: "Workspace changed in another session." }, 409);
        }
        if (result.kind === "missing") {
          return workspaceJson({ error: "Workspace not found." }, 404);
        }
        return workspaceJson({ saved: true, revision: result.revision });
      } catch {
        return workspaceJson({ error: "Workspace storage is unavailable." }, 503);
      }
    },

    create: async (request: Request): Promise<Response> => {
      const context = await authorizeAndGetRepository(request);
      if ("response" in context) return context.response;

      const maxCreateBodyBytes = 24 * 1024;
      const parsed = await readLimitedJson(request, maxCreateBodyBytes);
      if (!parsed.ok && parsed.tooLarge) {
        return workspaceJson({ error: "Project details are too large." }, 413);
      }
      if (!parsed.ok) {
        return workspaceJson({ error: "Valid project details are required." }, 400);
      }
      const body = parsed.value;

      const candidate =
        typeof body === "object" && body !== null && "project" in body &&
        typeof body.project === "object" && body.project !== null && !Array.isArray(body.project)
          ? body.project as Record<string, unknown>
          : null;
      if (
        !candidate ||
        typeof candidate.name !== "string" ||
        candidate.name.length > 160 ||
        !candidate.name.trim() ||
        typeof candidate.idea !== "string" ||
        candidate.idea.length > 20_000 ||
        !candidate.idea.trim() ||
        (candidate.model !== undefined &&
          (typeof candidate.model !== "string" || candidate.model.length > 100))
      ) {
        return workspaceJson({ error: "Project details are invalid." }, 400);
      }

      try {
        if (await context.repository.countOwned(context.user.id) >= MAX_WORKSPACES_PER_ACCOUNT) {
          return workspaceJson({ error: "This account has reached its workspace limit." }, 409);
        }

        const project = {
          id: newId(),
          name: candidate.name.trim(),
          idea: candidate.idea.trim(),
          createdAt: now(),
          status: "draft" as const,
          wizardStep: 0,
          ...(typeof candidate.model === "string" ? { model: candidate.model } : {}),
        };
        const snapshot: CloudWorkspaceSnapshot = {
          version: 1,
          project,
          prd: "",
          tasks: [],
          screens: [],
          files: [],
          docs: [],
        };
        const revision = await context.repository.createOwned(context.user.id, snapshot);
        if (!revision) {
          return workspaceJson({ error: "This account has reached its workspace limit." }, 409);
        }
        return workspaceJson({ snapshot, revision }, 201);
      } catch {
        return workspaceJson({ error: "Workspace storage is unavailable." }, 503);
      }
    },
  };
}
