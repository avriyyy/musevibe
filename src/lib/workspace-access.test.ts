import { test } from "node:test";
import assert from "node:assert/strict";
import { canViewWorkspace } from "./workspace-access";

test("guest workspaces stay visible on the browser without an account", () => {
  assert.equal(canViewWorkspace(undefined, false, null), true);
  assert.equal(canViewWorkspace(undefined, true, null), true);
});

test("account workspaces stay hidden until the matching session is ready", () => {
  assert.equal(canViewWorkspace("user-a", false, null), false);
  assert.equal(canViewWorkspace("user-a", true, null), false);
  assert.equal(canViewWorkspace("user-a", true, "user-b"), false);
  assert.equal(canViewWorkspace("user-a", true, "user-a"), true);
});
