import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkspaceApi, type CreditCharger, type WorkspaceRepository } from "./workspace-api";
import type { CloudWorkspaceRecord, CloudWorkspaceSnapshot } from "../types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REVISION = "2026-11-01 04:00:00+00";

function snapshot(): CloudWorkspaceSnapshot {
  return {
    version: 1,
    project: {
      id: PROJECT_ID,
      name: "MuseVibe",
      idea: "A workspace",
      createdAt: "2026-11-01T00:00:00.000Z",
    },
    prd: "",
    tasks: [],
    screens: [],
    files: [],
    docs: [],
  };
}

function record(): CloudWorkspaceRecord {
  return { snapshot: snapshot(), revision: REVISION };
}

function createHarness(overrides: Partial<WorkspaceRepository> = {}, charger: CreditCharger | null = null) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const repo: WorkspaceRepository = {
    listOwned: async (...args) => {
      calls.push({ method: "listOwned", args });
      return [record()];
    },
    updateOwned: async (...args) => {
      calls.push({ method: "updateOwned", args });
      return { kind: "saved", revision: "2026-11-01 04:01:00+00" };
    },
    countOwned: async (...args) => {
      calls.push({ method: "countOwned", args });
      return 0;
    },
    createOwned: async (...args) => {
      calls.push({ method: "createOwned", args });
      return REVISION;
    },
    ...overrides,
  };
  const api = createWorkspaceApi({
    authenticate: async () => ({ user: { id: USER_A } }),
    repository: () => repo,
    ...(charger ? { credits: () => charger } : {}),
    newId: () => "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    now: () => "2026-11-01T00:00:00.000Z",
  });
  return { api, calls };
}

function jsonRequest(method: string, body?: unknown) {
  return new Request("https://musevibe.test/api/workspaces", {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("GET asks the repository only for the verified user and returns private data", async () => {
  const { api, calls } = createHarness();
  const response = await api.GET(jsonRequest("GET"));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(calls[0], { method: "listOwned", args: [USER_A, 500] });
  assert.deepEqual(data.workspaces, [record()]);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("POST ignores a forged owner field and updates only the authenticated owner's row", async () => {
  const { api, calls } = createHarness();
  const response = await api.POST(jsonRequest("POST", {
    ownerId: USER_B,
    snapshot: snapshot(),
    expectedRevision: REVISION,
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].method, "updateOwned");
  assert.equal(calls[0].args[0], USER_A);
  assert.equal(calls[0].args[1], PROJECT_ID);
  assert.equal(calls[0].args[2], REVISION);
});

test("POST preserves local data on optimistic revision conflict", async () => {
  const { api } = createHarness({
    updateOwned: async () => ({ kind: "conflict" }),
  });
  const response = await api.POST(jsonRequest("POST", {
    snapshot: snapshot(),
    expectedRevision: REVISION,
  }));
  assert.equal(response.status, 409);
});

test("create derives ownership and project ID on the server, ignoring client IDs", async () => {
  const { api, calls } = createHarness();
  const response = await api.create(jsonRequest("POST", {
    ownerId: USER_B,
    project: {
      id: USER_B,
      name: "New idea",
      idea: "A local-first board",
    },
  }));
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.deepEqual(calls[0], { method: "countOwned", args: [USER_A] });
  assert.equal(calls[1].method, "createOwned");
  assert.equal(calls[1].args[0], USER_A);
  const created = calls[1].args[1] as CloudWorkspaceSnapshot;
  assert.equal(created.project.id, "dddddddd-dddd-4ddd-8ddd-dddddddddddd");
  assert.notEqual(created.project.id, USER_B);
  assert.equal(data.snapshot.project.id, created.project.id);
});

test("invalid stored workspace records fail visibly instead of disappearing from GET", async () => {
  const { api } = createHarness({ listOwned: async () => [null] });
  const response = await api.GET(jsonRequest("GET"));
  assert.equal(response.status, 500);
});

test("missing authentication prevents every repository operation", async () => {
  let repositoryCalls = 0;
  const api = createWorkspaceApi({
    authenticate: async () => ({
      response: Response.json({ error: "Sign in is required." }, { status: 401 }),
    }),
    repository: () => {
      repositoryCalls += 1;
      return {
        listOwned: async () => [],
        updateOwned: async () => ({ kind: "missing" }),
        countOwned: async () => 0,
        createOwned: async () => REVISION,
      };
    },
  });
  assert.equal((await api.GET(jsonRequest("GET"))).status, 401);
  assert.equal((await api.POST(jsonRequest("POST", {}))).status, 401);
  assert.equal((await api.create(jsonRequest("POST", {}))).status, 401);
  assert.equal(repositoryCalls, 0);
});

test("invalid update revision is rejected before database access", async () => {
  const { api, calls } = createHarness();
  const response = await api.POST(jsonRequest("POST", {
    snapshot: snapshot(),
    expectedRevision: "not-a-date",
  }));
  assert.equal(response.status, 400);
  assert.equal(calls.length, 0);
});

test("oversized create bodies are bounded before repository access", async () => {
  const { api, calls } = createHarness();
  const response = await api.create(jsonRequest("POST", {
    project: { name: "x".repeat(30_000), idea: "y" },
  }));
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

function createCharger(spend: "ok" | "insufficient") {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const charger: CreditCharger = {
    spendForProject: async (userId) => {
      calls.push({ method: "spendForProject", args: [userId] });
      return spend;
    },
    refund: async (userId, amount) => {
      calls.push({ method: "refund", args: [userId, amount] });
    },
  };
  return { charger, calls };
}

function createBody() {
  return { project: { name: "New idea", idea: "A local-first board" } };
}

test("project creation spends daily credits before writing", async () => {
  const { charger, calls: creditCalls } = createCharger("ok");
  const { api, calls } = createHarness({}, charger);
  const response = await api.create(jsonRequest("POST", createBody()));
  assert.equal(response.status, 201);
  assert.deepEqual(creditCalls, [{ method: "spendForProject", args: [USER_A] }]);
  assert.equal(calls.some((call) => call.method === "createOwned"), true);
});

test("insufficient credits block creation with 402 and no write", async () => {
  const { charger } = createCharger("insufficient");
  const { api, calls } = createHarness({}, charger);
  const response = await api.create(jsonRequest("POST", createBody()));
  const data = (await response.json()) as { code?: unknown };
  assert.equal(response.status, 402);
  assert.equal(data.code, "insufficient_credits");
  assert.equal(calls.some((call) => call.method === "createOwned"), false);
});

test("failed creation refunds the spent credits", async () => {
  const { charger, calls: creditCalls } = createCharger("ok");
  const { api } = createHarness({ createOwned: async () => null }, charger);
  const response = await api.create(jsonRequest("POST", createBody()));
  assert.equal(response.status, 409);
  assert.deepEqual(creditCalls[creditCalls.length - 1], {
    method: "refund",
    args: [USER_A, 10],
  });
});

test("storage failure after charging refunds the spent credits", async () => {
  const { charger, calls: creditCalls } = createCharger("ok");
  const { api } = createHarness(
    {
      createOwned: async () => {
        throw new Error("neon is down");
      },
    },
    charger,
  );
  const response = await api.create(jsonRequest("POST", createBody()));
  assert.equal(response.status, 503);
  assert.deepEqual(creditCalls[creditCalls.length - 1], {
    method: "refund",
    args: [USER_A, 10],
  });
});
