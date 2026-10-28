/**
 * Light "artboard" cards rendered inside the plan canvas. Each board is a
 * self-contained HTML document shown through the HTML shape: an excerpt of
 * the real content plus a hint that selecting it opens the editor.
 */

import type { Task, TaskStatus } from "./types";
import { docLabel } from "./docs";

export interface BoardSpec {
  id: string;
  /** Figma-style frame label shown above the board. */
  title: string;
  /** Page slug shown next to the title, e.g. "/". Empty for documents. */
  slug: string;
  html: string;
  w: number;
  h: number;
  x: number;
  y: number;
}

const CARD_CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#ffffff;color:#171717}
.board{padding:28px 28px 24px}
.eyebrow{font-size:11px;letter-spacing:.14em;color:#8a8a8a;font-weight:700;margin-bottom:8px}
h1{font-size:24px;line-height:1.25;margin:0 0 12px;color:#111}
h2{font-size:16px;margin:20px 0 8px;color:#111}
h3{font-size:13px;margin:16px 0 6px;color:#111}
p{font-size:13.5px;line-height:1.6;color:#333;margin:0 0 10px}
ul,ol{margin:0 0 10px;padding-left:22px;font-size:13.5px;line-height:1.6;color:#333}
li{margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:12.5px}
th{border-bottom:2px solid #ddd;padding:6px 8px;text-align:left;font-weight:700;color:#111}
td{border-bottom:1px solid #eee;padding:6px 8px;color:#333;vertical-align:top}
code{font-family:ui-monospace,monospace;font-size:12px;background:#f1f1f1;padding:1px 5px;border-radius:4px}
pre{background:#111;color:#eee;padding:12px;border-radius:8px;overflow:hidden;font-size:12px;line-height:1.5}
blockquote{border-left:3px solid #ddd;margin:0 0 10px;padding-left:12px;color:#555}
.foot{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#8a8a8a}
.taskcol{background:#f6f6f7;border-radius:10px;padding:10px;margin-bottom:10px}
.taskcol h3{margin:0 0 8px;font-size:11px;letter-spacing:.1em;color:#777}
.task{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:8px 10px;font-size:12.5px;margin-bottom:6px;color:#222}
.more{font-size:12px;color:#999}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
`;

function shell(eyebrow: string, title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><style>${CARD_CSS}</style></head><body><div class="board"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${body}<div class="foot">Select this board to open the full editor &rarr;</div></div></body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineHtml(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

interface TableBlock {
  headers: string[];
  aligns: ("left" | "center" | "right")[];
  rows: string[][];
}

type MdBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; table: TableBlock }
  | { type: "code"; text: string }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

function splitRow(line: string): string[] {
  const cells = line.trim().split("|");
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

function isSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function parseMarkdown(markdown: string): MdBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  };

  const isTableRow = (line: string) =>
    /^\|.*\|\s*$/.test(line.trim()) && (line.match(/\|/g) ?? []).length >= 2;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();

    if (code) {
      if (line.trim().startsWith("```")) {
        blocks.push({ type: "code", text: code.join("\n") });
        code = null;
      } else {
        code.push(lines[index]);
      }
      continue;
    }
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      code = [];
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (isTableRow(line) && !bullet && !ordered) {
      flushParagraph();
      flushList();
      const rows = [splitRow(line)];
      let cursor = index + 1;
      while (cursor < lines.length && isTableRow(lines[cursor].trimEnd())) {
        rows.push(splitRow(lines[cursor].trimEnd()));
        cursor += 1;
      }
      if (rows.length < 2) {
        paragraph.push(line.trim());
      } else {
        const [headers, maybeSeparator, ...rest] = rows;
        const hasSeparator = isSeparator(maybeSeparator ?? []);
        const body = hasSeparator ? rest : [maybeSeparator, ...rest];
        const aligns = headers.map((_, column) => {
          const cell = hasSeparator ? (maybeSeparator[column] ?? "") : "";
          if (/^:.+:$/.test(cell)) return "center";
          if (/:$/.test(cell)) return "right";
          return "left";
        });
        blocks.push({ type: "table", table: { headers, aligns, rows: body } });
      }
      index = cursor - 1;
      continue;
    }
    if (bullet || ordered) {
      flushParagraph();
      const nextOrdered = Boolean(ordered);
      if (!list || list.ordered !== nextOrdered) {
        flushList();
        list = { ordered: nextOrdered, items: [] };
      }
      list.items.push(((bullet ?? ordered) as RegExpMatchArray)[1].trim());
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: line.replace(/^>\s?/, "") });
      continue;
    }
    if (list) flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  if (code) blocks.push({ type: "code", text: code.join("\n") });
  return blocks;
}

function blockHtml(block: MdBlock): string {
  if (block.type === "heading") {
    const tag = block.level <= 2 ? "h2" : "h3";
    return `<${tag}>${inlineHtml(block.text)}</${tag}>`;
  }
  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    return `<${tag}>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</${tag}>`;
  }
  if (block.type === "table") {
    const { headers, aligns, rows } = block.table;
    const align = (value: "left" | "center" | "right") =>
      value === "center"
        ? ' style="text-align:center"'
        : value === "right"
          ? ' style="text-align:right"'
          : "";
    return `<table><thead><tr>${headers
      .map((cell, i) => `<th${align(aligns[i] ?? "left")}>${inlineHtml(cell)}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map(
        (row) =>
          `<tr>${headers
            .map(
              (_, i) =>
                `<td${align(aligns[i] ?? "left")}>${inlineHtml(row[i] ?? "")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")}</tbody></table>`;
  }
  if (block.type === "code") {
    return `<pre>${escapeHtml(block.text)}</pre>`;
  }
  if (block.type === "quote") {
    return `<blockquote>${inlineHtml(block.text)}</blockquote>`;
  }
  return `<p>${inlineHtml(block.text)}</p>`;
}

/** First N blocks of a markdown document as HTML, for board excerpts. */
export function markdownExcerpt(markdown: string, maxBlocks: number): string {
  return parseMarkdown(markdown)
    .slice(0, Math.max(1, maxBlocks))
    .map(blockHtml)
    .join("");
}

export function tasksBoardHtml(tasks: Task[]): string {
  const columns: { status: TaskStatus; label: string }[] = [
    { status: "todo", label: "To do" },
    { status: "doing", label: "In progress" },
    { status: "review", label: "In review" },
    { status: "blocked", label: "Blocked" },
    { status: "done", label: "Done" },
    { status: "cancelled", label: "Cancelled" },
  ];
  const colors: Record<TaskStatus, string> = {
    todo: "#8a8a8a",
    doing: "#2563eb",
    review: "#d97706",
    blocked: "#dc2626",
    done: "#16a34a",
    cancelled: "#9ca3af",
  };
  const lists = columns
    .map((column) => {
      const items = tasks.filter((task) => task.status === column.status);
      const shown = items
        .slice(0, 3)
        .map(
          (task) =>
            `<div class="task"><span class="dot" style="background:${colors[column.status]}"></span>${escapeHtml(task.title)}</div>`,
        )
        .join("");
      const more =
        items.length > 3
          ? `<div class="more">+${items.length - 3} more</div>`
          : "";
      const empty =
        items.length === 0 ? `<div class="more">Nothing here yet</div>` : "";
      return `<div class="taskcol"><h3>${column.label.toUpperCase()} · ${items.length}</h3>${shown}${more}${empty}</div>`;
    })
    .join("");
  return lists;
}

export interface PlanBoardInput {
  brief: string;
  tasks: Task[];
  docs: { id: string; kind: string; title: string; markdown: string }[];
  projectName: string;
}

export function buildPlanBoards(input: PlanBoardInput): BoardSpec[] {
  const boards: BoardSpec[] = [];
  const briefBody = input.brief.trim()
    ? markdownExcerpt(input.brief, 5)
    : "<p>Empty — open the brief to generate it.</p>";
  boards.push({
    id: "shape:board-brief",
    title: "Product brief",
    slug: "",
    html: shell("PRODUCT BRIEF · PRD", input.projectName || "Untitled project", briefBody),
    w: 520,
    h: 680,
    x: 80,
    y: 80,
  });
  boards.push({
    id: "shape:board-tasks",
    title: "Task board",
    slug: "",
    html: shell(
      "TASK BOARD",
      `${input.tasks.length} ${input.tasks.length === 1 ? "task" : "tasks"}`,
      tasksBoardHtml(input.tasks),
    ),
    w: 520,
    h: 680,
    x: 640,
    y: 80,
  });
  const shown = input.docs.filter((entry) => entry.kind !== "prd");
  shown.forEach((entry, index) => {
    const body = entry.markdown.trim()
      ? markdownExcerpt(entry.markdown, 4)
      : "<p>Empty — select to open and generate.</p>";
    const label = docLabel(entry.kind);
    boards.push({
      id: `shape:board-doc-${entry.id}`,
      title: entry.title || label,
      slug: "",
      html: shell(
        `${label} · ${entry.title || "Untitled"}`.toUpperCase(),
        entry.title || label,
        body,
      ),
      w: 520,
      h: 600,
      x: 80 + index * 560,
      y: 800,
    });
  });
  return boards;
}

/** Trailing dashed board that creates a supporting note when selected. */
export function newDocumentBoard(x: number, y: number): BoardSpec {
  return {
    id: "shape:board-new-doc",
    title: "New document",
    slug: "",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><style>${CARD_CSS}body{background:transparent}.board{border:2px dashed #bbb;border-radius:16px;background:rgba(255,255,255,.7);text-align:center;padding-top:120px}.plus{font-size:44px;color:#888;line-height:1}.hint{font-size:12px;color:#8a8a8a;margin-top:12px}</style></head><body><div class="board"><div class="plus">+</div><div class="hint">Select to add a supporting document</div></div></body></html>`,
    w: 480,
    h: 600,
    x,
    y,
  };
}
