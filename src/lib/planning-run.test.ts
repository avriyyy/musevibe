import { test } from "node:test";
import assert from "node:assert/strict";
import { canCommitGeneration } from "./lifecycle";
import {
  beginUnit,
  finishPlanningRun,
  isSettledStatus,
  noteUnitProgress,
  PLANNING_UNIT_IDS,
  resumePlanningRun,
  resumeProgress,
  settleUnit,
  startPlanningRun,
  unsettledUnitIds,
} from "./planning-run";

test("a fresh run queues every unit and nothing is settled", () => {
  const run = startPlanningRun();
  assert.equal(Object.keys(run.units).length, PLANNING_UNIT_IDS.length);
  assert.equal(run.finishedAt, undefined);
  assert.deepEqual(unsettledUnitIds(run).sort(), [...PLANNING_UNIT_IDS].sort());
});

test("a unit is only settled once its text is committed", () => {
  let run = startPlanningRun();
  run = beginUnit(run, "doc-trd", 20, "2026-01-01T00:00:01.000Z");
  assert.equal(run.units["doc-trd"].status, "generating");
  assert.equal(isSettledStatus(run.units["doc-trd"].status), false);
  run = noteUnitProgress(run, "doc-trd", "checking", 75);
  assert.equal(isSettledStatus(run.units["doc-trd"].status), false);
  run = settleUnit(run, "doc-trd", "done", 100, "2026-01-01T00:00:09.000Z");
  assert.equal(isSettledStatus(run.units["doc-trd"].status), true);
  assert.equal(run.units["doc-trd"].settledAt, "2026-01-01T00:00:09.000Z");
  assert.equal(unsettledUnitIds(run).includes("doc-trd"), false);
});

test("a failed document remains incomplete and is queued for a later retry", () => {
  const failed = noteUnitProgress(
    beginUnit(startPlanningRun(), "doc-trd"),
    "doc-trd",
    "failed",
    0,
  );
  assert.equal(isSettledStatus(failed.units["doc-trd"].status), false);
  assert.equal(unsettledUnitIds(failed).includes("doc-trd"), true);
  assert.equal(resumePlanningRun(failed).units["doc-trd"].status, "queued");
});

test("resuming keeps settled units and retries the rest under the same id", () => {
  let run = beginUnit(startPlanningRun(), "doc-trd");
  run = settleUnit(run, "doc-afd", "done");
  run = settleUnit(run, "tasks", "done");
  run = noteUnitProgress(run, "pages", "checking", 85);
  const resumed = resumePlanningRun(run);
  assert.equal(resumed.id, run.id);
  assert.equal(resumed.units["doc-afd"].status, "done");
  assert.equal(resumed.units["tasks"].status, "done");
  assert.equal(resumed.units["doc-trd"].status, "queued");
  assert.equal(resumed.units["pages"].status, "queued");
  // Units that never started are still pending, so they stay queued too.
  const pending = unsettledUnitIds(resumed);
  assert.equal(pending.includes("doc-trd"), true);
  assert.equal(pending.includes("pages"), true);
  assert.equal(pending.includes("doc-afd"), false);
  assert.equal(pending.includes("tasks"), false);
});

test("a finished run starts a new pass instead of resurrecting old units", () => {
  const finished = finishPlanningRun(settleUnit(startPlanningRun(), "doc-trd", "done"));
  const next = resumePlanningRun(finished);
  assert.notEqual(next.id, finished.id);
  assert.equal(next.finishedAt, undefined);
  assert.equal(next.units["doc-trd"].status, "queued");
});

test("resume progress paints finished units and queues retries", () => {
  let run = settleUnit(startPlanningRun(), "doc-afd", "done");
  run = settleUnit(run, "tasks", "local");
  run = beginUnit(run, "doc-trd");
  const progress = resumeProgress(run);
  assert.deepEqual(progress["doc-afd"], { status: "done", percent: 100 });
  assert.deepEqual(progress["tasks"], { status: "queued", percent: 0 });
  assert.deepEqual(progress["doc-trd"], { status: "queued", percent: 0 });
  assert.deepEqual(resumeProgress(undefined), {});
});

test("a cancelled attempt may not commit, a live one may", async () => {
  const live = new AbortController();
  assert.equal(await canCommitGeneration(live.signal), true);
  live.abort();
  assert.equal(await canCommitGeneration(live.signal), false);
  assert.equal(await canCommitGeneration(undefined), true);
});
