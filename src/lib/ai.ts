import type { Prd } from "./types";
import { FALLBACK_QUESTIONS } from "./wizard";

// Abstraction AI agar bisa swap provider Meta (Muse Spark).
// Kalau AI_API_URL / AI_API_KEY kosong -> mock lokal, demo tetap jalan.

export type AiGenerateKind = "prd" | "tasks" | "brief" | "code" | "questions" | "logo";

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

  try {
    const res = await fetch(`${url}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, kind, prompt }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return local(kind, prompt);

    const data = (await res.json()) as { text?: unknown };
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text) return local(kind, prompt);
    return { text, source: "ai" };
  } catch {
    return local(kind, prompt);
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
  const model = process.env.AI_IMAGE_MODEL || process.env.AI_MODEL || "muse-spark-1.3";

  if (!url || !key) return { image: null, source: "local" };

  try {
    const res = await fetch(`${url}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, kind: "logo", prompt }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { image: null, source: "local" };

    const data = (await res.json()) as {
      imageUrl?: unknown;
      image?: unknown;
      text?: unknown;
    };
    const raw =
      typeof data?.imageUrl === "string"
        ? data.imageUrl
        : typeof data?.image === "string"
          ? data.image
          : typeof data?.text === "string" &&
              /^data:image\/|^https?:\/\//.test(data.text.trim())
            ? data.text.trim()
            : null;
    if (!raw) return { image: null, source: "local" };
    return { image: raw, source: "ai" };
  } catch {
    return { image: null, source: "local" };
  }
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
