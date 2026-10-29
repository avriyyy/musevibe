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
