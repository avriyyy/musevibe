import { NextResponse } from "next/server";
import { aiGenerate, aiGenerateLogo, type AiGenerateKind } from "@/lib/ai";

const KINDS: AiGenerateKind[] = ["prd", "tasks", "brief", "code", "questions", "logo", "stack"];

export async function POST(req: Request) {
  const { kind, prompt } = await req.json();
  const requested = KINDS.includes(kind) ? (kind as AiGenerateKind) : "prd";
  const text = typeof prompt === "string" ? prompt : "";
  if (requested === "logo") {
    return NextResponse.json(await aiGenerateLogo(text));
  }
  const result = await aiGenerate(requested, text);
  return NextResponse.json(result);
}
