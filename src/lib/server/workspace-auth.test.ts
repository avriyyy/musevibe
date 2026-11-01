import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyWorkspaceBearerToken } from "./workspace-auth";

const requestWith = (authorization?: string) => new Request("https://musevibe.test/api/workspaces", {
  headers: authorization ? { authorization } : {},
});

test("missing bearer credentials are rejected without token verification", async () => {
  let called = false;
  const result = await verifyWorkspaceBearerToken(requestWith(), async () => {
    called = true;
    return { id: "user-a" };
  });
  assert.equal("response" in result && result.response.status, 401);
  assert.equal(called, false);
});

test("malformed authorization headers are rejected", async () => {
  const result = await verifyWorkspaceBearerToken(requestWith("Bearer token with spaces"), async () => ({ id: "user-a" }));
  assert.equal("response" in result && result.response.status, 401);
});

test("invalid bearer tokens cannot authenticate a workspace request", async () => {
  let received = "";
  const result = await verifyWorkspaceBearerToken(requestWith("Bearer expired-token"), async (token) => {
    received = token;
    return null;
  });
  assert.equal(received, "expired-token");
  assert.equal("response" in result && result.response.status, 401);
});

test("valid bearer tokens resolve to a minimal server-verified owner identity", async () => {
  const result = await verifyWorkspaceBearerToken(requestWith("bearer valid-token"), async (token) => {
    assert.equal(token, "valid-token");
    return { id: "user-a", email: "private@example.test" };
  });
  assert.deepEqual(result, { user: { id: "user-a" } });
});
