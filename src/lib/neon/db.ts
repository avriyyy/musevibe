import { neon } from "@neondatabase/serverless";

/**
 * Server-only Neon client (HTTP driver: no persistent pool, safe on
 * Vercel serverless).
 *
 * Connection string resolution, in order:
 *  1. DATABASE_URL (manual setup)
 *  2. POSTGRES_URL / STORAGE_DATABASE_URL (names the Vercel Neon
 *     integration injects automatically; the integration does NOT
 *     create a plain DATABASE_URL)
 */
export function neonSql() {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.STORAGE_DATABASE_URL?.trim() ||
    "";
  if (!url) {
    throw new Error("No Neon connection string configured.");
  }
  return neon(url);
}

/**
 * Idempotently creates the MuseVibe tables in Neon (same DDL as
 * neon/schema.sql, which stays the source of truth for manual runs).
 * Runs at most once per serverless instance; safe to call on every
 * /api/sync request because every statement is IF NOT EXISTS.
 */
let schemaPromise: Promise<void> | null = null;

export function ensureNeonSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = neonSql();
      await sql`
        create table if not exists public.projects (
          id uuid primary key,
          owner_id text not null,
          name text not null,
          idea text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          workspace_state jsonb not null default '{}'::jsonb
        )
      `;
      await sql`
        create index if not exists projects_owner_created_idx
          on public.projects (owner_id, created_at desc)
      `;
      await sql`
        create table if not exists public.prds (
          project_id uuid primary key references public.projects(id) on delete cascade,
          markdown text not null default '',
          updated_at timestamptz not null default now()
        )
      `;
      await sql`
        create table if not exists public.tasks (
          id uuid primary key default gen_random_uuid(),
          project_id uuid references public.projects(id) on delete cascade,
          title text not null,
          status text not null default 'todo',
          linked_screen_id text,
          notes text,
          created_at timestamptz not null default now()
        )
      `;
      await sql`
        create index if not exists tasks_project_idx on public.tasks (project_id)
      `;
      await sql`
        create table if not exists public.screens (
          id uuid primary key default gen_random_uuid(),
          project_id uuid references public.projects(id) on delete cascade,
          name text not null,
          canvas_json text not null default '{}',
          components text[] default '{}'
        )
      `;
      await sql`
        create index if not exists screens_project_idx on public.screens (project_id)
      `;
      await sql`
        create table if not exists public.files (
          id uuid primary key default gen_random_uuid(),
          project_id uuid references public.projects(id) on delete cascade,
          path text not null,
          content text not null default '',
          language text not null default 'tsx'
        )
      `;
      await sql`
        create index if not exists files_project_idx on public.files (project_id)
      `;
    })().catch((error) => {
      // Let the next request retry instead of caching a failure forever.
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}
