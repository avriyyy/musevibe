/**
 * Design system plumbing for the wizard and the design canvas.
 *
 * A design system is DESIGN.md prose plus a tokens.css `:root` block. It can
 * come from three places: a bundled open-design template, an uploaded
 * design.md file, or a reference link the server fetches and the model
 * converts. The canvas always renders the chosen system first as a showcase
 * page, then one generated page per planned screen.
 */

export interface DesignSystemRef {
  /** Catalog id ("minimal", "shadcn", …) or "custom" for uploads and links. */
  id: string;
  name: string;
  /** Full DESIGN.md content. */
  designMd: string;
  /** Full tokens.css content. */
  tokensCss: string;
  source: "template" | "upload" | "link";
  /** The reference URL, only for link-sourced systems. */
  refUrl?: string;
}

export interface PlannedPage {
  slug: string;
  title: string;
  brief: string;
}

/** File path of the first frame: the rendered design system. */
export const SHOWCASE_PATH = "design-system.html";

/** Built-in fallback when nothing is selected and the model is offline. */
export const DEFAULT_TOKENS_CSS = `:root {
  --bg: #ffffff;
  --fg: #111827;
  --fg-2: #4b5563;
  --meta: #6b7280;
  --accent: #111111;
  --accent-on: #ffffff;
  --surface: #f6f7f9;
  --border: #e5e7eb;
  --radius: 10px;
  --font: system-ui, -apple-system, "Segoe UI", sans-serif;
}`;

export const DEFAULT_DESIGN_MD = `# Minimal design system

A calm neutral baseline: near-black accents on white, one radius, system type.

## Color

- **Primary:** #111111 for the decisive action only.
- **Surface:** #ffffff for the page, #f6f7f9 for quiet sections.
- **Text:** #111827 body, #4b5563 secondary, #6b7280 metadata.

## Typography

- System stack, 14/16/20/24/32 scale. Headings carry the personality,
  body text optimizes scanability.

## Rules

- One accent per viewport. Flat fills, never gradients or glow.
- Borders before shadows. Radius 10px on cards, smaller on inputs.
- Real copy only, never lorem ipsum or bracketed placeholders.
`;

/** Short rules distilled from the antislop skills, pasted into page prompts. */
export const ANTISLOP_DESIGN_RULES = [
  "Pull every color, radius, and font from the tokens below. No raw hex values outside the token block.",
  "No blue-purple gradients, no rainbow gradients, no blurred radial orbs, no glow except on at most one focal element.",
  "Glass (backdrop blur) on at most one surface; everything else stays solid. Flat fills before shadows; most elements sit flat.",
  "Buttons, inputs, cards, and badges keep distinct radii from the tokens; never make everything pill-shaped.",
  "No dot grids, blueprint lines, or graph paper behind content.",
  "Headings carry the style personality; body text stays scannable. Real copy from the brief, no lorem ipsum, no TODO, no bracketed placeholders.",
  "Inline SVG icons only, never emoji as icons. Visible focus states, AA contrast, real labels on every control.",
  "Responsive: readable on a 390px phone and a 1280px desktop.",
].join("\n");

