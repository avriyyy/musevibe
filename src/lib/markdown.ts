/**
 * Simple, safe markdown renderer — no external dependency.
 * Handles the subset we need for PRD display:
 * headings, bold, italic, inline-code, code blocks, blockquote,
 * unordered/ordered lists, tables, horizontal rules, and paragraphs.
 *
 * Output is an array of React-renderable token objects.
 * This keeps bundle size minimal and avoids XSS risks from dangerouslySetInnerHTML.
 */

export type MdToken =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "p"; inlines: MdInline[] }
  | { type: "ul"; items: MdInline[][] }
  | { type: "ol"; items: MdInline[][] }
  | { type: "code"; lang: string; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "blank" };

export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "del"; text: string };

/** Parse inline markdown (bold, italic, inline-code, strikethrough) */
export function parseInline(raw: string): MdInline[] {
  const tokens: MdInline[] = [];
  // Split on bold (**), italic (*), code (`), strikethrough (~~)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|~~(.+?)~~)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: "text", text: raw.slice(last, m.index) });
    }
    if (m[0].startsWith("**")) {
      tokens.push({ kind: "bold", text: m[2] });
    } else if (m[0].startsWith("~~")) {
      tokens.push({ kind: "del", text: m[5] });
    } else if (m[0].startsWith("`")) {
      tokens.push({ kind: "code", text: m[4] });
    } else {
      tokens.push({ kind: "italic", text: m[3] });
    }
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    tokens.push({ kind: "text", text: raw.slice(last) });
  }
  return tokens.length ? tokens : [{ kind: "text", text: raw }];
}

/** Parse a markdown string into structured tokens */
export function parseMd(markdown: string): MdToken[] {
  const lines = markdown.split("\n");
  const tokens: MdToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({ type: "code", lang, text: codeLines.join("\n") });
      i++;
      continue;
    }

    // Headings
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      const level = hm[1].length as 1 | 2 | 3 | 4;
      tokens.push({
        type: `h${level}` as "h1" | "h2" | "h3" | "h4",
        text: hm[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      tokens.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        bqLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      tokens.push({ type: "blockquote", lines: bqLines });
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\|[\s|:-]+\|/)) {
      const headerCells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
        );
        i++;
      }
      tokens.push({ type: "table", headers: headerCells, rows });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: MdInline[][] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*+]\s/, "")));
        i++;
      }
      tokens.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: MdInline[][] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s/, "")));
        i++;
      }
      tokens.push({ type: "ol", items });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      tokens.push({ type: "blank" });
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].includes("|")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    const fullPara = paraLines.join(" ").trim();
    if (fullPara) {
      tokens.push({ type: "p", inlines: parseInline(fullPara) });
    }
  }

  return tokens;
}
