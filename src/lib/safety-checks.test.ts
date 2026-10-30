import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_QUESTION_IDS,
  FALLBACK_QUESTIONS,
  parseWizardQuestions,
} from "./wizard";
import {
  checkPinnedDocIntegrity,
  extractMarkdownHeadings,
  isRemovalRequest,
} from "./chat";
import { dedupeLogoSvgVariants, parseLogoSvgVariants } from "./logo";
import type { ChatQuote } from "./pick";

const noPins: ChatQuote[] = [];

function wizardPayload(
  overrides: Record<string, Partial<{ id: string; type: string; required: boolean }>> = {},
  extraItems: unknown[] = [],
) {
  const base = [
    { id: "audience", type: "single", options: ["Just me", "A team"], required: true },
    { id: "problem", type: "textarea", required: true },
    { id: "core-action", type: "textarea", required: true },
    { id: "first-build", type: "textarea", required: true },
    { id: "constraints-integrations", type: "textarea", required: false },
    { id: "out-of-scope", type: "textarea", required: false },
  ];
  const items = base.map((entry, index) => ({
    id: overrides[entry.id]?.id ?? entry.id,
    label: `Question ${index + 1}`,
    type: overrides[entry.id]?.type ?? entry.type,
    ...(entry.id === "audience" ? { options: ["Just me", "A team"] } : {}),
    required: overrides[entry.id]?.required ?? entry.required,
  }));
  return { questions: [...items, ...extraItems] };
}

test("wizard keeps six canonical ids in canonical order", () => {
  const reversed = {
    questions: [...wizardPayload().questions].reverse(),
  };
  const parsed = parseWizardQuestions(reversed);
  assert.ok(parsed);
  assert.deepEqual(
    parsed.map((entry) => entry.id),
    [...CANONICAL_QUESTION_IDS],
  );
  assert.deepEqual(
    parsed.map((entry) => entry.required),
    [true, true, true, true, false, false],
  );
});

test("wizard normalizes model required flags", () => {
  const payload = wizardPayload({
    audience: { required: false },
    "out-of-scope": { required: true },
  });
  const parsed = parseWizardQuestions(payload);
  assert.ok(parsed);
  assert.equal(parsed[0].required, true);
  assert.equal(parsed[5].required, false);
});

test("wizard allows text for non-audience categories", () => {
  const payload = wizardPayload({ problem: { type: "text" } });
  const parsed = parseWizardQuestions(payload);
  assert.ok(parsed);
  assert.equal(parsed[1].type, "text");
});

test("wizard falls back on missing optional, extras, duplicates, bad types", () => {
  assert.equal(
    parseWizardQuestions({
      questions: wizardPayload().questions.slice(0, 5),
    }),
    null,
  );
  assert.equal(
    parseWizardQuestions(wizardPayload({}, [{ id: "extra", label: "X", type: "text" }])),
    null,
  );
  assert.equal(
    parseWizardQuestions(
      wizardPayload({ problem: { id: "audience" } }),
    ),
    null,
  );
  assert.equal(parseWizardQuestions(wizardPayload({ audience: { type: "textarea" } })), null);
  assert.equal(parseWizardQuestions(wizardPayload({ problem: { type: "multi" } })), null);
  assert.ok(parseWizardQuestions(wizardPayload({ audience: { type: "single" } })));
  assert.equal(FALLBACK_QUESTIONS.length, 6);
});

test("removal request covers English and Indonesian verbs", () => {
  assert.equal(isRemovalRequest("please remove the risks section", noPins), true);
  assert.equal(isRemovalRequest("delete that part", noPins), true);
  assert.equal(isRemovalRequest("tolong hapus bagian risiko", noPins), true);
  assert.equal(isRemovalRequest("hilangkan bagian itu", noPins), true);
  assert.equal(isRemovalRequest("buang bagian itu", noPins), true);
  assert.equal(isRemovalRequest("hapuskan bagian itu", noPins), true);
  assert.equal(isRemovalRequest("singkirkan bagian itu", noPins), true);
  assert.equal(isRemovalRequest("menghapus bagian itu", noPins), true);
  assert.equal(isRemovalRequest("just fix the typo", noPins), false);
});

test("headings strip markdown markers", () => {
  assert.deepEqual(extractMarkdownHeadings("## System overview\n### Risks"), [
    "system overview",
    "risks",
  ]);
});

test("pinned integrity preserves headings by default", () => {
  const before = `# PRD\n\n## System overview\n\nBody here with enough words to pass the length gate comfortably and more context.\n\n## Risks\n\nMore body here with enough words to pass the gate comfortably and more context.\n`;
  const after = `# PRD\n\n## System overview\n\nBody here with enough words to pass the length gate comfortably and more context. Edited slightly with extra words to keep the length gate happy.\n`;
  // Generic removal wording without naming the missing heading stays blocked.
  const blocked = checkPinnedDocIntegrity(before, after, "remove that part please", noPins);
  assert.equal(blocked.ok, false);
  const allowed = checkPinnedDocIntegrity(
    before,
    `${after}\n`,
    "hapus bagian risks",
    noPins,
  );
  assert.equal(allowed.ok, true);
  const crossPin: ChatQuote[] = [
    { label: "pin", text: "Risks", comment: "hapus bagian risks" },
  ];
  assert.equal(checkPinnedDocIntegrity(before, after, "clean up", crossPin).ok, true);
  assert.equal(checkPinnedDocIntegrity(before, after, "hapus bagian overview", noPins).ok, false);
});

test("logo variants dedupe whitespace equivalents", () => {
  const a = `<svg viewBox="0 0 100 100"><g fill="currentColor"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="10"/><circle cx="50" cy="50" r="10"/></g></svg>`;
  const b = `<svg   viewBox="0 0 100 100">\n  <g fill="currentColor"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="10" />\n    <circle cx="50" cy="50" r="10" /></g>\n</svg>`;
  assert.equal(dedupeLogoSvgVariants([{ svg: a, rationale: "" }, { svg: b, rationale: "" }]).length, 1);
  const raw = JSON.stringify({
    variants: [
      { svg: a, rationale: "one" },
      { svg: b, rationale: "two" },
    ],
  });
  assert.equal(parseLogoSvgVariants(raw).length, 1);
});
