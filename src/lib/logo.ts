/**
 * Project logo helpers. The wizard offers three paths: describe a symbol mark
 * and let the model draw it (vector first), upload an existing file, or skip
 * and keep an initials badge. Generated output is always a symbol mark, never
 * a wordmark, mockup, or full logo lockup: the project name stays separate
 * as text. Skipping is honest: initials render as a placeholder instead of a
 * fabricated mark.
 */

export type LogoStatus = "idle" | "loading" | "ready" | "error";
export type LogoOrigin = "ai" | "upload" | null;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const LOGO_SIZE = 256;

/** Compact product context forwarded into logo prompts. */
export interface LogoBriefContext {
  /** The core workflow the mark should evoke, in the user's words. */
  coreWorkflow?: string;
  /** Who the product is for, in the user's words. */
  audience?: string;
  /** Visual direction from the questionnaire or design step. */
  visualDirection?: string;
  /** Hex or named colors from the selected design-system palette. */
  palette?: string[];
}

/** One-line summary of product context for logo prompts, bounded. */
export function buildLogoContextSummary(context: LogoBriefContext): string {
  const bits: string[] = [];
  if (context.audience?.trim()) {
    bits.push(`Audience: ${context.audience.replace(/\s+/g, " ").trim().slice(0, 160)}`);
  }
  if (context.coreWorkflow?.trim()) {
    bits.push(`Core workflow: ${context.coreWorkflow.replace(/\s+/g, " ").trim().slice(0, 200)}`);
  }
  if (context.visualDirection?.trim()) {
    bits.push(`Visual direction: ${context.visualDirection.replace(/\s+/g, " ").trim().slice(0, 160)}`);
  }
  if (context.palette?.length) {
    bits.push(`Palette: ${context.palette.slice(0, 4).join(", ")}`);
  }
  return bits.join(" | ").slice(0, 600);
}

/**
 * Sensible starting direction so novices can generate without inventing a
 * prompt. The caller may prefill the textarea with this; user-written text
 * always takes precedence at generation time.
 */
export function suggestLogoBrief(
  projectName: string,
  idea: string,
  coreWorkflow?: string,
): string {
  const workflow = coreWorkflow?.replace(/\s+/g, " ").trim().slice(0, 120);
  const fallbackIdea = idea.replace(/\s+/g, " ").trim().slice(0, 120);
  const subject = workflow || fallbackIdea || projectName.trim() || "the app";
  return `A minimal geometric symbol for ${subject}: one solid abstract motif, high contrast, centered with breathing room`;
}

/** Pull up to 4 paint colors out of a tokens.css block for logo prompts. */
export function paletteFromTokensCss(tokensCss: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const pattern = /--(?:accent|bg|surface|fg|primary|background)\s*:\s*([^;\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tokensCss)) !== null && found.length < 4) {
    const value = match[1].trim();
    if (!/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()|(white|black)/i.test(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(value);
  }
  return found;
}

/** First letters of the first two words, uppercased. "Habit Tracker" -> "HT". */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || "?";
}

/**
 * The brief sent to the image model. It names the product so the mark stays
 * specific, then constrains the style against generic AI-logo tropes: no
 * gradients, glow, 3D, or sparkle/star/lightning/robot filler icons. Output
 * is a single symbol mark (PNG concept), never a wordmark, mockup, or lockup.
 */
export function buildLogoPrompt(
  description: string,
  projectName: string,
  idea: string,
  context?: LogoBriefContext,
): string {
  const trimmed = description.replace(/\s+/g, " ").trim().slice(0, 500);
  const contextText = idea.replace(/\s+/g, " ").trim().slice(0, 200);
  const summary = context ? buildLogoContextSummary(context) : "";

  return [
    `Design a single symbol mark (not a wordmark, lockup, or mockup) for an app called "${projectName}". The project name stays separate as text; never render it in the mark.`,
    contextText ? `The app does this: "${contextText}".` : "",
    summary ? `Product context: ${summary}.` : "",
    `The user describes the mark they want as: "${trimmed}". Honor any explicit colors they named; otherwise default to a restrained high-contrast palette (near-black on transparent, or one accent plus near-black).`,
    "",
    "Style rules (follow all of them):",
    "- A flat minimal symbol mark: one simple abstract motif tied to the app's core workflow above, not a generic icon.",
    "- At most two solid colors on a transparent background. No gradients, no glow, no shadows, no 3D, no photorealism, no mockup scene.",
    "- No invented wordmark, letters, or text in the mark unless the user explicitly asked for letters.",
    "- No generic filler or industry cliches: no sparkle, star, lightning bolt, robot, cube, diamond, magic wand, checkmark badge, chat bubble, or house icon unless the product literally is that thing.",
    "- Geometric and neat: a clean transparent symbol, centered with breathing room, legible at 16 pixels and suitable as a standalone app icon.",
    "- Square composition, the mark occupying roughly 60% of the canvas.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Read an image file, downscale it to a square, and return a PNG data URL. */
export async function fileToLogoDataUrl(file: File): Promise<string> {  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image. Pick a PNG, JPG, SVG, or WebP file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is over 5 MB. Pick a smaller file.");
  }
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = LOGO_SIZE;
  canvas.height = LOGO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process images.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    LOGO_SIZE,
    LOGO_SIZE,
  );
  bitmap.close();
  return canvas.toDataURL("image/png");
}

