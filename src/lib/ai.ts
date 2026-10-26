import type { Prd } from "./types";

// Abstraction AI agar bisa swap provider Meta (Muse Spark).
// Kalau AI_API_URL / AI_API_KEY kosong -> mock lokal, demo tetap jalan.

export async function aiGenerate(kind: "prd" | "tasks" | "brief" | "code", prompt: string) {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "muse-spark-1.3";

  if (!url || !key) return mockGenerate(kind, prompt);

  const res = await fetch(`${url}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, kind, prompt }),
  });
  if (!res.ok) return mockGenerate(kind, prompt);
  const data = await res.json();
  return data.text as string;
}

function mockGenerate(kind: string, prompt: string): string {
  const idea = prompt.slice(0, 200);
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
