/** Read server-only environment values at runtime (Vercel/Node functions). */
export function getRuntimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Prefer an explicit URL, then accept the standard Vercel Neon integration aliases. */
export function getDatabaseConnectionString(): string | undefined {
  return (
    getRuntimeEnv("DATABASE_URL") ??
    getRuntimeEnv("POSTGRES_URL") ??
    getRuntimeEnv("STORAGE_DATABASE_URL")
  );
}
