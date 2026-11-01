import { test } from "node:test";
import assert from "node:assert/strict";
import { generateValidatedDocument } from "./document-generation";
import type { Project } from "./types";

const project: Project = {
  id: "project-pulse",
  name: "Pulse",
  idea: "A focused habit tracker for independent developers.",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const detail = Array.from({ length: 42 }, () => "specific workflow implementation choice").join(" ");

function validPrd(): string {
  return [
    "# wrong title is normalized",
    "## Problem",
    `Hypothesis: the idea indicates a workflow worth exploring. ${detail}`,
    "## Who it is for",
    `Independent developers who want to track one habit without guilt or unnecessary setup. ${detail}`,
    "## The core flow",
    "1. Open the tracker and select a habit.",
    "2. Record today's progress in one clear action.",
    "3. Review the result and keep it for the next session.",
    "## What ships first",
    "- A focused habit list with clear names.",
    "- A quick action to record today's progress.",
    "- A history view that keeps saved entries.",
    "- Empty, loading, and error states for the core flow.",
    "## Out of scope for v1",
    "- Team collaboration and shared dashboards.",
    "- Notifications and email delivery.",
    "- Advanced analytics or prediction.",
    "## How we know it works",
    `Manually complete the core flow from first open to a saved entry. ${detail}`,
  ].join("\n\n");
}

function validDbd(diagramLine: string): string {
  return [
    "# DBD — Pulse",
    "## Entities",
    "| Entity | Column | Type |",
    "| --- | --- | --- |",
    "| User | id | uuid |",
    detail,
    "## Entity-relationship diagram",
    "```mermaid",
    "erDiagram",
    `  USERS ${diagramLine} ENTRIES : owns`,
    "```",
    "## Relations",
    `Users connect to entries through user_id with a one-to-many relation; delete behavior is an explicit assumption. ${detail}`,
    "## Indexes",
    `Index user_id to load the current user's entries in stable order. ${detail}`,
    "## Migration notes",
    `Create the initial table and foreign key together, then add later columns with reversible migrations. ${detail}`,
  ].join("\n\n");
}

test("a valid AI PRD is returned only after the structure and content gate passes", async () => {
  let calls = 0;
  const result = await generateValidatedDocument({
    kind: "prd",
    project,
    brief: "",
    request: async () => {
      calls += 1;
      return { text: validPrd(), source: "ai" };
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.markdown, /^# Pulse\n/);
  assert.equal(calls, 1);
});

test("an invalid first answer gets one targeted AI repair and then passes", async () => {
  let calls = 0;
  const result = await generateValidatedDocument({
    kind: "prd",
    project,
    brief: "",
    request: async () => {
      calls += 1;
      return {
        text: calls === 1 ? "# partial\n\n## Problem\nToo short." : validPrd(),
        source: "ai",
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls, 2);
});

test("a local provider response is not repaired, saved, or returned as document content", async () => {
  let calls = 0;
  const result = await generateValidatedDocument({
    kind: "prd",
    project,
    brief: "",
    request: async () => {
      calls += 1;
      return {
        text: "# Local outline\n\nA deterministic placeholder.",
        source: "local",
        reason: "missing-key",
      };
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "provider");
  assert.equal(calls, 1);
});

test("a diagram that remains invalid after its single repair is rejected", async () => {
  let calls = 0;
  const result = await generateValidatedDocument({
    kind: "dbd",
    project,
    brief: "",
    request: async () => {
      calls += 1;
      return { text: validDbd("||--oops"), source: "ai" };
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid");
  if (!result.ok && result.reason === "invalid") {
    assert.ok(result.missing.some((issue) => issue.includes("Invalid Mermaid")));
  }
  assert.equal(calls, 2);
});
