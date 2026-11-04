/**
 * Shared draft creation: the chat hands an idea over, the model names it, and
 * a draft project exists before the wizard opens. Projects are created
 * server-side and require a signed-in account; signed-out visitors are sent
 * to sign-in before anything is created.
 */
import { useVibe } from "./store";
import { notifyCreditsChanged } from "./credits";
import { isWorkspaceSnapshot } from "./workspace-snapshot";
import { buildNamePrompt, deriveProjectName, parseProjectName } from "./wizard";
import { authFetch, isSupabaseAuthConfigured, supabaseBrowser } from "./supabase/client";

/** Session lookup for draft creation. Null means sign-in is required. */
async function currentSessionOrNull() {
  if (!isSupabaseAuthConfigured()) return null;
  try {
    const { data, error } = await supabaseBrowser().auth.getSession();
    if (error) return null;
    return data.session;
  } catch {
    return null;
  }
}

function requireSignedInMessage(): string {
  return "Sign in is required to create a project.";
}

export async function createDraftProject(
  ideaText: string,
  model?: string,
): Promise<string> {
  const trimmed = ideaText.trim();
  if (!trimmed) {
    throw new Error("Describe your idea in a sentence or two first.");
  }

  const session = await currentSessionOrNull();
  if (!session) throw new Error(requireSignedInMessage());

  const name = deriveProjectName(trimmed) || "Untitled project";
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
        | { snapshot?: unknown; revision?: unknown; error?: unknown }
        | null;
  if (
        !response.ok ||
        !payload ||
        !isWorkspaceSnapshot(payload.snapshot) ||
        typeof payload.revision !== "string" ||
        !Number.isFinite(Date.parse(payload.revision))
  ) {
    const serverMessage =
      !response.ok && payload && typeof payload.error === "string"
        ? payload.error
        : null;
    throw new Error(
      serverMessage ??
          "Could not create your account workspace. Check your connection and try again.",
    );
  }

  const project = payload.snapshot.project;
  useVibe.getState().addProject(project);
  useVibe.getState().setCloudOwner(project.id, session.user.id);
  useVibe.getState().setCloudRevision(project.id, payload.revision);

  const client = supabaseBrowser();
  const { data: latest, error: latestError } = await client.auth.getSession();
  if (latestError || latest.session?.user.id !== session.user.id) {
    throw new Error("Your account changed while creating the project. Please try again.");
  }

  void improveProjectName(project.id, trimmed, model, project.name);
  // Server-side spend succeeded; mounted balances refetch instead of going stale.
  notifyCreditsChanged();
  return project.id;
}

async function improveProjectName(
  id: string,
  idea: string,
  model: string | undefined,
  fallbackName: string,
): Promise<void> {
  try {
    const response = await authFetch("/api/ai/generate", {
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
