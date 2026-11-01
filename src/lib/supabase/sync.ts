import { useSyncExternalStore } from "react";
import type { CloudWorkspaceSnapshot, Project } from "../types";
import { useVibe } from "../store";
import { isSupabaseAuthConfigured, supabaseBrowser } from "./client";

type CloudSyncStatus = "local" | "syncing" | "synced" | "error";
type ProjectRow = {
  id: string;
  name: string;
  idea: string;
  created_at: string | null;
  workspace_state: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusListeners = new Set<() => void>();
let currentStatus: CloudSyncStatus = "local";

function setStatus(next: CloudSyncStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  statusListeners.forEach((listener) => listener());
}

function subscribeStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function useCloudSyncStatus() {
  return useSyncExternalStore(subscribeStatus, () => currentStatus, () => "local");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProject(value: unknown): value is Project {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.idea === "string" &&
    typeof value.createdAt === "string"
  );
}

function stringArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function snapshotFromRow(row: ProjectRow): CloudWorkspaceSnapshot {
  const payload = isRecord(row.workspace_state) ? row.workspace_state : {};
  const rawProject = payload.project;
  const project: Project = isProject(rawProject)
    ? {
        ...rawProject,
        id: row.id,
        name: row.name,
        idea: row.idea,
        createdAt: row.created_at ?? rawProject.createdAt,
      }
    : {
        id: row.id,
        name: row.name,
        idea: row.idea,
        createdAt: row.created_at ?? new Date().toISOString(),
      };

  return {
    version: 1,
    project,
    prd: typeof payload.prd === "string" ? payload.prd : "",
    tasks: stringArray(payload.tasks),
    screens: stringArray(payload.screens),
    files: stringArray(payload.files),
    docs: stringArray(payload.docs),
  };
}

function snapshotForProject(projectId: string): CloudWorkspaceSnapshot | null {
  const state = useVibe.getState();
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;
  return {
    version: 1,
    project,
    prd: state.prdByProject[projectId] ?? "",
    tasks: state.tasksByProject[projectId] ?? [],
    screens: state.screensByProject[projectId] ?? [],
    files: state.filesByProject[projectId] ?? [],
    docs: state.docsByProject[projectId] ?? [],
  };
}

/** Starts auth-aware cloud sync after local Zustand storage has hydrated. */
export function startCloudSync() {
  if (!isSupabaseAuthConfigured()) {
    setStatus("local");
    return () => undefined;
  }

  const client = supabaseBrowser();
  let disposed = false;
  let activeUserId: string | null = null;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let storeUnsubscribe: (() => void) | undefined;
  let busy = false;
  let pendingSync = false;
  const lastSaved = new Map<string, string>();

  const pushAll = async (userId: string, token: number): Promise<void> => {
    if (busy) {
      pendingSync = true;
      return;
    }
    busy = true;
    let failed = false;
    setStatus("syncing");

    try {
      const projects = [...useVibe.getState().projects];
      for (const project of projects) {
        if (disposed || token !== generation || activeUserId !== userId) break;
        if (!UUID_PATTERN.test(project.id)) continue;

        const state = useVibe.getState();
        const owner = state.cloudOwnerByProject[project.id];
        if (owner && owner !== userId) continue;

        const snapshot = snapshotForProject(project.id);
        if (!snapshot) continue;
        const serialized = JSON.stringify(snapshot);
        if (lastSaved.get(project.id) === serialized) continue;

        const { error } = await client.from("projects").upsert(
          {
            id: project.id,
            owner_id: userId,
            name: project.name,
            idea: project.idea,
            created_at: project.createdAt,
            workspace_state: snapshot,
          },
          { onConflict: "id" },
        );
        if (error) {
          failed = true;
          break;
        }
        lastSaved.set(project.id, serialized);
        if (!owner) useVibe.getState().setCloudOwner(project.id, userId);
      }
    } catch {
      failed = true;
    } finally {
      busy = false;
      if (!disposed && token === generation && activeUserId === userId) {
        setStatus(failed ? "error" : "synced");
      }
      if (pendingSync && !disposed && activeUserId) {
        pendingSync = false;
        void pushAll(activeUserId, generation);
      }
    }
  };

  const schedulePush = (userId: string, token: number) => {
    if (timer) clearTimeout(timer);
    setStatus("syncing");
    timer = setTimeout(() => {
      timer = undefined;
      void pushAll(userId, token);
    }, 650);
  };

  const activateUser = async (nextUserId: string | null) => {
    if (disposed || nextUserId === activeUserId) return;
    activeUserId = nextUserId;
    const token = ++generation;
    pendingSync = false;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    storeUnsubscribe?.();
    storeUnsubscribe = undefined;
    lastSaved.clear();

    if (!nextUserId) {
      setStatus("local");
      return;
    }

    setStatus("syncing");
    try {
      const { data, error } = await client
        .from("projects")
        .select("id,name,idea,created_at,workspace_state")
        .eq("owner_id", nextUserId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (disposed || token !== generation || activeUserId !== nextUserId) return;
      if (error) {
        setStatus("error");
        return;
      }

      const rows = (data ?? []) as ProjectRow[];
      const snapshots = rows.map(snapshotFromRow);
      for (const snapshot of snapshots) {
        lastSaved.set(snapshot.project.id, JSON.stringify(snapshot));
      }
      useVibe.getState().mergeCloudWorkspaces(snapshots, nextUserId);

      storeUnsubscribe = useVibe.subscribe(() => {
        if (activeUserId === nextUserId && token === generation && !disposed) {
          schedulePush(nextUserId, token);
        }
      });
      await pushAll(nextUserId, token);
      if (disposed || token !== generation || activeUserId !== nextUserId) return;
    } catch {
      if (!disposed && token === generation) setStatus("error");
    }
  };

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    void activateUser(session?.user.id ?? null);
  });

  void client.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        setStatus("error");
        return;
      }
      void activateUser(data.session?.user.id ?? null);
    })
    .catch(() => setStatus("error"));

  return () => {
    disposed = true;
    generation += 1;
    if (timer) clearTimeout(timer);
    storeUnsubscribe?.();
    subscription.unsubscribe();
  };
}
