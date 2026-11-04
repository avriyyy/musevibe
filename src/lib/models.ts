/**
 * Chat models offered by the Meta Model API. The list is discovered from the
 * provider, and this module owns the labels and the offline fallback so the
 * picker still works when the API is unreachable.
 */

export interface AiModelOption {
  id: string;
  label: string;
  hint: string;
  locked?: boolean;
}

export const DEFAULT_MODEL = "muse-spark-1.3-contributor";

const ORDER = [DEFAULT_MODEL];

export const LOCKED_MODEL_MESSAGE =
  "This workspace is limited to Muse Spark 1.3 Contributor.";

/** Only the Contributor release may generate; everything else stays locked. */
export function isModelAllowed(id: string): boolean {
  return id === DEFAULT_MODEL;
}

export const FALLBACK_MODELS: AiModelOption[] = ORDER.map((id) => ({
  id,
  label: formatModelLabel(id),
  hint: modelHint(id),
}));

export function formatModelLabel(id: string): string {
  const [vendor, family, version, ...variant] = id.split("-");
  if (!vendor || !family) return id;
  const familyLabel = family.charAt(0).toUpperCase() + family.slice(1);
  const variantLabel = variant
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  // Wonder is the creative model and goes by its family name alone.
  const versionLabel = family === "wonder" ? "" : (version ?? "");
  return `Muse ${familyLabel} ${versionLabel}${variantLabel ? ` ${variantLabel}` : ""}`.trim();
}

export function modelHint(id: string): string {
  if (id.startsWith("muse-wonder")) return "Creative chat and multimodal";
  if (id.endsWith("-contributor")) return "Contributor release";
  if (id.startsWith("muse-spark-1.3")) return "Newest Spark";
  return "Earlier Spark release";
}

/** Keep the provider order stable and drop models that are not for chat. */
export function sortModels(ids: string[]): string[] {
  return ids
    .filter((id) => ORDER.includes(id))
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

/**
 * Provider models the workspace will not use, shown locked in the picker so
 * the restriction is visible instead of silent. Image, voice, and
 * segmentation models stay hidden: they cannot answer text prompts at all.
 */
export function lockedModelIds(ids: string[]): string[] {
  return ids
    .filter((id) => !ORDER.includes(id))
    .filter((id) => /^muse-(spark|wonder)/.test(id))
    .filter((id) => !/(image|voice|transcribe|segment|embed)/.test(id))
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, 6);
}
