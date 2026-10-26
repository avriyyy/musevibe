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
