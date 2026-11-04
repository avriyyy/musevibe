import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODEL,
  formatModelLabel,
  isModelAllowed,
  lockedModelIds,
  sortModels,
} from "./models";

test("only the Contributor release may generate", () => {
  assert.equal(DEFAULT_MODEL, "muse-spark-1.3-contributor");
  assert.equal(isModelAllowed("muse-spark-1.3-contributor"), true);
  assert.equal(isModelAllowed("muse-spark-1.2"), false);
  assert.equal(isModelAllowed("muse-wonder-1.0"), false);
  assert.equal(isModelAllowed(""), false);
});

test("chat discovery keeps the allowed model and locks the rest", () => {
  const discovered = [
    "muse-spark-1.3-contributor",
    "muse-spark-1.2",
    "muse-wonder-1.0",
    "muse-image-1.0",
    "muse-voice-transcribe-1.0",
  ];
  assert.deepEqual(sortModels(discovered), ["muse-spark-1.3-contributor"]);
  assert.deepEqual(lockedModelIds(discovered), [
    "muse-spark-1.2",
    "muse-wonder-1.0",
  ]);
});

test("locked list stays short, unique, and model-like", () => {
  assert.deepEqual(lockedModelIds([]), []);
  assert.deepEqual(
    lockedModelIds(["other-model", "muse-spark-1.2", "muse-spark-1.2"]),
    ["muse-spark-1.2"],
  );
  assert.equal(formatModelLabel("muse-spark-1.2").length > 0, true);
});
