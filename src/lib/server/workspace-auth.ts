import { createClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "./runtime-env";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
};

export function workspaceJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: PRIVATE_HEADERS });
}

export async function verifyWorkspaceBearerToken(
  request: Request,
  verifyToken: (token: string) => Promise<{ id: string } | null>,
): Promise<{ user: { id: string } } | { response: Response }> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1];
  if (!token) {
    return { response: workspaceJson({ error: "Sign in is required." }, 401) };
  }

  try {
    const user = await verifyToken(token);
    if (!user || typeof user.id !== "string" || !user.id) {
      return { response: workspaceJson({ error: "Sign in is required." }, 401) };
    }
    return { user: { id: user.id } };
  } catch {
    return { response: workspaceJson({ error: "Account service is unavailable." }, 503) };
  }
}

export async function requireWorkspaceUser(
  request: Request,
): Promise<{ user: { id: string } } | { response: Response }> {
  const supabaseUrl = getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRuntimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: workspaceJson({ error: "Account service is not configured." }, 503),
    };
  }

  return verifyWorkspaceBearerToken(request, async (token) => {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  });
}