/**
 * Remove a near-solid backdrop from a logo image, in the browser.
 * Image models cannot emit transparency, so generated marks arrive on a
 * solid field. This flood-fills from every edge with the corner color and a
 * small tolerance, then feathers the cut by one pixel. Photos and
 * multi-color scenes are left mostly intact because the fill only spreads
 * through connected near-background pixels; callers keep the original when
 * too little (under 4%) or almost everything (over 92%) would go.
 */
export async function removeLogoBackground(
  dataUrl: string,
  tolerance = 30,
): Promise<{ image: string; removedRatio: number }> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return { image: dataUrl, removedRatio: 0 };
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  const width = canvas.width;
  const height = canvas.height;
  const corner = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // The backdrop is whatever the corners agree on; a split vote means the
  // image likely has no clean backdrop to cut.
  const votes = [corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1)];
  const near = (a: number[], b: number[]) =>
    Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tolerance * 2;
  const agreeing = votes.filter((vote) => near(vote, votes[0])).length;
  const bg: number[] = agreeing >= 3 ? votes[0] : [255, 255, 255];

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const i = index * 4;
    const distance =
      Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
    if (distance > tolerance * 2.4) return;
    visited[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  let removed = 0;
  while (stack.length) {
    const index = stack.pop() as number;
    const i = index * 4;
    data[i + 3] = 0;
    removed += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  const removedRatio = removed / (width * height);
  if (removedRatio < 0.04 || removedRatio > 0.92) return { image: dataUrl, removedRatio };
  ctx.putImageData(frame, 0, 0);
  return { image: canvas.toDataURL("image/png"), removedRatio };
}

/** Logo image format. PNG comes from the image model, SVG from the text model. */
export type LogoFormat = "png" | "svg";

export interface LogoSvgVariant {
  svg: string;
  rationale: string;
}

/** Keep only a short trail of replaced marks; data URLs add up in storage. */
export const MAX_LOGO_HISTORY = 6;

/**
 * The brief sent to the text model for vector marks. Distilled from the
 * logo-generator skill (geometric primitives, viewBox 0 0 100 100,
 * currentColor, no backdrop) plus the antislop bans: flat fills, no
 * gradients, no generic filler icons, no text unless asked.
 *
 * The user description takes precedence over the product context summary;
 * the summary only grounds the motif in the app's core workflow and palette.
 * The description is repeated as numbered hard requirements with a
 * self-check, because a bare style brief lets the model drift into
 * generic marks that ignore what the user actually asked for.
 */
export function buildLogoSvgPrompt(
  description: string,
  projectName: string,
  idea: string,
  context?: LogoBriefContext,
): string {
  const trimmed = description.replace(/\s+/g, " ").trim().slice(0, 500);
  const contextText = idea.replace(/\s+/g, " ").trim().slice(0, 200);
  const summary = context ? buildLogoContextSummary(context) : "";

  return [
    `Design 3 genuinely different symbol-mark concepts (not wordmarks, lockups, or mockups) for an app called "${projectName}". The project name stays separate as text; never render it in the marks.`,
    contextText ? `The app does this: "${contextText}".` : "",
    summary ? `Product context (ground the motifs here; the user description below wins on conflicts): ${summary}.` : "",
    "",
    "Hard requirements from the user (every variant must satisfy all of them):",
    `R1 motif: "${trimmed}". Build the mark around exactly what this says; it takes precedence over the product context.`,
    "R2 palette: honor the exact colors the user named, translated to close hex values (deep green ~ #166534, forest ~ #14532d, navy ~ #1e3a8a, sky ~ #0284c7, amber ~ #d97706, terracotta ~ #c2410c, plum ~ #7e22ce, charcoal ~ #1f2937). When the user named no colors, default to a restrained high-contrast palette: currentColor plus at most one fixed hex (near-black #1f2937 or the product accent). At most two solid fills total.",
    "R3 construction: one dominant motif filling ~60% of the 100x100 canvas, centered with breathing room, a clean transparent symbol legible at 16 pixels and suitable as a standalone app icon.",
    "",
    "Return ONLY a JSON object with this shape, no fences, no commentary:",
    '{"variants":[{"svg":"<svg viewBox=\\"0 0 100 100\\">...</svg>","rationale":"one sentence"}]}',
    "",
    "Rules for every variant:",
    "- One <svg> with a square viewBox (exactly \"0 0 100 100\"), no width or height attributes.",
    "- Transparent by construction: never draw a background rect or page fill.",
    "- Geometric primitives (circle, rect, polygon, path, ellipse) grouped in <g>; flat fills only.",
    "- No text, letters, wordmark, or mockup unless the user explicitly asked for letters.",
    "- No gradients, glow, shadows, filters, scripts, event handlers, animations, or external references.",
    "- No generic filler or industry cliches: no sparkle, star, lightning bolt, robot, cube, diamond, magic wand, checkmark badge, chat bubble, or house icon unless the product literally is that thing.",
    "- Valid XML that parses on its own. The three variants must be genuinely different directions (different motif/geometry), not parameter tweaks, each with a one-sentence rationale naming which part of R1 it answers.",
    "",
    "Self-check before returning: re-read R1-R3 for each variant and drop any variant that misses one. Each rationale must name which part of the description it answers.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Lightweight quality gate for a sanitized logo mark. */
export function validateLogoMark(svg: string): { ok: boolean; reason?: string } {
  const text = svg.trim();
  if (!text) return { ok: false, reason: "empty" };
  const open = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  if (!open) return { ok: false, reason: "missing svg tag" };
  const viewBox = open.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
  const parts = viewBox.split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return { ok: false, reason: "missing square viewBox" };
  }
  const [, , w, h] = parts;
  if (!(w > 0 && h > 0 && Math.abs(w - h) < 0.001)) {
    return { ok: false, reason: "viewBox is not square" };
  }
  const lowered = text.toLowerCase();
  // Unsafe or non-symbol content: text/wordmarks, rasters, scripts,
  // filters/gradients, animations, and external references.
  const banned = [
    "<text",
    "<image",
    "<script",
    "<foreignobject",
    "<iframe",
    "<embed",
    "<object",
    "<filter",
    "<lineargradient",
    "<radialgradient",
    "<pattern",
    "<animate",
    "<set",
    "javascript:",
    "<fe",
  ];
  for (const token of banned) {
    if (lowered.includes(token)) return { ok: false, reason: `banned element ${token}` };
  }
  if (/\son[a-z]+\s*=/i.test(text)) return { ok: false, reason: "event handler" };
  if (/url\s*\(/i.test(text)) return { ok: false, reason: "paint-server reference" };
  // External hrefs (anything but a same-document #fragment) are unsafe.
  const hrefs = [...text.matchAll(/(?:href|xlink:href)\s*=\s*("[^"]*"|'[^']*')/gi)];
  for (const match of hrefs) {
    const url = match[1].slice(1, -1).trim();
    if (url && !url.startsWith("#")) return { ok: false, reason: "external reference" };
  }
  // Full-canvas background rects defeat transparency: a rect covering the
  // whole viewBox with a solid fill is a page fill, not a mark.
  const bgRect =
    /<rect\b[^>]*>/gi;
  let rectMatch: RegExpExecArray | null;
  while ((rectMatch = bgRect.exec(text)) !== null) {
    const tag = rectMatch[0];
    const get = (name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "";
    const x = parseFloat(get("x") || "0");
    const y = parseFloat(get("y") || "0");
    const rw = get("width");
    const rh = get("height");
    const fill = (get("fill") || "").toLowerCase();
    const covers =
      (rw === "100" || rw === "100%" || rw === `${w}`) &&
      (rh === "100" || rh === "100%" || rh === `${h}`) &&
      (Number.isNaN(x) || x <= 0) &&
      (Number.isNaN(y) || y <= 0);
    if (covers && fill && fill !== "none" && fill !== "transparent") {
      return { ok: false, reason: "full-canvas background" };
    }
  }
  // A real mark needs at least one vector shape; plain groups or empty svg
  // are blank marks.
  const shapes = text.match(/<(circle|rect|polygon|path|ellipse|line|polyline)\b/gi) ?? [];
  if (!shapes.length) return { ok: false, reason: "no vector shapes" };
  if (text.length < 80) return { ok: false, reason: "blank mark" };
  return { ok: true };
}

/** True when a sanitized SVG passes the lightweight mark quality gate. */
export function isValidLogoMark(svg: string): boolean {
  return validateLogoMark(svg).ok;
}

/** Collapse byte/whitespace-equivalent duplicates, keeping the first copy. */
export function dedupeLogoSvgVariants(variants: LogoSvgVariant[]): LogoSvgVariant[] {
  const seen = new Set<string>();
  const unique: LogoSvgVariant[] = [];
  for (const variant of variants) {
    const key = variant.svg.replace(/\s+/g, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(variant);
  }
  return unique;
}

/** Pull variant SVGs out of a model response; falls back to raw svg blocks. */
export function parseLogoSvgVariants(raw: unknown): LogoSvgVariant[] {
  if (typeof raw !== "string") return [];
  let text = raw.trim();
  if (!text) return [];
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\s*```/i);
  if (fenced) text = fenced[1].trim();
  const collect = (svg: string, rationale: string): LogoSvgVariant | null => {
    const clean = sanitizeLogoSvg(svg);
    if (!clean) return null;
    // Quality gate after sanitization: drop unsafe, blank, background-filled,
    // or non-square marks without rejecting valid simple marks.
    if (!isValidLogoMark(clean)) return null;
    return {
      svg: clean,
      rationale: rationale.trim().slice(0, 160),
    };
  };
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      const data = JSON.parse(text.slice(first, last + 1)) as {
        variants?: Array<{ svg?: unknown; rationale?: unknown }>;
      };
      const variants = (data.variants ?? [])
        .map((entry) =>
          collect(
            typeof entry.svg === "string" ? entry.svg : "",
            typeof entry.rationale === "string" ? entry.rationale : "",
          ),
        )
        .filter((entry): entry is LogoSvgVariant => Boolean(entry));
      if (variants.length) return dedupeLogoSvgVariants(variants).slice(0, 4);
    } catch {
      // Fall through to raw block extraction below.
    }
  }
  return (
    dedupeLogoSvgVariants(
      text
        .match(/<svg[\s\S]*?<\/svg>/gi)
        ?.map((svg) => collect(svg, ""))
        .filter((entry): entry is LogoSvgVariant => Boolean(entry)) ?? [],
    ).slice(0, 4) ?? []
  );
}

/** Strip scripts, handlers, and external references from a logo SVG. */
export function sanitizeLogoSvg(raw: string): string {
  let svg = raw.trim();
  const open = svg.search(/<svg[\s>]/i);
  if (open === -1) return "";
  svg = svg.slice(open);
  const close = svg.toLowerCase().lastIndexOf("</svg>");
  if (close === -1) return "";
  svg = svg.slice(0, close + "</svg>".length);
  return svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("[^"]*"|'[^']*')/gi, (match, _attr, quoted: string) => {
      const url = quoted.slice(1, -1).trim();
      return url.startsWith("#") ? match : "";
    })
    .slice(0, 20000);
}

/** Encode a sanitized SVG as a data URL for <img> and storage. */
export function svgToDataUrl(svg: string, explicitColor?: string): string {
  // <img> decodes the data URL as a standalone document: it needs the SVG
  // namespace and intrinsic dimensions, or naturalWidth stays zero and
  // nothing paints.
  let framed = svg;
  // Previews on dark surfaces turn currentColor marks invisible (black on
  // near-black). An explicit color pins the preview to a visible tone while
  // the stored SVG keeps currentColor for theming.
  if (explicitColor && explicitColor.trim()) {
    const safe = explicitColor.trim().slice(0, 24);
    framed = framed.split("currentColor").join(safe);
  }
  if (!/xmlns\s*=/i.test(framed)) {
    framed = framed.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\swidth\s*=/i.test(framed)) {
    framed = framed.replace(/<svg\b/i, '<svg width="256" height="256"');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(framed)}`;
}

/** Local fallback: geometric initials marks when the model is offline. */
export function mockLogoSvgVariants(projectName: string): LogoSvgVariant[] {
  const letters = initials(projectName).slice(0, 2);
  const base = (inner: string, rationale: string): LogoSvgVariant => ({
    svg: `<svg viewBox="0 0 100 100"><g fill="currentColor">${inner}</g></svg>`,
    rationale,
  });
  return [
    base(
      `<circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="10"/><text x="50" y="63" font-size="36" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700">${letters}</text>`,
      "Ring with initials",
    ),
    base(
      `<rect x="22" y="22" width="56" height="56" rx="14" fill="none" stroke="currentColor" stroke-width="10"/><circle cx="50" cy="50" r="10"/>`,
      "Rounded square with a core dot",
    ),
    base(
      `<polygon points="50,18 78,68 22,68" fill="none" stroke="currentColor" stroke-width="10" stroke-linejoin="round"/><circle cx="50" cy="55" r="8"/>`,
      "Triangle shell with a core dot",
    ),
  ];
}
