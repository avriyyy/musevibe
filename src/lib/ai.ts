import type { Prd } from "./types";
import { FALLBACK_QUESTIONS } from "./wizard";

// Abstraction AI agar bisa swap provider Meta (Muse Spark).
// Kalau AI_API_URL / AI_API_KEY kosong -> mock lokal, demo tetap jalan.

export type AiGenerateKind = "prd" | "tasks" | "brief" | "code" | "questions" | "logo" | "stack";

export interface AiGenerateResult {
  text: string;
  source: "ai" | "local";
}

export interface AiLogoResult {
  /** Image URL or data URL, or null when the provider is unavailable. */
  image: string | null;
  source: "ai" | "local";
}

export async function aiGenerate(
  kind: AiGenerateKind,
  prompt: string,
): Promise<AiGenerateResult> {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "muse-spark-1.3";

  if (!url || !key) return local(kind, prompt);

  const text = await providerText(url, key, model, prompt);
  if (text) return { text, source: "ai" };
  return local(kind, prompt);
}

/** POST a chat request to an OpenAI-compatible endpoint, else try legacy. */
async function providerText(
  url: string,
  key: string,
  model: string,
  prompt: string,
): Promise<string | null> {
  const base = url.replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) return content.trim();
    } else if (res.status !== 404) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const res = await fetch(`${base}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, kind: "text", prompt }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { text?: unknown };
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}

function local(kind: AiGenerateKind, prompt: string): AiGenerateResult {
  return { text: mockGenerate(kind, prompt), source: "local" };
}

/**
 * Ask the image model for a logo. The local path returns no image on purpose:
 * a mock cannot draw the user's mark, so the wizard falls back to an initials
 * badge instead of inventing a logo.
 */
export async function aiGenerateLogo(prompt: string): Promise<AiLogoResult> {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_IMAGE_MODEL || "muse-image-1.0";

  if (!url || !key) return { image: null, source: "local" };

  const base = url.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt, size: "512x512", n: 1 }),
      signal: AbortSignal.timeout(120000),
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
  if (kind === "prd") {
    return `# PRD draft (local)\n\nIdea: ${idea}\n\n## Problem\nIndie devs need one place for planning, design, and coding without switching tools.\n\n## Users\nSolo indie hackers, hackathon students.\n\n## Features\n- Auto Kanban from PRD\n- 3-screen wireframe\n- Code starter + preview\n\n## Out of scope\n- Realtime collaboration\n- One-click deploy (manual for now)`;
  }
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
