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
export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
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
