import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectDocMarkdown } from "./docs";
import { generationQualitySystemPrompt } from "./generation-quality";
import {
  extractMermaidBlocks,
  normalizeMermaidChart,
  validateMermaidMarkdown,
} from "./mermaid-quality";
import { DEFAULT_MODEL } from "./models";
import { parseTasks } from "./plan";

test("generation system rules ground claims, label assumptions, and preserve the requested format", () => {
  const instructions = generationQualitySystemPrompt("doc");
  assert.match(instructions, /only factual sources/);
  assert.match(instructions, /Assumption:.*Hypothesis:/);
  assert.match(instructions, /schema, headings and order/);
  assert.match(instructions, /valid Mermaid syntax/);
  assert.equal(DEFAULT_MODEL, "muse-spark-1.3-contributor");
});

test("Mermaid normalization repairs common ER cardinality mistakes without changing relationship labels", () => {
  const normalized = normalizeMermaidChart(
    "ERDIAGRAM\n  USERS ||--oM ENTRIES : owns Mo",
  );
  assert.equal(normalized, "erDiagram\n  USERS ||--o{ ENTRIES : owns Mo");
});

test("Mermaid extraction tracks the section and ignores other code fences", () => {
  const blocks = extractMermaidBlocks([
    "## Example",
    "```ts",
    "flowchart TD",
    "```",
    "## Flow diagram",
    "```mermaid",
    "flowchart TD",
    "  A[Start] --> B[Done]",
    "```",
  ].join("\n"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].section, "## Flow diagram");
  assert.match(blocks[0].chart, /^flowchart TD/);
});

test("Mermaid parser accepts a valid ER diagram and rejects malformed syntax", async () => {
  const valid = [
    "## Entity-relationship diagram",
    "```mermaid",
    "erDiagram",
    "  USERS ||--o{ ENTRIES : owns",
    "```",
  ].join("\n");
  const invalid = [
    "## Entity-relationship diagram",
    "```mermaid",
    "erDiagram",
    "  USERS ||--oops ENTRIES : owns",
    "```",
  ].join("\n");

  assert.deepEqual(await validateMermaidMarkdown(valid), []);
  assert.match((await validateMermaidMarkdown(invalid)).join(" "), /Invalid Mermaid/);
});

test("AFD cannot pass its structural quality gate without the requested flow diagram", () => {
  const sections = [
    "## Flow overview",
    "## Flow diagram",
    "## Screen-by-screen flow",
    "## Navigation map",
    "## Empty, loading, and error states",
    "## Edge cases",
  ];
  const body = Array.from({ length: 42 }, () => "detail").join(" ");
  const markdown = ["# AFD — Pulse", ...sections.flatMap((heading) => [heading, body])].join("\n\n");
  const result = inspectDocMarkdown("afd", markdown);
  assert.equal(result.ok, false);
  assert.ok(result.missing.some((issue) => issue.includes("Missing Mermaid diagram in section: ## Flow diagram")));
});

test("task output is constrained to 7–9 open tasks with prompt-sized fields", () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    title: `Build feature ${index + 1} ${"x".repeat(100)}`,
    status: index === 0 ? "done" : "todo",
    notes: "n".repeat(160),
  }));
  const parsed = parseTasks(JSON.stringify({ tasks: entries }), "test");
  assert.ok(parsed);
  assert.equal(parsed.length, 9);
  assert.ok(parsed.every((task) => task.status === "todo"));
  assert.ok(parsed.every((task) => task.title.length <= 89));
  assert.ok(parsed.every((task) => (task.notes?.length ?? 0) <= 119));
  assert.equal(parseTasks(JSON.stringify({ tasks: entries.slice(0, 6) }), "test"), null);
});

test("document parser normalizes Mermaid and the async document gate reports parser errors", async () => {
  const { inspectDocMarkdownAsync, parseDocMarkdown } = await import("./docs");
  const source = [
    "## Entity-relationship diagram",
    "```mermaid",
    "erDiagram",
    "  USERS ||--oM ENTRIES : owns",
    "```",
  ].join("\n");
  const normalized = parseDocMarkdown(source);
  assert.match(normalized, /USERS \|\|--o\{ ENTRIES : owns/);

  const invalid = source.replace("oM ENTRIES", "oops ENTRIES");
  const result = await inspectDocMarkdownAsync("dbd", invalid);
  assert.ok(result.missing.some((issue) => issue.includes("Invalid Mermaid")));
});
