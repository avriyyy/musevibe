import { NextResponse } from "next/server";
import { aiGenerate } from "@/lib/ai";

export async function POST(req: Request) {
  const { kind, prompt } = await req.json();
  const text = await aiGenerate(kind || "prd", prompt || "");
  return NextResponse.json({ text });
}
