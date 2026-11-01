import { neon } from "@neondatabase/serverless";

/**
 * Server-only Neon client (HTTP driver: no persistent pool, safe on
 * Vercel serverless). Throws when DATABASE_URL is missing so the API
 * route can answer 503 instead of failing silently.
 */
export function neonSql() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(url);
}
