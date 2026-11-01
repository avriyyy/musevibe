export interface MermaidBlock {
  chart: string;
  section: string | null;
}

const DIAGRAM_TYPES: Record<string, string> = {
  flowchart: "flowchart",
  graph: "graph",
  erdiagram: "erDiagram",
  sequencediagram: "sequenceDiagram",
  statediagram: "stateDiagram",
  "statediagram-v2": "stateDiagram-v2",
  classdiagram: "classDiagram",
  "classdiagram-v2": "classDiagram-v2",
  gantt: "gantt",
  pie: "pie",
  journey: "journey",
  mindmap: "mindmap",
  timeline: "timeline",
};

/** Fix a frequent model error in ER cardinalities and canonicalize the header. */
export function normalizeMermaidChart(chart: string): string {
  const lines = chart.replace(/\r\n?/g, "\n").trim().split("\n");
  const first = lines[0]?.trim() ?? "";
  const header = first.match(/^([\w-]+)(\b[\s\S]*)$/);
  if (header) {
    const canonical = DIAGRAM_TYPES[header[1].toLowerCase()];
    if (canonical) lines[0] = `${canonical}${header[2]}`;
  }

  if (lines[0]?.trim() !== "erDiagram") return lines.join("\n");
  return lines
    .map((line) => {
      if (!line.includes("--")) return line;
      const colon = line.indexOf(":");
      const head = colon === -1 ? line : line.slice(0, colon);
      const tail = colon === -1 ? "" : line.slice(colon);
      return head.replace(/oM/g, "o{").replace(/Mo/g, "}o") + tail;
    })
    .join("\n");
}

/** Extract fenced Mermaid blocks while tracking the containing document section. */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let section: string | null = null;
  let fence: string | null = null;
  let mermaid = false;
  let chartLines: string[] = [];
  let chartSection: string | null = null;

  for (const line of lines) {
    if (fence) {
      if (new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line)) {
        if (mermaid) {
          blocks.push({ chart: normalizeMermaidChart(chartLines.join("\n")), section: chartSection });
        }
        fence = null;
        mermaid = false;
        chartLines = [];
        chartSection = null;
      } else if (mermaid) {
        chartLines.push(line);
      }
      continue;
    }

    const heading = line.match(/^\s*##\s+\S.*$/);
    if (heading) section = heading[0].trim();

    const opening = line.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if (!opening) continue;
    fence = opening[1];
    mermaid = /^mermaid(?:\s|$)/i.test(opening[2]);
    if (mermaid) chartSection = section;
  }

  return blocks;
}

/** Apply deterministic normalizations without rewriting the surrounding prose. */
export function normalizeMermaidMarkdown(markdown: string): string {
  return markdown.replace(
    /(^\s*```mermaid[^\r\n]*\r?\n)([\s\S]*?)(^\s*```[ \t\r]*$)/gim,
    (_block, opening: string, chart: string, closing: string) =>
      `${opening}${normalizeMermaidChart(chart)}\n${closing}`,
  );
}

/** Parse each required diagram with the same Mermaid parser used by the renderer. */
export async function validateMermaidMarkdown(markdown: string): Promise<string[]> {
  const blocks = extractMermaidBlocks(markdown);
  if (!blocks.length) return [];

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  const issues: string[] = [];
  for (const [index, block] of blocks.entries()) {
    try {
      await mermaid.parse(block.chart);
    } catch (error) {
      const detail = error instanceof Error ? error.message.split("\n")[0].slice(0, 180) : "invalid syntax";
      const where = block.section ? ` in ${block.section}` : ` in diagram ${index + 1}`;
      issues.push(`Invalid Mermaid${where}: ${detail}.`);
    }
  }
  return issues;
}
