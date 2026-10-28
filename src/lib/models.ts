/**
 * Chat models offered by the Meta Model API. The list is discovered from the
 * provider, and this module owns the labels and the offline fallback so the
 * picker still works when the API is unreachable.
 */

export interface AiModelOption {
  id: string;
  label: string;
  hint: string;
}

export const DEFAULT_MODEL = "muse-spark-1.3-contributor";

const ORDER = [
  "muse-spark-1.3-contributor",
  "muse-spark-1.3",
  "muse-spark-1.2-contributor",
  "muse-spark-1.2",
  "muse-spark-1.1",
  "muse-wonder-1.0",
];

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
  return `Muse ${familyLabel} ${version ?? ""}${variantLabel ? ` ${variantLabel}` : ""}`.trim();
}

export function modelHint(id: string): string {
  if (id.startsWith("muse-wonder")) return "Creative chat and multimodal";
  if (id.endsWith("-contributor")) return "Contributor release";
  if (id.startsWith("muse-spark-1.3")) return "Newest Spark";
  return "Earlier Spark release";
}

/** Keep the provider order stable and drop models that are not for chat. */
export function sortModels(ids: string[]): string[] {
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return ids
    .filter((id) => /^muse-(spark|wonder)-/.test(id))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
