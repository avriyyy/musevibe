import { NextResponse } from "next/server";
import { aiGenerate, type AiGenerateKind } from "@/lib/ai";

const KINDS: AiGenerateKind[] = ["prd", "tasks", "brief", "code", "questions"];

export async function POST(req: Request) {
  const { kind, prompt } = await req.json();
  const requested = KINDS.includes(kind) ? (kind as AiGenerateKind) : "prd";
  const result = await aiGenerate(requested, typeof prompt === "string" ? prompt : "");
  return NextResponse.json(result);
}
