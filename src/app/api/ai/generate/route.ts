import { NextResponse } from "next/server";
import { aiGenerate, aiGenerateLogo, type AiGenerateKind } from "@/lib/ai";

const KINDS: AiGenerateKind[] = ["prd", "tasks", "brief", "code", "questions", "logo", "stack", "name", "doc", "prototype", "chat", "design-system", "pages", "logo-svg"];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "invalid_json" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be an object.", code: "invalid_body" },
      { status: 400 },
    );
  }
  const { kind, prompt, model } = body as Record<string, unknown>;
  if (typeof kind !== "string" || !KINDS.includes(kind as AiGenerateKind)) {
    return NextResponse.json(
      { error: "Unknown generation kind.", code: "invalid_kind" },
      { status: 400 },
    );
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "A prompt is required.", code: "invalid_prompt" },
      { status: 400 },
    );
  }
  if (prompt.length > 60_000) {
    return NextResponse.json(
      { error: "The prompt is too long.", code: "prompt_too_long" },
      { status: 413 },
    );
  }
  if (
    model !== undefined &&
    (typeof model !== "string" || !/^muse-(spark|wonder)-[a-z0-9.]+$/.test(model))
  ) {
    return NextResponse.json(
      { error: "Unknown model.", code: "invalid_model" },
      { status: 400 },
    );
  }
  const requested = kind as AiGenerateKind;
  if (requested === "logo") {
    return NextResponse.json(await aiGenerateLogo(prompt));
  }
  const result = await aiGenerate(
    requested,
    prompt,
    typeof model === "string" ? model : undefined,
  );
  return NextResponse.json(result);
}
