import { test } from "node:test";
import assert from "node:assert/strict";
import { decideWorkspaceMerge } from "./workspace-merge";

const base = {
  existingOwnerId: "user-a",
  accountId: "user-a",
  localRevision: "2026-11-01 04:00:00+00",
  remoteRevision: "2026-11-01 04:00:00+00",
  localSnapshotJson: "local-edit",
  remoteSnapshotJson: "server-base",
};

test("keeps a locally edited copy pending when Neon is still at the same revision", () => {
  assert.equal(decideWorkspaceMerge(base), "keep-pending");
});

test("keeps local and remote versions in conflict when the server revision changed", () => {
  assert.equal(
    decideWorkspaceMerge({ ...base, remoteRevision: "2026-11-01 04:01:00+00" }),
    "keep-conflict",
  );
});

test("uses the remote snapshot when the content already matches", () => {
  assert.equal(
    decideWorkspaceMerge({ ...base, localSnapshotJson: "server-base" }),
    "replace",
  );
});

test("never treats another owner's cached data as this account's pending edit", () => {
  assert.equal(
    decideWorkspaceMerge({ ...base, existingOwnerId: "user-b" }),
    "replace",
  );
});

test("treats unversioned legacy cache as a conflict rather than overwriting it", () => {
  assert.equal(decideWorkspaceMerge({ ...base, localRevision: undefined }), "keep-conflict");
});
