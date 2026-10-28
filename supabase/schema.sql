-- MuseVibe schema (jalankan di Supabase SQL editor)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  idea text not null,
  created_at timestamptz default now()
);

create table if not exists prds (
  project_id uuid primary key references projects(id) on delete cascade,
  markdown text not null default '',
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  linked_screen_id text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists screens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  canvas_json text not null default '{}',
  components text[] default '{}'
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  language text not null default 'tsx'
);

-- The demo keeps every project in localStorage, so these tables have no public
-- reader or writer yet. RLS with no policies locks them to the service role:
-- the anon key can no longer read or modify rows. When server sync ships, add
-- auth.uid() owner policies here rather than disabling RLS again.
alter table projects enable row level security;
alter table prds enable row level security;
alter table tasks enable row level security;
alter table screens enable row level security;
alter table files enable row level security;
