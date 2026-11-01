import { createClient } from "@supabase/supabase-js";

/**
 * Verifies a Supabase access token (Authorization: Bearer <token>) and
 * returns the Supabase user id, or null when the token is missing or
 * invalid. This is the ownership boundary for Neon data: every Neon
 * query in /api/sync is scoped to this id, because Neon itself has no
 * RLS and no link to Supabase Auth.
 */
export async function getSupabaseUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
