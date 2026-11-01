/**
 * Shared draft creation: the chat hands an idea over, the model names it, and
 * a draft project exists before the wizard opens. The wizard can then be left
 * and resumed at any time.
 */

import { useVibe } from "./store";
import { buildNamePrompt, deriveProjectName, parseProjectName } from "./wizard";

export async function createDraftProject(
  ideaText: string,
  model?: string,
): Promise<string> {
  const trimmed = ideaText.trim();
  const name = deriveProjectName(trimmed) || "Untitled project";
  const id = crypto.randomUUID();
  useVibe.getState().addProject({
    id,
    name,
    idea: trimmed,
    createdAt: new Date().toISOString(),
    status: "draft",
    wizardStep: 0,
    model,
  });
  void improveProjectName(id, trimmed, model, name);
  return id;
}

async function improveProjectName(
  id: string,
  idea: string,
  model: string | undefined,
  fallbackName: string,
): Promise<void> {
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "name",
        prompt: buildNamePrompt(idea),
        model,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { text?: unknown; source?: unknown };
    if (data.source !== "ai") return;

    const name = parseProjectName(data.text);
    if (!name || name === fallbackName) return;

    const store = useVibe.getState();
    const current = store.projects.find((project) => project.id === id);
    // Do not overwrite a name the user has already edited while generation ran.
    if (current?.name === fallbackName) store.updateProject(id, { name });
  } catch {
    // Naming is an enhancement; the local project is already ready to use.
  }
}
