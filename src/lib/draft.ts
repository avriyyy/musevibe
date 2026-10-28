/**
 * Shared draft creation: the chat hands an idea over, the model names it, and
 * a draft project exists before the wizard opens. The wizard can then be left
 * and resumed at any time.
 */

import { useVibe } from "./store";
import { buildNamePrompt, deriveProjectName, parseProjectName } from "./wizard";

export async function createDraftProject(ideaText: string): Promise<string> {
  const trimmed = ideaText.trim();

  let name = "";
  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "name", prompt: buildNamePrompt(trimmed) }),
    });
    if (response.ok) {
      const data = (await response.json()) as { text?: unknown };
      name = parseProjectName(data.text) ?? "";
    }
  } catch {
    // Fall through to the local name below.
  }
  if (!name) name = deriveProjectName(trimmed) || "Untitled project";

  const id = crypto.randomUUID();
  useVibe.getState().addProject({
    id,
    name,
    idea: trimmed,
    createdAt: new Date().toISOString(),
    status: "draft",
    wizardStep: 0,
  });
  return id;
}
