/** Read server-only environment values at runtime (Vercel/Node functions). */
export function getRuntimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Prefer an explicit URL, then a direct (non-pooling) Neon endpoint, then
 * the standard Vercel Neon integration aliases. The Neon serverless HTTP
 * driver talks to one endpoint per query, so a direct endpoint is the
 * most compatible choice for DDL and single-statement writes; the pooled
 * aliases stay as fallbacks for the same database.
 */
export function getDatabaseConnectionString(): string | undefined {
  return (
    getRuntimeEnv("DATABASE_URL") ??
    getRuntimeEnv("POSTGRES_URL_NON_POOLING") ??
    getRuntimeEnv("STORAGE_DATABASE_URL_UNPOOLED") ??
    getRuntimeEnv("POSTGRES_URL") ??
    getRuntimeEnv("STORAGE_DATABASE_URL")
  );
}
