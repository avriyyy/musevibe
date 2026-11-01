-- MuseVibe data schema for Neon Postgres.
--
-- Auth stays on Supabase (see src/lib/supabase/client.ts). This database
-- holds ONLY application data. There is no foreign key to auth.users and
-- no Row Level Security here: ownership is enforced in the API route
-- (src/app/api/sync/route.ts), which verifies the caller's Supabase JWT
-- and only ever reads/writes rows whose owner_id matches that user.
--
-- How to apply: paste this file into the Neon SQL editor, or run it with
-- psql against the Neon connection string (the Vercel Neon integration
-- exposes it as DATABASE_URL).
--
-- One atomic workspace snapshot per project, exactly like the previous
-- Supabase schema: the full workspace (project, PRD, tasks, screens,
-- files, docs) lives in workspace_state as JSONB. The normalized child
-- tables below are kept for future query-heavy features and are not
-- written by the current sync code.

create table if not exists public.projects (
  id uuid primary key,
  -- Supabase Auth user id (uuid as text). No FK: Supabase Auth and Neon
  -- are separate systems; the API route guarantees owner_id = caller.
  owner_id text not null,
  name text not null,
  idea text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  workspace_state jsonb not null default '{}'::jsonb
);

create index if not exists projects_owner_created_idx
  on public.projects (owner_id, created_at desc);

create table if not exists public.prds (
  project_id uuid primary key references public.projects(id) on delete cascade,
  markdown text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  linked_screen_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks (project_id);

create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  canvas_json text not null default '{}',
  components text[] default '{}'
);

create index if not exists screens_project_idx on public.screens (project_id);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  language text not null default 'tsx'
);

create index if not exists files_project_idx on public.files (project_id);
