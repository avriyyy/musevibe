import { NextResponse } from "next/server";
import { getRuntimeEnv } from "@/lib/server/runtime-env";
import {
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  formatModelLabel,
  modelHint,
  sortModels,
} from "@/lib/models";

/**
 * Discover the chat models this key can use. Image, voice, and segmentation
 * models are filtered out: they cannot answer the text prompts this workspace
 * sends, so offering them would be a lie.
 */
export async function GET() {
  const url = getRuntimeEnv("AI_API_URL");
  const key = getRuntimeEnv("AI_API_KEY");

  if (url && key) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, "")}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id?: unknown }> };
        const ids = Array.isArray(data?.data)
          ? data.data
              .map((entry) => (typeof entry?.id === "string" ? entry.id : ""))
              .filter(Boolean)
          : [];
        const chatIds = sortModels(ids);
        if (chatIds.length) {
          const models = chatIds.map((id) => ({
            id,
            label: formatModelLabel(id),
            hint: modelHint(id),
          }));
          return NextResponse.json({ models, default: DEFAULT_MODEL, source: "ai" });
        }
      }
    } catch {
      // Fall through to the curated list below.
    }
  }

  return NextResponse.json({
    models: FALLBACK_MODELS,
    default: DEFAULT_MODEL,
    source: "local",
  });
}
