/**
 * Shared draft creation: the chat hands an idea over, the model names it, and
 * a draft project exists before the wizard opens. Account projects are created
 * server-side; signed-out visitors get a local-only guest draft that stays in
 * this browser. Old browser data is untouched either way.
 */
import { useVibe } from "./store";
import { isWorkspaceSnapshot } from "./workspace-snapshot";
import { buildNamePrompt, deriveProjectName, parseProjectName } from "./wizard";
import { authFetch, isSupabaseAuthConfigured, supabaseBrowser } from "./supabase/client";

/** Signed-out session lookup: null means the guest path, never an error. */
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

/**
 * Guest draft: a local-only project with no owner. It opens the same wizard
 * and workspace, and every AI step degrades to the existing local fallbacks
 * until the visitor signs in.
 */
function createLocalDraft(trimmed: string, model: string | undefined): string {
  const localId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `draft-${Date.now()}`;
  useVibe.getState().addProject({
    id: localId,
    name: deriveProjectName(trimmed) || "Untitled project",
    idea: trimmed,
    status: "draft",
    createdAt: new Date().toISOString(),
    ...(model ? { model } : {}),
  });
  return localId;
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
  if (!session) return createLocalDraft(trimmed, model);

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

  const client = supabaseBrowser();
  const { data: latest, error: latestError } = await client.auth.getSession();
  if (latestError || latest.session?.user.id !== session.user.id) {
    throw new Error("Your account changed while creating the project. Please try again.");
  }

  void improveProjectName(project.id, trimmed, model, project.name);
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
