import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CloudWorkspaceSnapshot } from "../types";
import { useVibe } from "../store";
import { isCloudWorkspaceRecord } from "../workspace-snapshot";
import { isSupabaseAuthConfigured, supabaseBrowser } from "./client";

type CloudSyncStatus = "local" | "syncing" | "synced" | "error";
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStatus(error: unknown, status: number): boolean {
  return isObject(error) && error.status === status;
}

/** Sync only workspaces explicitly created for a verified account; legacy browser data is never imported automatically. */
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
  const inFlight = new Set<AbortController>();

  const conflictExists = (userId: string) => {
    const state = useVibe.getState();
    return state.projects.some(
      (project) =>
        state.cloudOwnerByProject[project.id] === userId &&
        state.cloudConflictByProject[project.id] === true,
    );
  };

  const dirtyOwnedWorkspaceExists = (userId: string) => {
    const state = useVibe.getState();
    for (const project of state.projects) {
      if (
        state.cloudOwnerByProject[project.id] !== userId ||
        state.cloudConflictByProject[project.id] ||
        !state.cloudRevisionByProject[project.id]
      ) {
        continue;
      }
      const snapshot = snapshotForProject(project.id);
      if (snapshot && lastSaved.get(project.id) !== JSON.stringify(snapshot)) return true;
    }
    return false;
  };

  const requestApi = async (
    userId: string,
    token: number,
    method: "GET" | "POST",
    snapshot?: CloudWorkspaceSnapshot,
    expectedRevision?: string,
  ): Promise<unknown> => {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session || data.session.user.id !== userId) {
      throw new Error("The signed-in account changed before the workspace request.");
    }
    if (disposed || token !== generation || activeUserId !== userId) {
      throw new Error("The account session changed.");
    }

    const controller = new AbortController();
    inFlight.add(controller);
    try {
      const response = await fetch("/api/workspaces", {
        method,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          ...(snapshot ? { "Content-Type": "application/json" } : {}),
        },
        ...(snapshot
          ? { body: JSON.stringify({ snapshot, expectedRevision }) }
          : {}),
      });
      if (!response.ok) {
        const requestError = new Error("Workspace storage request failed.") as Error & {
          status: number;
        };
        requestError.status = response.status;
        throw requestError;
      }
      return await response.json();
    } finally {
      inFlight.delete(controller);
    }
  };

  const pushAll = async (userId: string, token: number): Promise<void> => {
    if (busy) {
      pendingSync = true;
      return;
    }
    if (!dirtyOwnedWorkspaceExists(userId)) {
      setStatus(conflictExists(userId) ? "error" : "synced");
      return;
    }

    busy = true;
    let failed = false;
    setStatus("syncing");
    try {
      const state = useVibe.getState();
      const projectIds = state.projects
        .filter(
          (project) =>
            state.cloudOwnerByProject[project.id] === userId &&
            !state.cloudConflictByProject[project.id] &&
            Boolean(state.cloudRevisionByProject[project.id]),
        )
        .map((project) => project.id);

      for (const projectId of projectIds) {
        if (disposed || token !== generation || activeUserId !== userId) break;
        const snapshot = snapshotForProject(projectId);
        const expectedRevision = useVibe.getState().cloudRevisionByProject[projectId];
        if (!snapshot || !expectedRevision) continue;
        const serialized = JSON.stringify(snapshot);
        if (lastSaved.get(projectId) === serialized) continue;

        try {
          const payload = await requestApi(
            userId,
            token,
            "POST",
            snapshot,
            expectedRevision,
          );
          if (!isObject(payload) || typeof payload.revision !== "string" || !Number.isFinite(Date.parse(payload.revision))) {
            throw new Error("Workspace save response is invalid.");
          }
          if (disposed || token !== generation || activeUserId !== userId) break;
          lastSaved.set(projectId, serialized);
          useVibe.getState().setCloudRevision(projectId, payload.revision);
          useVibe.getState().setCloudConflict(projectId, false);
        } catch (error) {
          if (hasStatus(error, 404) || hasStatus(error, 409)) {
            useVibe.getState().setCloudConflict(projectId, true);
          }
          throw error;
        }
      }
    } catch {
      failed = true;
    } finally {
      busy = false;
      if (!disposed && token === generation && activeUserId === userId) {
        setStatus(failed || conflictExists(userId) ? "error" : "synced");
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

  const loadUser = async (userId: string, token: number) => {
    try {
      const payload = await requestApi(userId, token, "GET");
      if (disposed || token !== generation || activeUserId !== userId) return;
      if (
        !isObject(payload) ||
        !Array.isArray(payload.workspaces) ||
        !payload.workspaces.every(isCloudWorkspaceRecord)
      ) {
        throw new Error("Workspace response is invalid or contains damaged data.");
      }

      const records = payload.workspaces;
      for (const record of records) {
        lastSaved.set(record.snapshot.project.id, JSON.stringify(record.snapshot));
      }
      useVibe.getState().mergeCloudWorkspaces(records, userId);
      if (disposed || token !== generation || activeUserId !== userId) return;
      setStatus(conflictExists(userId) ? "error" : "synced");
      if (dirtyOwnedWorkspaceExists(userId)) schedulePush(userId, token);
    } catch {
      if (!disposed && token === generation && activeUserId === userId) {
        setStatus("error");
      }
    }
  };

  const transitionTo = (nextUserId: string | null) => {
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
    for (const controller of inFlight) controller.abort();
    inFlight.clear();
    lastSaved.clear();

    // Keep owner-tagged cache entries in localStorage for recovery. The UI only
    // exposes them when the authenticated user ID matches the saved owner ID.
    if (!nextUserId) {
      setStatus("local");
      return;
    }

    setStatus("syncing");
    storeUnsubscribe = useVibe.subscribe(() => {
      if (disposed || token !== generation || activeUserId !== nextUserId) return;
      if (dirtyOwnedWorkspaceExists(nextUserId)) schedulePush(nextUserId, token);
    });
    queueMicrotask(() => void loadUser(nextUserId, token));
  };

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session: Session | null) => {
    transitionTo(session?.user.id ?? null);
  });

  void client.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        if (!disposed) setStatus("error");
        return;
      }
      transitionTo(data.session?.user.id ?? null);
    })
    .catch(() => {
      if (!disposed) setStatus("error");
    });

  return () => {
    disposed = true;
    generation += 1;
    if (timer) clearTimeout(timer);
    storeUnsubscribe?.();
    for (const controller of inFlight) controller.abort();
    inFlight.clear();
    subscription.unsubscribe();
  };
}
