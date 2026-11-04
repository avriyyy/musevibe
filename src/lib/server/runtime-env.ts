/** Read server-only environment values at runtime (Vercel/Node functions). */
export function getRuntimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Prefer an explicit URL, then the connection strings owned by the
 * currently installed Vercel Neon integration (STORAGE_* prefix), then
 * the legacy POSTGRES_* aliases as fallbacks. The legacy aliases are
 * orphaned: they carry no integration link, and on production they
 * resolve to a database the app can no longer reach, which surfaced as
 * a storage_connect failure. Within each set, a direct (non-pooling)
 * endpoint comes first: the Neon serverless HTTP driver talks to one
 * endpoint per query, so a direct endpoint is the most compatible
 * choice for DDL and single-statement writes.
 */
export function getDatabaseConnectionString(): string | undefined {
  return (
    getRuntimeEnv("DATABASE_URL") ??
    getRuntimeEnv("STORAGE_DATABASE_URL_UNPOOLED") ??
    getRuntimeEnv("STORAGE_DATABASE_URL") ??
    getRuntimeEnv("POSTGRES_URL_NON_POOLING") ??
    getRuntimeEnv("POSTGRES_URL")
  );
}
