-- MuseVibe database schema. Cloud rows belong to a signed-in Supabase user.
-- The application stores one atomic workspace snapshot per project in JSONB;
-- normalized child tables remain available for future query-heavy features.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  idea text not null,
  created_at timestamptz default now(),
  workspace_state jsonb not null default '{}'::jsonb
);

create table if not exists public.prds (
  project_id uuid primary key references public.projects(id) on delete cascade,
  markdown text not null default '',
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  linked_screen_id text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  canvas_json text not null default '{}',
  components text[] default '{}'
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  language text not null default 'tsx'
);

-- Keep this script usable on installations created from the earlier schema.
alter table public.projects add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.projects add column if not exists workspace_state jsonb not null default '{}'::jsonb;

alter table public.projects enable row level security;
alter table public.prds enable row level security;
alter table public.tasks enable row level security;
alter table public.screens enable row level security;
alter table public.files enable row level security;

drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists prds_owner_all on public.prds;
create policy prds_owner_all on public.prds for all to authenticated
  using (exists (select 1 from public.projects p where p.id = prds.project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = prds.project_id and p.owner_id = (select auth.uid())));

drop policy if exists tasks_owner_all on public.tasks;
create policy tasks_owner_all on public.tasks for all to authenticated
  using (exists (select 1 from public.projects p where p.id = tasks.project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = tasks.project_id and p.owner_id = (select auth.uid())));

drop policy if exists screens_owner_all on public.screens;
create policy screens_owner_all on public.screens for all to authenticated
  using (exists (select 1 from public.projects p where p.id = screens.project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = screens.project_id and p.owner_id = (select auth.uid())));

drop policy if exists files_owner_all on public.files;
create policy files_owner_all on public.files for all to authenticated
  using (exists (select 1 from public.projects p where p.id = files.project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = files.project_id and p.owner_id = (select auth.uid())));
