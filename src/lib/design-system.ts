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
  /** Concrete blocks the screen shows, top to bottom. */
  sections?: string[];
  /** The single action this screen exists for. */
  primaryAction?: string;
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

/**
 * Distilled from the antislop skill plus the craft signals that make a
 * product screen read as designed instead of generated. Positive levers
 * first, bans second, so the model has something to build toward.
 */
export const ANTISLOP_DESIGN_RULES = [
  "Design bar: this must read like a senior product designer shipped it, not like a generated landing page.",
  "One focal point per screen: one element is clearly the most important and everything else defers to it.",
  "Composition varies: a calm grid, generous whitespace, and at least one asymmetry or oversized element. Never stack a centered title, subtitle, and identical cards.",
  "Type carries the hierarchy: a confident page title (32 to 48px, tight leading), 14 to 16px body, 12 to 13px metadata. Never all-caps tracked eyebrows.",
  "Two neutrals plus one accent from the tokens. The accent appears only on the primary action, the active nav item, and one focal detail.",
  "Flat surfaces with 1px hairline borders and the system radius. Shadow only on one floating layer such as a menu or dialog.",
  "Density: show 6 to 10 real rows, items, or cards so the screen feels used, not an empty demo.",
  "Inline SVG icons only, 16 to 18px, 1.5 stroke. No emoji, no icon-library look, no decorative arrow on every button.",
  "Every control does something visible: nav links point to a planned screen, tabs and accordions toggle, dialogs close with Escape, forms show validation. If it has no behavior, render it as text.",
  "Accessible by default: AA contrast, a visible :focus-visible ring, real labels on inputs, 44px tap targets on small screens.",
  "Motion is subtle: 120 to 200ms ease-out on hover and press only. No fade-up on every element, no parallax.",
  "Responsive: the layout still works at 390px wide with no horizontal overflow.",
].join("\n");

/** Brand fidelity: the model must never invent a name, tagline, or logo. */
function brandRules(projectName: string, logoUrl?: string): string {
  const name = projectName.trim() || "Untitled project";
  const lines = [
    `Brand: the product is called "${name}". Use that exact name in the title, header, and copy. Never invent a different brand name, tagline, mascot, or logo mark.`,
  ];
  if (logoUrl && logoUrl.length < 12000) {
    lines.push(
      `The product logo is this exact image, place it in the header as given: <img src="${logoUrl}" alt="${name} logo" />`,
    );
  } else {
    lines.push(
      "No logo file exists, so render the name as a plain text wordmark. Do not draw an invented logo, icon, or emblem.",
    );
  }
  return lines.join("\n");
}

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
    brandRules(projectName),
    "",
    "The design system to demonstrate:",
    `"""${designMd.slice(0, 5200)}"""`,
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag, then reference every value via var(--*):",
    `${tokensCss.slice(0, 4000)}`,
    "",
    "Page content (each in its own labeled section):",
    "- Header with the project name and one primary action.",
    "- Type scale sample, buttons (primary/secondary/disabled), inputs with labels, a card grid, a small table, badges, and a loading state.",
    "",
    "Rules:",
    "- One file. All CSS in one <style> tag, all JS (if any) in one <script> tag.",
    "- No external requests: no CDN, no web fonts, no remote images. System fonts and inline SVG only.",
    "- Plain HTML, CSS, and JS only: no React, Vue, Svelte, Next.js, or any framework code. No import or export statements, no JSX, no components, no template directives.",
    "- Real copy tied to the project, no lorem ipsum, no placeholders.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ].join("\n");
}

