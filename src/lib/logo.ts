/**
 * Project logo helpers. The wizard offers three paths: describe a logo and let
 * the image model draw it, upload an existing file, or skip and keep an
 * initials badge. Skipping is honest: the home screen renders initials as a
 * placeholder instead of a fabricated mark.
 */

export type LogoStatus = "idle" | "loading" | "ready" | "error";
export type LogoOrigin = "ai" | "upload" | null;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const LOGO_SIZE = 256;

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
 * gradients, glow, 3D, or sparkle/star/lightning/robot filler icons.
 */
export function buildLogoPrompt(
  description: string,
  projectName: string,
  idea: string,
): string {
  const trimmed = description.replace(/\s+/g, " ").trim().slice(0, 500);
  const context = idea.replace(/\s+/g, " ").trim().slice(0, 200);

  return [
    `Design a logo for an app called "${projectName}".`,
    context ? `The app does this: "${context}".` : "",
    `The user describes the logo they want as: "${trimmed}".`,
    "",
    "Style rules (follow all of them):",
    "- Flat minimal vector mark, one simple motif tied to what the app does.",
    "- At most two solid colors on a transparent background. No gradients, no glow, no shadows, no 3D, no photorealism.",
    "- No generic filler icons: no sparkle, star, lightning bolt, robot, cube, diamond, or magic wand.",
    "- No text or letters in the mark unless the user explicitly asked for it.",
    "- Geometric and neat: it must stay readable at 64 pixels.",
    "- Square composition, the mark centered with breathing room.",
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
 * The description is repeated as numbered hard requirements with a
 * self-check, because a bare style brief lets the model drift into
 * generic marks that ignore what the user actually asked for.
 */
export function buildLogoSvgPrompt(
  description: string,
  projectName: string,
  idea: string,
): string {
  const trimmed = description.replace(/\s+/g, " ").trim().slice(0, 500);
  const context = idea.replace(/\s+/g, " ").trim().slice(0, 200);

  return [
    `Design 3 logo variants for an app called "${projectName}".`,
    context ? `The app does this: "${context}".` : "",
    "",
    "Hard requirements from the user (every variant must satisfy all of them):",
    `R1 motif: "${trimmed}". Build the mark around exactly what this says.`,
    "R2 palette: use the exact colors the user named, translated to close hex values (deep green ~ #166534, forest ~ #14532d, navy ~ #1e3a8a, sky ~ #0284c7, amber ~ #d97706, terracotta ~ #c2410c, plum ~ #7e22ce, charcoal ~ #1f2937). At most two solid fills: currentColor plus one fixed hex.",
    "R3 construction: one dominant motif filling ~60% of the 100x100 canvas, centered with breathing room, readable at 16 pixels.",
    "",
    "Return ONLY a JSON object with this shape, no fences, no commentary:",
    '{"variants":[{"svg":"<svg viewBox=\"0 0 100 100\">...</svg>","rationale":"one sentence"}]}',
    "",
    "Rules for every variant:",
    "- One <svg> with viewBox=\"0 0 100 100\", no width or height attributes.",
    "- Transparent by construction: never draw a background rect or page fill.",
    "- Geometric primitives (circle, rect, polygon, path) grouped in <g>; flat fills only.",
    "- No text or letters unless the user explicitly asked for them.",
    "- No gradients, glow, shadows, filters, scripts, event handlers, or external references.",
    "- No sparkle, star, lightning bolt, robot, cube, diamond, or magic wand filler.",
    "- Valid XML that parses on its own. The three variants must feel distinctly different, not parameter tweaks.",
    "",
    "Self-check before returning: re-read R1-R3 for each variant and drop any variant that misses one. Each rationale must name which part of the description it answers.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pull variant SVGs out of a model response; falls back to raw svg blocks. */
export function parseLogoSvgVariants(raw: unknown): LogoSvgVariant[] {
  if (typeof raw !== "string") return [];
  let text = raw.trim();
  if (!text) return [];
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\s*```/i);
  if (fenced) text = fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      const data = JSON.parse(text.slice(first, last + 1)) as {
        variants?: Array<{ svg?: unknown; rationale?: unknown }>;
      };
      const variants = (data.variants ?? [])
        .map((entry) => ({
          svg: sanitizeLogoSvg(typeof entry.svg === "string" ? entry.svg : ""),
          rationale: (
            typeof entry.rationale === "string" ? entry.rationale : ""
          )
            .trim()
            .slice(0, 160),
        }))
        .filter((entry) => entry.svg);
      if (variants.length) return variants.slice(0, 4);
    } catch {
      // Fall through to raw block extraction below.
    }
  }
  return text
    .match(/<svg[\s\S]*?<\/svg>/gi)
    ?.map((svg) => sanitizeLogoSvg(svg))
    .filter(Boolean)
    .slice(0, 4)
    .map((svg) => ({ svg, rationale: "" })) ?? [];
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
export function svgToDataUrl(svg: string): string {
  // <img> decodes the data URL as a standalone document: it needs the SVG
  // namespace and intrinsic dimensions, or naturalWidth stays zero and
  // nothing paints.
  let framed = svg;
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