/** Ask the model to turn a reference text into DESIGN.md plus tokens.css. */
export function buildDesignSystemPrompt(
  refText: string,
  refTitle: string,
  projectName: string,
  idea: string,
): string {
  return [
    "You turn a design reference into a reusable design system for MuseVibe.",
    `Project: "${projectName}". The app idea: "${idea.slice(0, 400)}".`,
    refTitle ? `Reference title: "${refTitle}".` : "",
    `Reference content (may be truncated): """${refText.slice(0, 6000)}"""`,
    "",
    "Return exactly two fenced blocks and nothing else:",
    "```markdown",
    "# <name> design system",
    "... DESIGN.md with sections: Visual Theme, Color (with hex tokens), Typography, Spacing, Components, Motion, Anti-patterns ...",
    "```",
    "```css",
    ":root { --bg: ...; --fg: ...; --accent: ...; ... }",
    "```",
    "",
    "Rules:",
    "- Derive the palette, type, and component voice from the reference; do not fall back to generic blue-purple.",
    "- Tokens must cover: --bg --fg --fg-2 --meta --accent --accent-on --surface --border --radius --font.",
    "- Concrete hex values, no placeholders. No em dashes.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Split the two fenced blocks out of a design-system response. */
export function parseDesignSystemResponse(raw: unknown): {
  designMd: string;
  tokensCss: string;
  name: string;
} | null {
  if (typeof raw !== "string") return null;
  const md = raw.match(/```markdown\s*\n?([\s\S]*?)```/i)?.[1]?.trim() ?? "";
  const css =
    raw.match(/```css\s*\n?([\s\S]*?)```/i)?.[1]?.trim() ??
    raw.match(/```\s*\n?(:root[\s\S]*?)```/i)?.[1]?.trim() ??
    "";
  if (!md && !css) return null;
  const name =
    md.match(/^#\s+(.+?)(?:\n|$)/)?.[1]?.replace(/design system/i, "").trim() ||
    "Custom";
  return { designMd: md, tokensCss: css, name };
}

/**
 * First frame on the canvas: the design system rendered as a component
 * gallery, so the style is visible before any app page exists.
 */
export function buildShowcasePrompt(
  projectName: string,
  idea: string,
  designMd: string,
  tokensCss: string,
): string {
  return [
    "Write one self-contained HTML file: a design-system showcase page for the app below.",
    `Project: "${projectName}". Idea: "${idea.slice(0, 400)}".`,
    "",
    "The design system to demonstrate:",
    `"""${designMd.slice(0, 4000)}"""`,
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag, then reference every value via var(--*):",
    `${tokensCss.slice(0, 3000)}`,
    "",
    "Page content (each in its own labeled section):",
    "- Header with the project name and one primary action.",
    "- Type scale sample, buttons (primary/secondary/disabled), inputs with labels, a card grid, a small table, badges, and a loading state.",
    "",
    "Rules:",
    "- One file. All CSS in one <style> tag, all JS (if any) in one <script> tag.",
    "- No external requests: no CDN, no web fonts, no remote images. System fonts and inline SVG only.",
    "- Plain HTML, CSS, and JS only: no React, Vue, Svelte, Next.js, or any framework code — no import/export statements, no JSX, no components, no template directives.",
    "- Real copy tied to the project, no lorem ipsum, no placeholders.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ].join("\n");
}

/** Ask the model which pages the PRD implies, in build order. */
export function buildPagePlanPrompt(
  projectName: string,
  idea: string,
  brief: string,
): string {
  return [
    "You plan the screens of a first-version prototype from its PRD.",
    `Project: "${projectName}". Idea: "${idea.slice(0, 400)}".`,
    `The PRD: """${brief.slice(0, 3500)}"""`,
    "",
    'Return ONLY a JSON object, no fences, no commentary: {"pages":[{"slug":"home","title":"Home","brief":"one sentence on what this screen shows"}]}',
    "",
    "Rules:",
    "- 3 to 6 pages that together deliver the core flow, ordered the way they should be built.",
    "- Slugs are lowercase kebab-case. Titles are short screen names.",
    "- Each brief is one concrete sentence naming the screen's content, never repeating the title.",
  ].join("\n");
}

/** Parse the page plan; null when the model answered with prose. */
export function parsePagePlan(raw: unknown): PlannedPage[] | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  try {
    const data = JSON.parse(text.slice(first, last + 1)) as {
      pages?: Array<{ slug?: unknown; title?: unknown; brief?: unknown }>;
    };
    const pages = (data.pages ?? [])
      .map((entry) => ({
        slug: slugify(typeof entry.slug === "string" ? entry.slug : ""),
        title: (typeof entry.title === "string" ? entry.title : "").trim().slice(0, 60),
        brief: (typeof entry.brief === "string" ? entry.brief : "").trim().slice(0, 200),
      }))
      .filter((entry) => entry.slug && entry.title);
    return pages.length ? pages.slice(0, 8) : null;
  } catch {
    return null;
  }
}

/** Generate one app page in the chosen design system. */
export interface PriorPageContext {
  title: string;
  slug: string;
  html: string;
}

/** Shrink generated HTML to its structural shell: head, header, nav, headings. */
function excerptPageHtml(html: string, maxChars = 2200): string {
  const head = html.match(/<head[\s>][\s\S]*?<\/head\s*>/i)?.[0] ?? "";
  const body = html.match(/<body[\s>][\s\S]*$/i)?.[0] ?? html;
  const shell = (head + "\n" + body)
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");
  const text = shell.replace(/\s+/g, " ").trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

export function buildPagePrompt(
  projectName: string,
  idea: string,
  brief: string,
  page: PlannedPage,
  designMd: string,
  tokensCss: string,
  priorPages: PriorPageContext[] = [],
  userNote = "",
): string {
  const prior = priorPages
    .map(
      (entry) =>
        `--- Earlier screen "${entry.title}" (${entry.slug}.html) ---\n${excerptPageHtml(entry.html)}`,
    )
    .join("\n")
    .slice(0, 6000);
  return [
    `Write one self-contained HTML file: the "${page.title}" screen of the app below.`,
    `Project: "${projectName}". Idea: "${idea.slice(0, 400)}".`,
    brief ? `Product brief: """${brief.slice(0, 3000)}"""` : "",
    `This screen: ${page.brief || page.title}.`,
    userNote.trim() ? `User change request for this screen: "${userNote.trim().slice(0, 800)}". Apply it visibly.` : "",
    "",
    prior
      ? `Already generated screens this page must connect to (reuse the SAME header, nav, footer, and route names; link back and forth so nothing dangles):\n${prior}\n`
      : "",
    "The design system this screen must follow:",
    `"""${designMd.slice(0, 3000)}"""`,
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag, then reference every value via var(--*):",
    `${tokensCss.slice(0, 3000)}`,
    "",
    "Rules:",
    "- One file. All CSS in one <style> tag, all JS (if any) in one <script> tag.",
    "- No external requests: no CDN, no web fonts, no remote images. System fonts and inline SVG only.",
    "- Plain HTML, CSS, and JS only: no React, Vue, Svelte, Next.js, or any framework code — no import/export statements, no JSX, no components, no template directives.",
    "- The screen's core content is visible without scrolling past a hero.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Second chance after a blank render: demand visible content, same system. */
export function buildPageRepairPrompt(
  projectName: string,
  page: PlannedPage,
  designMd: string,
  tokensCss: string,
): string {
  return [
    `Your last output for the "${page.title}" screen rendered as a blank white page. Return ONLY the complete, corrected, self-contained HTML file for it.`,
    `Project: "${projectName}". This screen: ${page.brief || page.title}.`,
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag, then reference every value via var(--*):",
    `${tokensCss.slice(0, 3000)}`,
    "",
    "Non-negotiable fixes:",
    "- Real headline plus real paragraphs, buttons, or cards inside <body>, visible without scrolling.",
    "- No external requests, no web fonts, no remote images; system fonts and inline SVG only.",
    "- Plain HTML, CSS, and JS only: no React, Vue, Svelte, Next.js, or any framework code — no import/export statements, no JSX, no components, no template directives.",
    "- No empty <body>, no splash overlay that hides content, no JavaScript required to show the first paint.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ].join("\n");
}

/** Local fallback page plan when the model is offline: core flow screens. */
export function fallbackPagePlan(): PlannedPage[] {
  return [
    { slug: "home", title: "Home", brief: "The main screen with the core content and primary action." },
    { slug: "details", title: "Details", brief: "A detail view for one item with actions to keep or change it." },
    { slug: "settings", title: "Settings", brief: "Preferences and account controls in one quiet form." },
  ];
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "page";
}

/** File path for a generated page inside the project files. */
export function pageFilePath(slug: string): string {
  return `page-${slugify(slug)}.html`;
}

/**
 * Offline preview of a token block: a small component gallery with the
 * tokens injected, used in the wizard before the model draws anything.
 */
export function buildSamplePreviewHtml(
  tokensCss: string,
  projectName: string,
): string {
  const safe = (projectName.trim() || "Preview").replace(/[<>&"]/g, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safe} style preview</title>
<style>
${tokensCss}
body { margin: 0; padding: 28px; background: var(--bg); color: var(--fg); font-family: var(--font); }
.wrap { max-width: 560px; margin: 0 auto; }
h1 { font-size: 24px; margin: 0 0 4px; }
p.sub { color: var(--fg-2); margin: 0 0 20px; font-size: 14px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
.btn { border: 1px solid var(--border); background: var(--surface); color: var(--fg); border-radius: var(--radius); padding: 9px 16px; font-size: 14px; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-on); }
.card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 14px 16px; margin: 12px 0; }
.card b { display: block; margin-bottom: 4px; }
.card span { color: var(--fg-2); font-size: 13px; }
input { width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: var(--radius); padding: 9px 12px; font-size: 14px; background: var(--bg); color: var(--fg); }
.meta { color: var(--meta); font-size: 12px; margin-top: 16px; }
</style>
</head>
<body>
<div class="wrap">
<h1>${safe}</h1>
<p class="sub">Style preview rendered from the token block.</p>
<div class="row"><span class="btn primary">Primary action</span><span class="btn">Secondary</span></div>
<div class="card"><b>Card title</b><span>Quiet supporting copy in the secondary tone.</span></div>
<input placeholder="Input with a real label above it" aria-label="Sample input" />
<p class="meta">Metadata tone for timestamps and hints.</p>
</div>
</body>
</html>`;
}

/** The system the canvas renders: the saved choice, else the minimal template. */
export async function resolveProjectDesignSystem(project: {
  designSystem?: DesignSystemRef;
}): Promise<DesignSystemRef> {
  if (project.designSystem) return project.designSystem;
  try {
    const [designMd, tokensCss] = await Promise.all([
      fetch("/design-systems/minimal/DESIGN.md").then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.text();
      }),
      fetch("/design-systems/minimal/tokens.css").then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.text();
      }),
    ]);
    return { id: "minimal", name: "Minimal", designMd, tokensCss, source: "template" };
  } catch {
    return {
      id: "minimal",
      name: "Minimal",
      designMd: DEFAULT_DESIGN_MD,
      tokensCss: DEFAULT_TOKENS_CSS,
      source: "template",
    };
  }
}

/** Offline showcase: the token sample stands in until the model draws. */
export function buildSamplePreviewHtmlFallback(
  project: { name: string },
  system: DesignSystemRef,
): string {
  return buildSamplePreviewHtml(system.tokensCss || DEFAULT_TOKENS_CSS, project.name);
}
