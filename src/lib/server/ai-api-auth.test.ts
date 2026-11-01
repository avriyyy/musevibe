import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as generatePost } from "@/app/api/ai/generate/route";
import { GET as modelsGet } from "@/app/api/ai/models/route";
import { POST as transcribePost } from "@/app/api/ai/transcribe/route";
import { POST as designReferencePost } from "@/app/api/design/reference/route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";

test("AI and design API routes reject requests without a verified session", async () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ["generation", () => generatePost(new Request("https://musevibe.test/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "name", prompt: "A project name" }),
    }))],
    ["models", () => modelsGet(new Request("https://musevibe.test/api/ai/models"))],
    ["transcription", () => transcribePost(new Request("https://musevibe.test/api/ai/transcribe", {
      method: "POST",
      body: new FormData(),
    }))],
    ["design reference", () => designReferencePost(new Request("https://musevibe.test/api/design/reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    }))],
  ];

  for (const [name, request] of cases) {
    const response = await request();
    assert.equal(response.status, 401, `${name} route must reject missing bearer credentials`);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});
