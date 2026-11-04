import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CREDITS_CHANGED_EVENT,
  DAILY_CREDITS,
  PROJECT_CREATION_COST,
  balanceAfterReset,
  canAffordProject,
  notifyCreditsChanged,
  utcTodayString,
} from "./credits";

test("one day builds exactly one full project", () => {
  assert.equal(DAILY_CREDITS, 10);
  assert.equal(PROJECT_CREATION_COST, 10);
  assert.equal(canAffordProject(10), true);
  assert.equal(canAffordProject(9), false);
});

test("utcTodayString renders the UTC calendar date", () => {
  assert.equal(utcTodayString(new Date("2026-11-04T00:30:00Z")), "2026-11-04");
  assert.equal(utcTodayString(new Date("2026-11-04T23:59:59Z")), "2026-11-04");
});

test("stale balances refill to the daily budget", () => {
  assert.deepEqual(balanceAfterReset(0, "2026-11-03", "2026-11-04"), {
    balance: 10,
    resetDate: "2026-11-04",
    reset: true,
  });
  assert.deepEqual(balanceAfterReset(4, "2026-11-01", "2026-11-04"), {
    balance: 10,
    resetDate: "2026-11-04",
    reset: true,
  });
});

test("balance changes broadcast on a stable event name", () => {
  assert.equal(CREDITS_CHANGED_EVENT, "musevibe:credits-changed");
  assert.doesNotThrow(() => notifyCreditsChanged());
});

test("fresh balances are left untouched", () => {
  assert.deepEqual(balanceAfterReset(10, "2026-11-04", "2026-11-04"), {
    balance: 10,
    resetDate: "2026-11-04",
    reset: false,
  });
  assert.deepEqual(balanceAfterReset(0, "2026-11-04", "2026-11-04"), {
    balance: 0,
    resetDate: "2026-11-04",
    reset: false,
  });
});
