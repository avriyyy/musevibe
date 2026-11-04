import { test } from "node:test";
import assert from "node:assert/strict";
import { canViewWorkspace } from "./workspace-access";

test("legacy workspaces without an owner stay hidden and require explicit account ownership", () => {
  assert.equal(canViewWorkspace(undefined, false, null), false);
  assert.equal(canViewWorkspace(undefined, true, "user-a"), false);
});

test("account workspaces stay hidden until the matching session is ready", () => {
  assert.equal(canViewWorkspace("user-a", false, null), false);
  assert.equal(canViewWorkspace("user-a", true, null), false);
  assert.equal(canViewWorkspace("user-a", true, "user-b"), false);
  assert.equal(canViewWorkspace("user-a", true, "user-a"), true);
});

test("signed-out visitors cannot view any workspace", () => {
  assert.equal(canViewWorkspace(undefined, true, null), false);
  assert.equal(canViewWorkspace("user-a", true, null), false);
});
