import type { Prd } from "./types";
import { FALLBACK_QUESTIONS, deriveProjectName } from "./wizard";
import { mockLogoSvgVariants } from "./logo";
import { docFullName } from "./docs";

// Abstraction AI agar bisa swap provider Meta (Muse Spark).
// Kalau AI_API_URL / AI_API_KEY kosong -> mock lokal, demo tetap jalan.

export type AiGenerateKind = "prd" | "tasks" | "brief" | "code" | "questions" | "logo" | "logo-svg" | "stack" | "name" | "doc" | "prototype" | "chat" | "design-system" | "pages";

export interface AiGenerateResult {
  text: string;
  source: "ai" | "local";
}

export interface AiLogoResult {
  /** Image URL or data URL, or null when the provider is unavailable. */
  image: string | null;
  source: "ai" | "local";
}

/** Text models the picker can send. Anything else falls back to the env default. */
const TEXT_MODEL = /^muse-(spark|wonder)-[a-z0-9.]+$/;

export async function aiGenerate(
  kind: AiGenerateKind,
  prompt: string,
  requestedModel?: string,
): Promise<AiGenerateResult> {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const envModel = process.env.AI_MODEL || "muse-spark-1.3";
  const model =
    requestedModel && TEXT_MODEL.test(requestedModel) ? requestedModel : envModel;

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
        // Reasoning models spend most of this budget before writing an answer.
        // At 4000 the longest PRDs ran out mid-reasoning and came back empty.
        max_tokens: 8000,
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
  if (kind === "name") {
    return deriveProjectName(prompt) || "Untitled project";
  }
  if (kind === "doc") {
    const label = docFullName("prd");
    return `# ${label} (local draft)\n\n> The model is unavailable, so this is a starting outline. Generate again with the model for full content.\n\nIdea: ${idea}\n\n## Overview\nFill in the product context from the brief.\n\n## Details\nExpand each required section with concrete, product-specific content.\n\n## Open questions\nList what still needs a decision before building.`;
  }
  if (kind === "logo-svg") {
    return JSON.stringify({
      variants: mockLogoSvgVariants("Logo").map((entry) => ({
        svg: entry.svg,
        rationale: entry.rationale,
      })),
    });
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
