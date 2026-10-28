import type { ReactNode } from "react";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import Mermaid from "./Mermaid";

/**
 * Small markdown renderer for AI briefs and plan documents. It covers
 * headings, lists, tables, quotes, rules, code blocks, bold, and inline
 * code. Anything else stays as plain text, so model output can never inject
 * markup into the page.
 */

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string; id: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; headers: string[]; aligns: ("left" | "center" | "right")[]; rows: string[][] }
  | { kind: "quote"; text: string }
  | { kind: "code"; language: string; text: string }
  | { kind: "rule" }
  | { kind: "paragraph"; text: string };

export interface DocHeading {
  id: string;
  level: number;
  text: string;
}

/** Deterministic heading ids shared by the renderer and the TOC extractor. */
function slugifyHeading(text: string, seen: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[`*_~[\]()]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

/** Headings in document order with the same ids the renderer assigns. */
export function extractHeadings(markdown: string): DocHeading[] {
  const seen = new Map<string, number>();
  const out: DocHeading[] = [];
  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const match = raw.trimEnd().match(/^(#{1,3})\s+(.*)$/);
    if (!match) continue;
    out.push({
      id: slugifyHeading(match[2].trim(), seen),
      level: match[1].length,
      text: match[2].trim(),
    });
  }
  return out;
}

export default function Markdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 text-[14px] leading-relaxed text-[#c9cdd6] ${className}`}>
      {toBlocks(text).map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function toBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const seenHeadings = new Map<string, number>();
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: { language: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  const isTableRow = (line: string) =>
    /^\|.*\|\s*$/.test(line.trim()) && (line.match(/\|/g) ?? []).length >= 2;

  const splitRow = (line: string) => {
    const cells = line.trim().split("|");
    // Drop the empty caps the leading and trailing pipes produce.
    if (cells.length && cells[0].trim() === "") cells.shift();
    if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
    return cells.map((cell) => cell.trim());
  };

  const isSeparatorRow = (cells: string[]) =>
    cells.length > 0 &&
    cells.every((cell) => /^:?-+:?$/.test(cell));

  const alignOf = (cell: string): "left" | "center" | "right" => {
    if (/^:.+:$/.test(cell)) return "center";
    if (/:$/.test(cell)) return "right";
    return "left";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();

    if (code) {
      if (line.trim().startsWith("```")) {
        blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n") });
        code = null;
      } else {
        code.lines.push(raw);
      }
      continue;
    }

    const fence = line.trim().match(/^```(\S*)\s*$/);
    if (fence) {
      flushAll();
      code = { language: fence[1].toLowerCase(), lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      const headingText = heading[2].trim();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: headingText,
        id: slugifyHeading(headingText, seenHeadings),
      });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push({ kind: "rule" });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (isTableRow(line) && !bullet && !ordered) {
      flushAll();
      const rows: string[][] = [splitRow(line)];
      let cursor = index + 1;
      while (cursor < lines.length && isTableRow(lines[cursor].trimEnd())) {
        rows.push(splitRow(lines[cursor].trimEnd()));
        cursor += 1;
      }
      // A lone pipe row is a paragraph, not a table.
      if (rows.length < 2) {
        paragraph.push(line.trim());
      } else {
        const [headers, maybeSeparator, ...rest] = rows;
        const hasSeparator = isSeparatorRow(maybeSeparator ?? []);
        const body = hasSeparator ? rest : [maybeSeparator, ...rest];
        const aligns = headers.map((_, column) =>
          hasSeparator ? alignOf(maybeSeparator[column] ?? "") : "left",
        );
        blocks.push({ kind: "table", headers, aligns, rows: body });
      }
      index = cursor;
      continue;
    }
    if (bullet || ordered) {
      flushParagraph();
      const nextOrdered = Boolean(ordered);
      if (!list || list.ordered !== nextOrdered) {
        flushList();
        list = { ordered: nextOrdered, items: [] };
      }
      list.items.push((bullet ?? ordered)![1].trim());
      continue;
    }

    if (line.startsWith(">")) {
      flushAll();
      blocks.push({ kind: "quote", text: line.replace(/^>\s?/, "") });
      continue;
    }

    if (list) flushList();
    paragraph.push(line.trim());
  }

  flushAll();
  if (code) blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n") });
  return blocks;
}

function renderBlock(block: Block, key: number): ReactNode {
  if (block.kind === "heading") {
    const size =
      block.level === 1
        ? "text-[18px] text-[#f5f6f8]"
        : block.level === 2
          ? "text-[15px] text-[#f5f6f8]"
          : "text-[13px] uppercase tracking-[0.08em] text-[#9aa0ae]";
    const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h2" : "h3";
    return (
      <Tag key={key} id={block.id} className={`scroll-mt-2 pt-3 font-semibold first:pt-0 ${size}`}>
        {inline(block.text)}
      </Tag>
    );
  }

  if (block.kind === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag
        key={key}
        className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-white/30`}
      >
        {block.items.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </Tag>
    );
  }

  if (block.kind === "table") {
    const alignClass = (align: "left" | "center" | "right") =>
      align === "center"
        ? "text-center"
        : align === "right"
          ? "text-right"
          : "text-left";
    return (
      <div key={key} className="scroll-surface -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[480px] border-collapse text-[13px]">
          <thead>
            <tr>
              {block.headers.map((cell, index) => (
                <th
                  key={index}
                  className={`border-b border-white/20 px-3 py-2 font-semibold text-[#f5f6f8] ${alignClass(block.aligns[index] ?? "left")}`}
                >
                  {inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-white/5 last:border-0">
                {block.headers.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-2 align-top ${alignClass(block.aligns[cellIndex] ?? "left")}`}
                  >
                    {inline(row[cellIndex] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "quote") {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-white/15 pl-3 text-[#9aa0ae]"
      >
        {inline(block.text)}
      </blockquote>
    );
  }

  if (block.kind === "code") {
    if (block.language === "mermaid") {
      return <Mermaid key={key} chart={block.text} />;
    }
    return (
      <CodeBlock
        key={key}
        code={block.text}
        language={block.language || undefined}
        size="sm"
      />
    );
  }

  if (block.kind === "rule") {
    return <hr key={key} className="border-white/10" />;
  }

  return <p key={key}>{inline(block.text)}</p>;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-[#e6e8ee]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(
        <strong key={key++} className="font-semibold text-[#f5f6f8]">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
