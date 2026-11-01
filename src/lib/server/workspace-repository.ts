import { neon } from "@neondatabase/serverless";
import type { CloudWorkspaceRecord, CloudWorkspaceSnapshot } from "../types";
import { isWorkspaceSnapshot, MAX_WORKSPACES_PER_ACCOUNT } from "../workspace-snapshot";
import type { WorkspaceRepository, WorkspaceUpdateResult } from "./workspace-api";

type WorkspaceRow = {
  id: string;
  name: string;
  idea: string;
  created_at: string;
  updated_at: string;
  workspace_state: unknown;
};

const schemaReadyByDatabase = new Map<string, Promise<void>>();

function recordFromRow(row: WorkspaceRow): CloudWorkspaceRecord | null {
  if (
    !isWorkspaceSnapshot(row.workspace_state) ||
    !Number.isFinite(Date.parse(row.updated_at))
  ) {
    return null;
  }
  return {
    snapshot: {
      ...row.workspace_state,
      project: {
        ...row.workspace_state.project,
        id: row.id,
        name: row.name,
        idea: row.idea,
        createdAt: row.created_at,
      },
    },
    revision: row.updated_at,
  };
}

export function createNeonWorkspaceRepository(
  connectionString: string,
): WorkspaceRepository {
  const sql = neon(connectionString);
  let schemaPromise = schemaReadyByDatabase.get(connectionString);
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS public.musevibe_projects (
          id uuid PRIMARY KEY,
          owner_id uuid NOT NULL,
          name text NOT NULL,
          idea text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          workspace_state jsonb NOT NULL DEFAULT '{}'::jsonb,
          CONSTRAINT musevibe_projects_state_is_object
            CHECK (jsonb_typeof(workspace_state) = 'object')
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS musevibe_projects_owner_updated_idx
          ON public.musevibe_projects (owner_id, updated_at DESC, created_at DESC)
      `;
    })().catch((error: unknown) => {
      schemaReadyByDatabase.delete(connectionString);
      throw error;
    });
    schemaReadyByDatabase.set(connectionString, schemaPromise);
  }
  const ensureSchema = async () => {
    await schemaPromise;
  };

  return {
    async listOwned(ownerId, limit) {
      await ensureSchema();
      const rows = (await sql`
        SELECT
          id::text AS id,
          name,
          idea,
          created_at::text AS created_at,
          updated_at::text AS updated_at,
          workspace_state
        FROM public.musevibe_projects
        WHERE owner_id = ${ownerId}::uuid
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ${Math.min(limit, MAX_WORKSPACES_PER_ACCOUNT)}
      `) as WorkspaceRow[];
      return rows.map(recordFromRow);
    },

    async updateOwned(ownerId, projectId, expectedRevision, snapshot) {
      await ensureSchema();
      const rows = await sql`
        UPDATE public.musevibe_projects
        SET
          name = ${snapshot.project.name},
          idea = ${snapshot.project.idea},
          workspace_state = ${JSON.stringify(snapshot)}::jsonb,
          updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
        WHERE id = ${projectId}::uuid
          AND owner_id = ${ownerId}::uuid
          AND updated_at = ${expectedRevision}::timestamptz
        RETURNING updated_at::text AS revision
      `;
      if (rows.length > 0) {
        const revision = rows[0].revision;
        if (typeof revision !== "string") throw new Error("Neon returned an invalid revision.");
        return { kind: "saved", revision } satisfies WorkspaceUpdateResult;
      }

      const existing = await sql`
        SELECT id::text AS id
        FROM public.musevibe_projects
        WHERE id = ${projectId}::uuid
          AND owner_id = ${ownerId}::uuid
        LIMIT 1
      `;
      return existing.length > 0
        ? { kind: "conflict" }
        : { kind: "missing" };
    },

    async countOwned(ownerId) {
      await ensureSchema();
      const rows = await sql`
        SELECT count(*)::int AS total
        FROM public.musevibe_projects
        WHERE owner_id = ${ownerId}::uuid
      `;
      return Number(rows[0]?.total ?? 0);
    },

    async createOwned(ownerId, snapshot: CloudWorkspaceSnapshot) {
      await ensureSchema();
      const rows = await sql`
        WITH account_lock AS MATERIALIZED (
          SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))
        ),
        created AS (
          INSERT INTO public.musevibe_projects (
            id,
            owner_id,
            name,
            idea,
            created_at,
            updated_at,
            workspace_state
          )
          SELECT
            ${snapshot.project.id}::uuid,
            ${ownerId}::uuid,
            ${snapshot.project.name},
            ${snapshot.project.idea},
            ${snapshot.project.createdAt}::timestamptz,
            now(),
            ${JSON.stringify(snapshot)}::jsonb
          FROM account_lock
          WHERE (
            SELECT count(*)
            FROM public.musevibe_projects
            WHERE owner_id = ${ownerId}::uuid
          ) < ${MAX_WORKSPACES_PER_ACCOUNT}
          RETURNING updated_at::text AS revision
        )
        SELECT revision FROM created
      `;
      if (rows.length === 0) return null;
      const revision = rows[0]?.revision;
      if (typeof revision !== "string") throw new Error("Neon did not return a workspace revision.");
      return revision;
    },
  };
}
