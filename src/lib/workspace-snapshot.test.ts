import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isUuid,
  isWorkspaceSnapshot,
  MAX_WORKSPACE_BYTES,
  workspaceSnapshotFitsLimit,
} from "./workspace-snapshot";

const validSnapshot = {
  version: 1,
  project: {
    id: "c1b0c010-3fdc-4a28-9f8a-cc5cf9c70d65",
    name: "MuseVibe",
    idea: "A safe workspace",
    createdAt: "2026-11-01T00:00:00.000Z",
  },
  prd: "# Brief",
  tasks: [{ id: "task-1", title: "Draft the brief", status: "todo" }],
  screens: [],
  files: [],
  docs: [{ id: "doc-1", kind: "prd", title: "PRD", markdown: "# Plan", updatedAt: "2026-11-01T00:00:00.000Z" }],
};

test("accepts a well-formed versioned workspace snapshot", () => {
  assert.equal(isWorkspaceSnapshot(validSnapshot), true);
});

test("rejects malformed project IDs, versions, and task statuses", () => {
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(
    isWorkspaceSnapshot({ ...validSnapshot, version: 2 }),
    false,
  );
  assert.equal(
    isWorkspaceSnapshot({
      ...validSnapshot,
      tasks: [{ id: "task-1", title: "Bad status", status: "owner" }],
    }),
    false,
  );
});

test("rejects unknown Project fields and malformed optional metadata", () => {
  assert.equal(
    isWorkspaceSnapshot({
      ...validSnapshot,
      project: { ...validSnapshot.project, ownerId: "forged" },
    }),
    false,
  );
  assert.equal(
    isWorkspaceSnapshot({
      ...validSnapshot,
      project: { ...validSnapshot.project, status: "admin" },
    }),
    false,
  );
  assert.equal(
    isWorkspaceSnapshot({
      ...validSnapshot,
      project: { ...validSnapshot.project, questions: "not-an-array" },
    }),
    false,
  );
});

test("rejects snapshots over the server request size budget", () => {
  const oversized = { ...validSnapshot, prd: "x".repeat(MAX_WORKSPACE_BYTES) };
  assert.equal(workspaceSnapshotFitsLimit(validSnapshot), true);
  assert.equal(workspaceSnapshotFitsLimit(oversized), false);
});
