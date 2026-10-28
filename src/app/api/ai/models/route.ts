import { NextResponse } from "next/server";
import {
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
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const preferred = process.env.AI_MODEL || "";

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
          const fallback = chatIds.includes(preferred) ? preferred : chatIds[0];
          return NextResponse.json({ models, default: fallback, source: "ai" });
        }
      }
    } catch {
      // Fall through to the curated list below.
    }
  }

  const fallback = FALLBACK_MODELS.some((model) => model.id === preferred)
    ? preferred
    : FALLBACK_MODELS[0].id;
  return NextResponse.json({
    models: FALLBACK_MODELS,
    default: fallback,
    source: "local",
  });
}
