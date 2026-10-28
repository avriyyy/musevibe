import { NextResponse } from "next/server";

const MAX_BYTES = 32 * 1024 * 1024;

/**
 * One-shot speech to text through Muse Voice Transcribe. The browser records a
 * clip and resamples it to the mono 16-bit PCM WAV the provider accepts.
 */
export async function POST(req: Request) {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Voice transcription is not configured." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the recording as form data." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "The recording is empty." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Keep the recording under 32 MB." }, { status: 413 });
  }

  const base = url.replace(/\/+$/, "");
  const root = base.replace(/\/v1$/, "");
  const request = {
    mode: "PUSH_TO_TALK",
    model: process.env.AI_VOICE_MODEL || "muse-voice-transcribe-1.0",
    audioEncoding: "WAV",
    languageBias: ["English", "Indonesian"],
  };

  const outbound = new FormData();
  outbound.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" }),
  );
  outbound.append("audio", audio, "prompt.wav");

  try {
    const res = await fetch(`${root}/v1/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: outbound,
      signal: AbortSignal.timeout(90000),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "The voice model could not transcribe that clip." },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { transcript?: unknown };
    const transcript =
      typeof data?.transcript === "string" ? data.transcript.trim() : "";
    return NextResponse.json({ transcript, source: "ai" });
  } catch {
    return NextResponse.json(
      { error: "Voice transcription timed out. Try a shorter clip." },
      { status: 502 },
    );
  }
}
