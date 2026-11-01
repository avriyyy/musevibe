import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_QUESTION_IDS,
  FALLBACK_QUESTIONS,
  answerToText,
  buildNamePrompt,
  deriveProjectName,
  isAnswered,
  parseWizardQuestions,
  toCustomAnswer,
} from "./wizard";
import {
  checkPinnedDocIntegrity,
  extractMarkdownHeadings,
  isRemovalRequest,
} from "./chat";
import { restoreWizardAnswers } from "./wizard-hydration";
import { dedupeLogoSvgVariants, parseLogoSvgVariants } from "./logo";
import { inspectDocMarkdown, mergeDocRepairMarkdown } from "./docs";
import { aiGenerate } from "./ai";
import type { Project } from "./types";
import type { ChatQuote } from "./pick";

test("new project fallback uses a neutral workspace label instead of the raw idea", () => {
  const idea = "saya mau buat website e-commerce untuk toko sepatu";
  assert.equal(deriveProjectName(idea), "New project");
  assert.equal(deriveProjectName(""), "");
  assert.match(buildNamePrompt(idea), /internal workspace project label/);
});

const noPins: ChatQuote[] = [];

function wizardPayload(
  overrides: Record<string, Partial<{ id: string; type: string; required: boolean }>> = {},
  extraItems: unknown[] = [],
) {
  const base = [
    { id: "audience", type: "single", required: true },
    { id: "problem", type: "single", required: true },
    { id: "core-action", type: "single", required: true },
    { id: "first-build", type: "single", required: true },
    { id: "constraints-integrations", type: "single", required: false },
    { id: "out-of-scope", type: "single", required: false },
  ];
  const items = base.map((entry, index) => ({
    id: overrides[entry.id]?.id ?? entry.id,
    label: `Question ${index + 1}`,
    type: overrides[entry.id]?.type ?? entry.type,
    options: ["Option one", "Option two", "Option three"],
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

test("wizard requires choice-based questions for every category", () => {
  const payload = wizardPayload({ problem: { type: "text" } });
  assert.equal(parseWizardQuestions(payload), null);
  assert.ok(parseWizardQuestions(wizardPayload()));
  const mixed = parseWizardQuestions(
    wizardPayload({ "first-build": { type: "multi" }, "out-of-scope": { type: "multi" } }),
  );
  assert.ok(mixed);
  assert.equal(mixed[3].type, "multi");
  assert.equal(mixed[5].type, "multi");
});

test("custom answers display as plain text and require non-empty input", () => {
  const empty = toCustomAnswer("");
  const filled = toCustomAnswer("A custom project-specific answer");
  assert.equal(answerToText(empty), "");
  assert.equal(isAnswered(empty), false);
  assert.equal(answerToText(filled), "A custom project-specific answer");
  assert.equal(isAnswered(filled), true);
  assert.equal(
    answerToText(["Option one", toCustomAnswer("A second custom detail")]),
    "Option one, A second custom detail",
  );
  assert.equal(isAnswered([toCustomAnswer("")]), false);
  assert.equal(isAnswered(["Option one", toCustomAnswer("")]), true);
});

test("fallback questions are choice-first and legacy free text restores as custom", () => {
  assert.ok(
    FALLBACK_QUESTIONS.every(
      (question) =>
        (question.type === "single" || question.type === "multi") &&
        (question.options?.length ?? 0) >= 2,
    ),
  );
  assert.deepEqual(
    FALLBACK_QUESTIONS.map((question) => question.type),
    ["single", "single", "single", "multi", "multi", "multi"],
  );
  const restored = restoreWizardAnswers(FALLBACK_QUESTIONS, [
    {
      qid: "problem",
      question: "What problem does this solve?",
      answer: "A project-specific problem",
      values: "A project-specific problem",
    },
  ]);
  assert.equal(answerToText(restored.problem), "A project-specific problem");
  assert.equal(isAnswered(restored.problem), true);
  const restoredMulti = restoreWizardAnswers(FALLBACK_QUESTIONS, [
    {
      qid: "first-build",
      question: "What should the first version include?",
      answer: "A simple dashboard, Import existing data",
      values: ["A simple dashboard", toCustomAnswer("Import existing data")],
    },
  ]);
  assert.deepEqual(restoredMulti["first-build"], [
    "A simple dashboard",
    toCustomAnswer("Import existing data"),
  ]);
  assert.equal(
    answerToText(restoredMulti["first-build"]),
    "A simple dashboard, Import existing data",
  );
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
  assert.ok(parseWizardQuestions(wizardPayload({ problem: { type: "multi" } })));
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

test("document repair merges only returned sections and restores canonical order", () => {
  const project = {
    id: "project-1",
    name: "Pulse",
    idea: "Track personal health habits",
    createdAt: "2026-01-01T00:00:00.000Z",
  } as Project;
  const original = [
    "# DBD — Pulse",
    "",
    "## Relations",
    "",
    "The user owns entries, and each entry belongs to that user. Keep this relation in the database so queries remain scoped. Queries join these tables through explicit foreign keys, and deleting a user removes associated records safely.",
    "",
    "## Entities",
    "",
    "Users have an identifier and preferences. Entries store the habit, date, and completion state for each daily record. The schema keeps notes private to one account, supports date-based filtering, and records completion without storing unnecessary profile details.",
  ].join("\n");
  const repair = [
    "## Entities",
    "",
    "Replacement entity details should not overwrite the already useful source section.",
    "",
    "## Entity-relationship diagram",
    "",
    "```mermaid",
    "erDiagram",
    "  USERS ||--o{ ENTRIES : owns",
    "```",
    "",
    "## Indexes",
    "",
    "Index entries by user_id and date to support the dashboard's newest-first daily history query.",
    "",
    "## Migration notes",
    "",
    "Create the users and entries tables in the first migration, then add the user/date index after the foreign key exists.",
  ].join("\n");

  const merged = mergeDocRepairMarkdown("dbd", project, original, repair);
  const headings = merged.match(/^## .+$/gm) ?? [];
  assert.deepEqual(headings, [
    "## Entities",
    "## Entity-relationship diagram",
    "## Relations",
    "## Indexes",
    "## Migration notes",
  ]);
  assert.match(merged, /Users have an identifier and preferences/);
  assert.match(merged, /erDiagram/);
  assert.doesNotMatch(merged, /Replacement entity details/);
});

test("complete compact engineering docs are not held to the PRD word minimum", () => {
  const headings = [
    "## Entities",
    "## Entity-relationship diagram",
    "## Relations",
    "## Indexes",
    "## Migration notes",
  ];
  const body = Array.from({ length: 34 }, () => "detail").join(" ");
  const diagram = ["```mermaid", "erDiagram", "  USERS ||--o{ ENTRIES : owns", "```"].join("\n");
  const markdown = [
    "# DBD — Pulse",
    ...headings.flatMap((heading, index) => [
      heading,
      index === 0
        ? `| Entity | Column | Type |\n| --- | --- | --- |\n| User | id | uuid |\n\n${body}`
        : index === 1
          ? `${diagram}\n\n${body}`
          : body,
    ]),
  ].join("\n\n");
  const quality = inspectDocMarkdown("dbd", markdown);

  assert.ok(quality.words < 250);
  assert.equal(quality.ok, true, quality.missing.join("; "));
});

test("empty wizard streams do not trigger a duplicate provider attempt", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.AI_API_URL;
  const originalKey = process.env.AI_API_KEY;
  let calls = 0;
  process.env.AI_API_URL = "https://provider.invalid/v1";
  process.env.AI_API_KEY = "test-key";
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("data: [DONE]\n\n", {
      headers: { "content-type": "text/event-stream" },
    });
  }) as typeof fetch;

  try {
    const result = await aiGenerate("questions", "test prompt");
    assert.equal(calls, 1);
    assert.equal(result.source, "local");
    assert.equal(result.reason, "empty");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.AI_API_URL;
    else process.env.AI_API_URL = originalUrl;
    if (originalKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalKey;
  }
});

test("provider unavailability does not create local PRD or document content", async () => {
  const originalUrl = process.env.AI_API_URL;
  const originalKey = process.env.AI_API_KEY;
  delete process.env.AI_API_URL;
  delete process.env.AI_API_KEY;

  try {
    const prd = await aiGenerate("prd", "Generate a product brief.");
    const document = await aiGenerate("doc", "Generate a technical document.");
    assert.equal(prd.source, "local");
    assert.equal(prd.text, "");
    assert.equal(document.source, "local");
    assert.equal(document.text, "");
  } finally {
    if (originalUrl === undefined) delete process.env.AI_API_URL;
    else process.env.AI_API_URL = originalUrl;
    if (originalKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalKey;
  }
});