/** Second chance after a blank, hidden, or framework-code showcase. */
export function buildShowcaseRepairPrompt(
  projectName: string,
  idea: string,
  designMd: string,
  tokensCss: string,
): string {
  return [
    `Your last showcase output for "${projectName.trim() || "Untitled project"}" failed: it rendered blank, hid its content, or returned framework code instead of plain HTML. Return the complete corrected file now.`,
    "",
    `Project: "${projectName}". Idea: "${idea.slice(0, 400)}".`,
    brandRules(projectName),
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag:",
    `${tokensCss.slice(0, 4000)}`,
    "",
    "Design system to demonstrate:",
    `"""${designMd.slice(0, 5200)}"""`,
    "",
    "Non-negotiable fixes:",
    "- Start with <!DOCTYPE html>, include <html>, <head>, and a <body> that already holds the visible showcase.",
    "- Header with the project name and one primary action, then labeled sections: type scale, buttons, inputs with labels, card grid, table, badges, loading state.",
    "- Real copy tied to the project. No lorem ipsum, no TODO, no placeholders.",
    "- Plain HTML, CSS, and JS only. No React, Vue, Svelte, Next.js, no imports, no JSX, no components.",
    "- No external requests, no web fonts, no remote images; system fonts and inline SVG only.",
    "- No opacity:0, no visibility:hidden, no display:none on body or main, no splash overlay, no JavaScript needed for the first paint.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ].join("\n");
}

/** Keep the App Flow parts that name screens and routes, not the diagram. */
function appFlowExcerpt(appFlow: string, maxChars = 3400): string {
  if (!appFlow.trim()) return "";
  const chunks = ["Flow overview", "Screen-by-screen flow", "Navigation map"]
    .map(
      (heading) =>
        appFlow.match(
          new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|$)`, "i"),
        )?.[0] ?? "",
    )
    .filter(Boolean);
  const text = chunks.length ? chunks.join("\n\n") : appFlow;
  return text.slice(0, maxChars);
}

/**
 * Ask the model which screens the documents imply, in build order. The
 * App Flow doc is the source of truth for screen names and jobs; the PRD
 * supplies the domain content. Marketing pages are never planned.
 */
export function buildPagePlanPrompt(
  projectName: string,
  idea: string,
  brief: string,
  appFlow = "",
): string {
  return [
    "You plan the screens of a first-version application prototype from its documents.",
    `Project: "${projectName}". Idea: "${idea.slice(0, 400)}".`,
    `PRD: """${brief.slice(0, 3600)}"""`,
    appFlow.trim()
      ? `App Flow doc (screen table and navigation map): """${appFlowExcerpt(appFlow)}"""`
      : "",
    "",
    'Return ONLY a JSON object, no fences, no commentary: {"pages":[{"slug":"home","title":"Home","brief":"one sentence on the screen job","sections":["block","block","block"],"primaryAction":"the one action"}]}',
    "",
    "Rules:",
    "- These are application screens, not marketing pages. Never plan a landing page with hero, features, pricing, testimonials, FAQ, or waitlist.",
    "- Use the screens named in the App Flow doc when it has them; otherwise plan 3 to 6 screens that deliver the core flow.",
    "- Order them the way they are built and used: entry screen first, then the main working screen, then detail, create, and settings.",
    "- slug is lowercase kebab-case and becomes the route (page-<slug>.html). title is a short screen name.",
    "- brief is one concrete sentence naming the real content on the screen, never repeating the title.",
    "- sections are 3 to 5 short labels for the blocks the screen shows, top to bottom (for example: 'Search and filters', 'Today items', 'Empty state').",
    "- primaryAction is the one action the screen exists for, in the product's words.",
    "- No screen may repeat another screen's job.",
  ]
    .filter(Boolean)
    .join("\n");
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
      pages?: Array<{
        slug?: unknown;
        title?: unknown;
        brief?: unknown;
        sections?: unknown;
        primaryAction?: unknown;
      }>;
    };
    const pages = (data.pages ?? [])
      .map((entry) => {
        const sections = Array.isArray(entry.sections)
          ? entry.sections
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim().slice(0, 70))
              .filter(Boolean)
              .slice(0, 5)
          : undefined;
        const primaryAction =
          typeof entry.primaryAction === "string"
            ? entry.primaryAction.trim().slice(0, 70)
            : undefined;
        return {
          slug: slugify(typeof entry.slug === "string" ? entry.slug : ""),
          title: (typeof entry.title === "string" ? entry.title : "")
            .trim()
            .slice(0, 60),
          brief: (typeof entry.brief === "string" ? entry.brief : "")
            .trim()
            .slice(0, 200),
          ...(sections?.length ? { sections } : {}),
          ...(primaryAction ? { primaryAction } : {}),
        };
      })
      .filter((entry) => entry.slug && entry.title);
    if (!pages.length) return null;
    // Two planned screens must never share a file. Keep the first title and
    // give later collisions a deterministic suffix instead of overwriting.
    const used = new Set<string>();
    const unique = pages.map((entry) => {
      let slug = entry.slug;
      let suffix = 2;
      while (used.has(slug)) {
        slug = slugify(`${entry.slug}-${suffix}`);
        suffix += 1;
      }
      used.add(slug);
      return slug === entry.slug ? entry : { ...entry, slug };
    });
    return unique.slice(0, 8);
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

/** Everything one page generation needs, in one object. */
export interface PagePromptContext {
  projectName: string;
  idea: string;
  prd: string;
  appFlow?: string;
  page: PlannedPage;
  designMd: string;
  tokensCss: string;
  /** Full plan, so nav routes stay identical across screens. */
  plan?: PlannedPage[];
  priorPages?: PriorPageContext[];
  userNote?: string;
  logoUrl?: string;
  /** Current HTML for a chat-requested edit; absent when drawing fresh. */
  existingHtml?: string;
}

/** Shrink generated HTML to its structural shell: head, header, nav, headings. */
function excerptPageHtml(html: string, maxChars = 1800): string {
  const head = html.match(/<head[\s>][\s\S]*?<\/head\s*>/i)?.[0] ?? "";
  const body = html.match(/<body[\s>][\s\S]*$/i)?.[0] ?? html;
  const shell = (head + "\n" + body)
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");
  const text = shell.replace(/\s+/g, " ").trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

/** Pull the App Flow rows and table that describe this screen. */
function screenSpec(appFlow: string, page: PlannedPage): string {
  if (!appFlow.trim()) return "";
  const needles = [page.title, page.slug.replace(/-/g, " ")]
    .map((needle) => needle.toLowerCase().trim())
    .filter((needle) => needle.length > 2);
  const rows = appFlow
    .split("\n")
    .filter((line) =>
      needles.some((needle) => line.toLowerCase().includes(needle)),
    )
    .slice(0, 6)
    .join("\n");
  const flow =
    appFlow.match(/##\s*Screen-by-screen flow[\s\S]*?(?=\n##\s|$)/i)?.[0] ?? "";
  return [rows, flow.slice(0, 1800)]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2400);
}

/** One stable route list so every screen ships the same navigation. */
function routeList(plan: PlannedPage[] | undefined): string {
  if (!plan?.length) return "";
  return plan
    .map((entry) => `${entry.title} -> ${pageFilePath(entry.slug)}`)
    .join("; ");
}

export function buildPagePrompt(context: PagePromptContext): string {
  const { page } = context;
  const sections = (page.sections ?? []).filter(Boolean);
  const spec = screenSpec(context.appFlow ?? "", page);
  const routes = routeList(context.plan);
  const prior = (context.priorPages ?? [])
    .map(
      (entry) =>
        `--- Earlier screen "${entry.title}" (${pageFilePath(entry.slug)}) ---\n${excerptPageHtml(entry.html)}`,
    )
    .join("\n")
    .slice(0, 5200);
  const editing = Boolean(context.existingHtml?.trim());
  const currentHtml = editing
    ? context.existingHtml!.replace(/\s+/g, " ").trim().slice(0, 9000)
    : "";
  return [
    "You are a senior product designer and front-end engineer. Build one real application screen as a single self-contained HTML file.",
    "",
    "PRODUCT",
    `Name: "${context.projectName.trim() || "Untitled project"}" (use it exactly).`,
    `Idea: "${context.idea.replace(/\s+/g, " ").trim().slice(0, 400)}".`,
    context.prd.trim()
      ? `PRD: """${context.prd.replace(/\s+/g, " ").trim().slice(0, 3200)}"""`
      : "",
    spec ? `App Flow detail for this screen:\n${spec}` : "",
    brandRules(context.projectName, context.logoUrl),
    "",
    "THIS SCREEN",
    `Title: "${page.title}". Route: ${pageFilePath(page.slug)}.`,
    `Job: ${page.brief || page.title}.`,
    sections.length
      ? `Blocks it must show, top to bottom: ${sections.join(" / ")}.`
      : "",
    page.primaryAction ? `Primary action: "${page.primaryAction}".` : "",
    context.userNote?.trim()
      ? `User change request for this screen: "${context.userNote.trim().slice(0, 800)}". Apply it visibly and keep everything else consistent.`
      : "",
    editing
      ? `EDIT MODE: the current page HTML is below. Make a surgical change to the annotated component only. Preserve all unrelated structure, copy, styles, and behavior exactly; do not redesign the page, rename routes, or drop content.`
      : "",
    editing ? `Current page HTML to edit:\n"""${currentHtml}"""` : "",
    "",
    "THIS IS AN APP SCREEN, NOT A LANDING PAGE",
    "- Render the working product surface: app chrome (wordmark, navigation, account), the screen's real content, and its primary action.",
    "- Do not add marketing sections (hero headline, feature grid, testimonials, pricing, FAQ, trusted-by, waitlist) unless the screen job explicitly asks for them.",
    "- Content starts immediately and fills a 960x640 desktop frame. Do not push the useful content below a decorative hero.",
    "- Every block in the list above must be visible, with its own heading and real content. Missing a block is a failure.",
    "- The block labels are an internal outline. Never print them verbatim; write natural product headings in the product's voice, or let the UI speak for itself.",
    "- Keep the app header compact (64px or less) and the first working region visible inside the first 640px. Use 24 to 32px section gaps, not 100px marketing spacing.",
    "- Show 6 to 10 specific items drawn from the product domain in the PRD, with real labels, statuses, and actions. A screen that is more than a third empty whitespace is a failure.",
    "- Never invent people, personal names, avatars, member counts, ratings, prices, reviews, or statistics. Use neutral roles (You, Owner, Member) and only the data the documents give you.",
    "- A short factual line from the screen job is enough. Never write a marketing tagline or slogan.",
    "",
    routes ? `NAVIGATION\nAll screens in this app: ${routes}.` : "",
    routes
      ? "Reuse one identical header, nav, footer, spacing rhythm, and component styling on every screen. Mark this screen with aria-current=\"page\". Only link to routes in that list, never add Features, Pricing, About, Contact, or Blog links that have no screen."
      : "",
    "",
    prior
      ? `EARLIER SCREENS THIS ONE MUST CONNECT TO\n${prior}\nKeep the same wordmark, nav labels, header height, footer, and component styles. This screen is the next step in that flow.\n`
      : "",
    "DESIGN SYSTEM",
    "Follow this DESIGN.md. It is the direction, not a suggestion:",
    `"""${context.designMd.slice(0, 5200)}"""`,
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag, then reference every value via var(--*). Never hardcode a hex value that exists as a token:",
    `${context.tokensCss.slice(0, 4200)}`,
    "",
    ANTISLOP_DESIGN_RULES,
    "",
    "HARD RULES",
    "- One file: <!DOCTYPE html>, <html>, <head>, one <style>, one <body>. Never return a fragment, a plan, or commentary.",
    "- Plain HTML, CSS, and JS only. No React, Vue, Svelte, Next.js, or framework code: no import or export statements, no JSX, no components, no template directives, no className.",
    "- No external requests: no CDN, no web fonts, no remote images, no @import. System font stacks and inline SVG only.",
    "- Visible on first paint: real content inside <body>, no opacity:0, no visibility:hidden, no display:none on the body or main, no splash overlay, no JavaScript required to show the screen.",
    "- Text contrast meets AA. Inputs have visible labels. Focus states are visible. No horizontal overflow at 390px.",
    "- No em dashes, no lorem ipsum, no TODO, no bracketed placeholders, no emoji as icons.",
    "- Use the exact project name. Never invent a different brand, logo, or tagline.",
    "- Return ONLY the HTML, no fences or commentary.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Second chance after a blank, hidden, or framework-code render. */
export function buildPageRepairPrompt(context: PagePromptContext): string {
  const { page } = context;
  const sections = (page.sections ?? []).filter(Boolean);
  const editing = Boolean(context.existingHtml?.trim());
  return [
    `Your last output for the "${page.title}" screen failed: it rendered blank, hid its content, or returned framework code instead of plain HTML. Return the complete corrected file now.`,
    "",
    `Project name: "${context.projectName.trim() || "Untitled project"}" (use it exactly).`,
    `Screen job: ${page.brief || page.title}.`,
    sections.length ? `Blocks it must show: ${sections.join(" / ")}.` : "",
    page.primaryAction ? `Primary action: "${page.primaryAction}".` : "",
    context.userNote?.trim()
      ? `User change request to preserve: "${context.userNote.trim().slice(0, 800)}".`
      : "",
    editing
      ? `EDIT MODE: change only the annotated component. Preserve all unrelated structure, copy, styles, and behavior from the current page HTML below.`
      : "",
    editing
      ? `Current page HTML:\n"""${context.existingHtml!.replace(/\s+/g, " ").trim().slice(0, 9000)}"""`
      : "",
    brandRules(context.projectName, context.logoUrl),
    "",
    "Paste this token block verbatim as the FIRST thing in the single <style> tag:",
    `${context.tokensCss.slice(0, 4200)}`,
    "",
    "Non-negotiable fixes:",
    "- Start with <!DOCTYPE html>, include <html>, <head>, and a <body> that already holds the visible screen.",
    "- Real page title, app header, nav, and 6 or more content items inside <body>, visible without scrolling.",
    "- Every block listed above appears with its own heading and content. A mostly empty screen is a failure.",
    "- Never print the block labels verbatim as headings; write natural product headings.",
    "- No opacity:0, no visibility:hidden, no display:none on body or main, no splash overlay, no JavaScript needed for the first paint.",
    "- Plain HTML, CSS, and JS only. No React, Vue, Svelte, Next.js, no imports, no JSX, no components.",
    "- No external requests, no web fonts, no remote images; system fonts and inline SVG only.",
    "- No em dashes, no lorem ipsum, no TODO, no invented brand or logo.",
    ANTISLOP_DESIGN_RULES,
    "- Return ONLY the HTML, no fences or commentary.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Local last resort: a real, on-brand screen built from the tokens and the
 * plan. Used only when two model attempts both fail, so a frame never
 * renders as a blank white page.
 */
export function buildFallbackPageHtml(context: PagePromptContext): string {
  const esc = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const name = esc(context.projectName.trim() || "Untitled project");
  const title = esc(context.page.title);
  const brief = esc(context.page.brief || "The core content for this screen.");
  const blocks = (context.page.sections ?? [])
    .filter(Boolean)
    .slice(0, 4)
    .map(esc);
  const action = context.page.primaryAction?.trim()
    ? esc(context.page.primaryAction)
    : "";
  const nav = (context.plan ?? [])
    .slice(0, 5)
    .map(
      (entry) =>
        `<a href="${pageFilePath(entry.slug)}"${entry.slug === context.page.slug ? ' aria-current="page"' : ""}>${esc(entry.title)}</a>`,
    )
    .join("");
  const cards = blocks.length
    ? blocks
        .map(
          (block, index) =>
            `<article class="card"><p class="meta">Section ${index + 1}</p><h2>${block}</h2></article>`,
        )
        .join("")
    : `<div class="empty"><h2>Starter preview</h2><p>This screen follows the page summary above. Use Ask Muse in the workspace chat to describe the real content and actions it should show.</p></div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name} - ${title}</title>
<style>
:root {
  --bg: #ffffff; --fg: #111827; --fg-2: #4b5563; --meta: #6b7280;
  --accent: #111111; --accent-on: #ffffff; --surface: #f6f7f9;
  --border: #e5e7eb; --radius: 10px;
  --font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
${context.tokensCss || ""}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 15px; line-height: 1.5; }
.shell { min-height: 100vh; display: flex; flex-direction: column; }
header { display: flex; align-items: center; gap: 24px; padding: 14px 28px; border-bottom: 1px solid var(--border); }
.brand { font-weight: 650; letter-spacing: -0.01em; }
nav { display: flex; gap: 18px; margin-left: 8px; }
nav a { color: var(--fg-2); text-decoration: none; font-size: 14px; padding: 6px 0; border-bottom: 2px solid transparent; }
nav a[aria-current="page"] { color: var(--fg); border-color: var(--accent); }
.spacer { flex: 1; }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: grid; place-items: center; font-size: 11px; color: var(--fg-2); }
main { padding: 28px; }
main > section { max-width: 960px; margin: 0 auto; }
h1 { font-size: 30px; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6px; }
.copy { color: var(--fg-2); margin: 0 0 20px; max-width: 52ch; }
.btn { display: inline-flex; align-items: center; height: 38px; padding: 0 16px; border-radius: var(--radius); border: 1px solid var(--accent); background: var(--accent); color: var(--accent-on); font: inherit; font-size: 14px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; margin: 20px 0; }
.card { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; background: var(--bg); }
.card h2 { font-size: 15px; margin: 4px 0 6px; }
.meta { margin: 0; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--meta); }
.empty { margin-top: 20px; border: 1px dashed var(--border); border-radius: var(--radius); padding: 20px; background: var(--surface); }
.empty h2 { margin: 0 0 6px; font-size: 16px; }
.empty p { max-width: 54ch; margin: 0; color: var(--fg-2); }
@media (max-width: 760px) { main { padding: 18px; } header { padding: 12px 18px; gap: 12px; } .grid { grid-template-columns: 1fr; } nav { display: none; } }
</style>
</head>
<body>
<div class="shell">
<header><span class="brand">${name}</span><nav>${nav}</nav><span class="spacer"></span><span class="avatar">${esc(name.slice(0, 2).toUpperCase())}</span></header>
<main>
<section>
<p class="meta">${title}</p>
<h1>${title}</h1>
<p class="copy">${brief}</p>
${action ? `<button class="btn" type="button">${action}</button>` : ""}
<div class="grid">${cards}</div>
</section>
</main>
</div>
</body>
</html>`;
}

/** Local fallback page plan when the model is offline: core flow screens. */
export function fallbackPagePlan(): PlannedPage[] {
  return [
    { slug: "overview", title: "Overview", brief: "See what needs attention and open the app's main action." },
    { slug: "items", title: "Items", brief: "Search, add, and update the core records this app manages." },
    { slug: "settings", title: "Settings", brief: "Change this app's preferences and account options." },
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

export type PrototypeHrefKind = "fragment" | "external" | "empty" | "candidate";

export interface PrototypeHrefTarget {
  kind: PrototypeHrefKind;
  /** Basename candidate like "page-settings.html" when kind is "candidate". */
  candidate?: string;
}

const PROTOTYPE_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Classify a raw anchor href from generated prototype HTML without touching
 * the network. Fragments stay in-page, schemes and protocol-relative URLs
 * are external, and everything else reduces to a basename candidate whose
 * query and hash are stripped. Basenames are matched exactly (no substring
 * or prefix matching) so slugs like "settings" and "settings-advanced"
 * never collide.
 */
export function classifyPrototypeHref(href: unknown): PrototypeHrefTarget {
  if (typeof href !== "string") return { kind: "empty" };
  const trimmed = href.trim();
  if (!trimmed) return { kind: "empty" };
  if (trimmed.startsWith("#")) return { kind: "fragment" };
  if (trimmed.startsWith("//")) return { kind: "external" };
  if (PROTOTYPE_SCHEME_RE.test(trimmed)) return { kind: "external" };
  const withoutHash = trimmed.split("#", 1)[0] ?? "";
  const withoutQuery = withoutHash.split("?", 1)[0] ?? "";
  const path = withoutQuery.trim();
  if (!path) return { kind: "empty" };
  const lastSlash = path.lastIndexOf("/");
  let base = (lastSlash >= 0 ? path.slice(lastSlash + 1) : path).trim();
  if (!base || base === "." || base === "..") return { kind: "empty" };
  try {
    base = decodeURIComponent(base);
  } catch {
    // Keep the raw basename when it is not valid percent-encoding.
  }
  if (!base) return { kind: "empty" };
  return { kind: "candidate", candidate: base };
}

/**
 * Resolve a prototype anchor href to an existing frame id. Returns the
 * exact frame id on match, otherwise null. Only exact basename equality
 * counts, plus the extensionless form of the same basename
 * ("page-settings" -> "page-settings.html"). Never infers a "page-"
 * prefix, so "settings.html" does not match "page-settings.html".
 */
export function resolvePrototypeFrameId(
  href: string,
  frameIds: ReadonlySet<string> | readonly string[],
): string | null {
  const target = classifyPrototypeHref(href);
  if (target.kind !== "candidate" || !target.candidate) return null;
  const set = frameIds instanceof Set ? frameIds : new Set(frameIds);
  if (set.has(target.candidate)) return target.candidate;
  if (
    !target.candidate.includes(".") &&
    set.has(`${target.candidate}.html`)
  ) {
    return `${target.candidate}.html`;
  }
  return null;
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

/** True when a token block can actually theme a page. */
export function hasDesignTokens(tokensCss: string | undefined): boolean {
  return Boolean(tokensCss && /--(?:bg|fg|accent)\s*:/.test(tokensCss));
}

/**
 * The system the canvas renders: the saved choice, else the template by
 * id. A saved system with an empty token block is repaired from its
 * template, so a page never renders unthemed and the model never has to
 * invent colors.
 */
export async function resolveProjectDesignSystem(project: {
  designSystem?: DesignSystemRef;
}): Promise<DesignSystemRef> {
  const saved = project.designSystem;
  if (saved && hasDesignTokens(saved.tokensCss)) return saved;
  const id =
    saved?.source === "template" && saved.id ? saved.id : "minimal";
  const savedMd =
    saved?.designMd && saved.designMd.trim().length > 40
      ? saved.designMd
      : "";
  try {
    const [designMd, tokensCss] = await Promise.all([
      fetch(`/design-systems/${id}/DESIGN.md`).then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.text();
      }),
      fetch(`/design-systems/${id}/tokens.css`).then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.text();
      }),
    ]);
    return {
      id,
      name: saved?.name ?? "Minimal",
      designMd: savedMd || designMd,
      tokensCss: hasDesignTokens(tokensCss) ? tokensCss : DEFAULT_TOKENS_CSS,
      source: saved?.source ?? "template",
    };
  } catch {
    return {
      id,
      name: saved?.name ?? "Minimal",
      designMd: savedMd || DEFAULT_DESIGN_MD,
      tokensCss: hasDesignTokens(saved?.tokensCss)
        ? (saved as DesignSystemRef).tokensCss
        : DEFAULT_TOKENS_CSS,
      source: saved?.source ?? "template",
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
