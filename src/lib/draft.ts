/**
 * Shared draft creation: the chat hands an idea over, the model names it, and
 * a draft project exists before the wizard opens. Signed-in projects are
 * created by the server in Neon; guest projects stay in localStorage.
 */
import { useVibe } from "./store";
import { isWorkspaceSnapshot } from "./workspace-snapshot";
import { buildNamePrompt, deriveProjectName, parseProjectName } from "./wizard";
import { isSupabaseAuthConfigured, supabaseBrowser } from "./supabase/client";

export async function createDraftProject(
  ideaText: string,
  model?: string,
): Promise<string> {
  const trimmed = ideaText.trim();
  const name = deriveProjectName(trimmed) || "Untitled project";

  if (isSupabaseAuthConfigured()) {
    const client = supabaseBrowser();
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error("Could not verify your account. Please try again.");

    const session = data.session;
    if (session) {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: { name, idea: trimmed, ...(model ? { model } : {}) },
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { snapshot?: unknown; revision?: unknown }
        | null;
      if (
        !response.ok ||
        !payload ||
        !isWorkspaceSnapshot(payload.snapshot) ||
        typeof payload.revision !== "string" ||
        !Number.isFinite(Date.parse(payload.revision))
      ) {
        throw new Error(
          "Could not create your account workspace. Check your connection and try again.",
        );
      }

      const project = payload.snapshot.project;
      useVibe.getState().addProject(project);
      useVibe.getState().setCloudOwner(project.id, session.user.id);
      useVibe.getState().setCloudRevision(project.id, payload.revision);

      const { data: latest, error: latestError } = await client.auth.getSession();
      if (latestError || latest.session?.user.id !== session.user.id) {
        throw new Error("Your account changed while creating the project. Please try again.");
      }

      void improveProjectName(project.id, trimmed, model, project.name);
      return project.id;
    }
  }

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
    const nextName = parseProjectName(data.text);
    if (!nextName || nextName === fallbackName) return;
    const store = useVibe.getState();
    const current = store.projects.find((project) => project.id === id);
    // Do not overwrite a name the user has already edited while generation ran.
    if (current?.name === fallbackName) store.updateProject(id, { name: nextName });
  } catch {
    // Naming is an enhancement; the local project is already ready to use.
  }
}
