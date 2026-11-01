import type { Prd } from "./types";
import { FALLBACK_QUESTIONS, deriveProjectName } from "./wizard";
import { DEFAULT_MODEL } from "./models";
import { generationQualitySystemPrompt } from "./generation-quality";
import { getRuntimeEnv } from "./server/runtime-env";

// Abstraction AI agar bisa swap provider Meta (Muse Spark).
// Kalau AI_API_URL / AI_API_KEY kosong -> mock lokal, demo tetap jalan.

export type AiGenerateKind = "prd" | "tasks" | "brief" | "code" | "questions" | "logo" | "logo-svg" | "stack" | "name" | "doc" | "prototype" | "chat" | "design-system" | "pages";

export interface AiGenerateResult {
  text: string;
  source: "ai" | "local";
  /** Why the local fallback was used. Absent or "ok" on a model answer. */
  reason?: "ok" | "missing-key" | "http" | "timeout" | "network" | "empty";
  /** HTTP status when the provider rejected the request. */
  status?: number;
  /** Model the server actually used, when known. */
  model?: string;
}

export interface AiLogoResult {
  /** Image URL or data URL, or null when the provider is unavailable. */
  image: string | null;
  source: "ai" | "local";
}

export async function aiGenerate(
  kind: AiGenerateKind,
  prompt: string,
  requestedModel?: string,
  requestSignal?: AbortSignal,
): Promise<AiGenerateResult> {
  void requestedModel;
  const url = getRuntimeEnv("AI_API_URL");
  const key = getRuntimeEnv("AI_API_KEY");
  // Old project settings and environment values cannot switch this provider.
  const model = DEFAULT_MODEL;

  if (!url || !key) return local(kind, prompt, "missing-key", model);

  let reply = await providerText(url, key, model, prompt, kind, requestSignal);
  // Wizard questions are a short, non-blocking convenience. Retrying them can
  // outlive the browser's deadline, so fail fast and use the built-in set.
  if (kind !== "questions" && !requestSignal?.aborted && isRetryable(reply)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (!requestSignal?.aborted) {
      reply = await providerText(url, key, model, prompt, kind, requestSignal);
    }
  }
  if (reply.text) {
    return { text: reply.text, source: "ai", reason: "ok", model };
  }
  return local(kind, prompt, reply.reason, model, reply.status);
}

function isRetryable(reply: {
  text: string | null;
  reason: "http" | "timeout" | "network" | "empty";
  status?: number;
}): boolean {
  return (
    reply.reason === "network" ||
    (reply.reason === "http" &&
      (reply.status === 429 || (reply.status !== undefined && reply.status >= 500)))
  );
}

/** POST a chat request; only a missing chat endpoint falls back to legacy. */
async function providerText(
  url: string,
  key: string,
  model: string,
  prompt: string,
  kind?: AiGenerateKind,
  requestSignal?: AbortSignal,
): Promise<{
  text: string | null;
  reason: "http" | "timeout" | "network" | "empty";
  status?: number;
}> {
  const base = url.replace(/\/+$/, "");
  // A full app screen is a long answer: reasoning plus a 6 to 9k token HTML
  // file, often past a minute. The shorter kinds keep the tighter budget.
  const heavy = kind === "prototype" || kind === "pages";
  const qualityPrompt = generationQualitySystemPrompt(kind);
  const budget = heavy
    ? 14000
    : kind === "name"
      ? 256
      : kind === "questions"
        ? 3000
        : 8000;
  // The provider closes silent non-streaming requests after about a minute,
  // so every call streams: the token flow keeps the connection alive and a
  // full page can finish instead of dying as a network error.
  const timeout = heavy
    ? 300000
    : kind === "name"
      ? 25000
      : kind === "questions"
        ? 25000
        : 120000;

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: qualityPrompt },
          { role: "user", content: prompt },
        ],
        // Reasoning models spend most of this budget before writing an answer.
        // At 4000 the longest PRDs ran out mid-reasoning and came back empty.
        max_tokens: budget,
        stream: true,
      }),
      signal: combinedSignal(requestSignal, timeout),
    });
    if (res.ok) {
      const streamed = await readChatStream(res);
      if (streamed) return { text: streamed, reason: "empty" };
      // Do not send a second full request to /generate after a successful but
      // empty chat response. That usually repeats the same provider failure.
      return { text: null, reason: "empty" };
    } else if (res.status !== 404) {
      return { text: null, reason: "http", status: res.status };
    }
  } catch (error) {
    return {
      text: null,
      reason: isTimeout(error) ? "timeout" : "network",
    };
  }

  try {
    const res = await fetch(`${base}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        kind: "text",
        prompt: `${qualityPrompt}\n\nREQUESTED OUTPUT:\n${prompt}`,
      }),
      signal: combinedSignal(requestSignal, timeout),
    });
    if (!res.ok) {
      return { text: null, reason: "http", status: res.status };
    }

    const data = (await res.json()) as { text?: unknown };
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text
      ? { text, reason: "empty" }
      : { text: null, reason: "empty" };
  } catch (error) {
    return {
      text: null,
      reason: isTimeout(error) ? "timeout" : "network",
    };
  }
}

function combinedSignal(requestSignal: AbortSignal | undefined, timeout: number): AbortSignal {
  const deadline = AbortSignal.timeout(timeout);
  return requestSignal ? AbortSignal.any([requestSignal, deadline]) : deadline;
}

/**
 * Drain an SSE chat stream and join the deltas. Providers that ignore
 * `stream: true` answer with plain JSON instead, so both shapes are read here.
 */
async function readChatStream(res: Response): Promise<string> {
  const type = res.headers.get("content-type") ?? "";
  if (!res.body || !type.includes("event-stream")) {
    const data = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : "";
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice("data:".length).trim();
        if (!payload) continue;
        if (payload === "[DONE]") {
          await reader.cancel().catch(() => undefined);
          return text.trim();
        }
        try {
          const frame = JSON.parse(payload) as {
            choices?: Array<{
              delta?: { content?: unknown };
              message?: { content?: unknown };
            }>;
          };
          const choice = frame.choices?.[0];
          const delta = choice?.delta?.content;
          const message = choice?.message?.content;
          if (typeof delta === "string") text += delta;
          else if (typeof message === "string") text += message;
        } catch {
          // A frame split across chunks: the next read completes it.
        }
      }
    }
    // Some providers close the stream immediately after the final event,
    // without a trailing newline. Flush and consume that partial line too.
    buffer += decoder.decode();
    for (const raw of buffer.split("\n")) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice("data:".length).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const frame = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: unknown };
            message?: { content?: unknown };
          }>;
        };
        const choice = frame.choices?.[0];
        const delta = choice?.delta?.content;
        const message = choice?.message?.content;
        if (typeof delta === "string") text += delta;
        else if (typeof message === "string") text += message;
      } catch {
        // Ignore incomplete provider metadata; the usable content is retained.
      }
    }
  } finally {
    reader.releaseLock();
  }
  return text.trim();
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function local(
  kind: AiGenerateKind,
  prompt: string,
  reason: AiGenerateResult["reason"] = "missing-key",
  model?: string,
  status?: number,
): AiGenerateResult {
  return {
    text: mockGenerate(kind, prompt),
    source: "local",
    reason,
    ...(model ? { model } : {}),
    ...(status ? { status } : {}),
  };
}

/**
 * Ask the image model for a logo. The local path returns no image on purpose:
 * a mock cannot draw the user's mark, so the wizard falls back to an initials
 * badge instead of inventing a logo.
 */
export async function aiGenerateLogo(
  prompt: string,
  requestSignal?: AbortSignal,
): Promise<AiLogoResult> {
  const url = getRuntimeEnv("AI_API_URL");
  const key = getRuntimeEnv("AI_API_KEY");
  const model = getRuntimeEnv("AI_IMAGE_MODEL") || "muse-image-1.0";

  if (!url || !key) return { image: null, source: "local" };

  const base = url.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, size: "512x512", n: 1 }),
      signal: combinedSignal(requestSignal, 120000),
    });
    if (!res.ok) return { image: null, source: "local" };

    const data = (await res.json()) as {
      data?: Array<{ b64_json?: unknown; url?: unknown }>;
      imageUrl?: unknown;
      image?: unknown;
    };
    const first = Array.isArray(data?.data) ? data.data[0] : null;
    const b64 = typeof first?.b64_json === "string" ? first.b64_json : null;
    if (b64) return { image: `${sniffDataUrl(b64)},${b64}`, source: "ai" };
    const remote =
      typeof first?.url === "string"
        ? first.url
        : typeof data?.imageUrl === "string"
          ? data.imageUrl
          : typeof data?.image === "string"
            ? data.image
            : null;
    if (remote) return { image: remote, source: "ai" };
    return { image: null, source: "local" };
  } catch {
    return { image: null, source: "local" };
  }
}

/** Guess the mime type from the base64 magic bytes. The provider returns WebP. */
function sniffDataUrl(b64: string): string {
  if (b64.startsWith("UklGR")) return "data:image/webp;base64";
  if (b64.startsWith("iVBOR")) return "data:image/png;base64";
  if (b64.startsWith("/9j/")) return "data:image/jpeg;base64";
  if (b64.startsWith("PHN2Zy") || b64.startsWith("PD94bW")) return "data:image/svg+xml;base64";
  return "data:image/png;base64";
}

function mockGenerate(kind: AiGenerateKind, prompt: string): string {
  const idea = prompt.slice(0, 200);
  if (kind === "questions") {
    return JSON.stringify({ questions: FALLBACK_QUESTIONS });
  }
  if (kind === "prd" || kind === "doc") return "";
  if (kind === "tasks") {
    return JSON.stringify(
      [
        { title: "Set up landing + auth", status: "todo" },
        { title: "Write PRD + Kanban", status: "todo" },
        { title: "Wireframe 3 screens", status: "todo" },
        { title: "Code editor + preview", status: "todo" },
        { title: "Wire up Vibe Generate", status: "todo" },
        { title: "Polish + demo video", status: "todo" },
      ],
      null,
      2
    );
  }
  if (kind === "brief") {
    return `Screens: Landing, Dashboard, Project Detail.\nComponents: Navbar, hero, Kanban cards, canvas toolbar, code editor, preview iframe.`;
  }
  if (kind === "stack") {
    return JSON.stringify({ platform: "web", framework: "nextjs", reason: "" });
  }
  if (kind === "name") {
    return deriveProjectName(prompt) || "Untitled project";
  }
  if (kind === "logo-svg") {
    // Offline: no generic geometry. An empty variant list fails the SVG
    // quality gate downstream, so local output can never be mistaken for
    // generated concepts. The initials badge remains the explicit fallback.
    return JSON.stringify({ variants: [] });
  }
  if (kind === "design-system") {
    return `Design system (local)\n\nThe model is unavailable, so the reference could not be converted. Pick a bundled template instead, or paste DESIGN.md content directly.\n\nIdea: ${idea}`;
  }
  if (kind === "pages") {
    return JSON.stringify(
      { pages: [
        { slug: "home", title: "Home", brief: "The main screen with the core content and primary action." },
        { slug: "details", title: "Details", brief: "A detail view for one item with actions to keep or change it." },
        { slug: "settings", title: "Settings", brief: "Preferences and account controls in one quiet form." },
      ] },
      null,
      2,
    );
  }
  if (kind === "prototype") {
    return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n<title>Prototype (local draft)</title>\n<style>\nbody { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #0b0c10; color: #f5f6f8; }\nmain { max-width: 640px; margin: 0 auto; }\n</style>\n</head>\n<body>\n<main>\n<h1>Prototype (local draft)</h1>\n<p>${idea}</p>\n<p>The model is unavailable, so this is a placeholder. Generate again with the model for the full prototype.</p>\n</main>\n</body>\n</html>`;
  }
  if (kind === "chat") {
    const lines = prompt.split("\n");
    const lastUser = [...lines]
      .reverse()
      .find((line) => line.startsWith("User: "))
      ?.slice("User: ".length)
      .trim();
    const question = lastUser || prompt.slice(0, 200);
    return `The model is unavailable right now, so I cannot answer from the project context yet. Reconnect the model and ask again. Your message was: ${question}`;
  }
  return `// starter (mock) untuk: ${idea}\nexport default function App() {\n  return <h1>MuseVibe starter</h1>;\n}`;
}

export function parsePrdMarkdown(md: string): Prd {
  return {
    problem: md.slice(0, 500),
    users: "indie dev",
    features: ["kanban", "wireframe", "code preview"],
    scopeOut: ["realtime collab"],
    raw: md,
  };
}
