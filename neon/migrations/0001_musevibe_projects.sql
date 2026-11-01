-- Optional manual setup for the current owner-scoped workspace API.
-- The API also creates this table and index with IF NOT EXISTS on first use.
-- Supabase remains the identity provider; owner_id stores the verified Auth user UUID.
-- Neon is accessed only by server routes using DATABASE_URL, POSTGRES_URL, or STORAGE_DATABASE_URL.
-- Existing legacy public.projects rows are not read, copied, or deleted by this migration.
CREATE TABLE IF NOT EXISTS public.musevibe_projects (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  idea text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT musevibe_projects_state_is_object
    CHECK (jsonb_typeof(workspace_state) = 'object')
);

CREATE INDEX IF NOT EXISTS musevibe_projects_owner_updated_idx
  ON public.musevibe_projects (owner_id, updated_at DESC, created_at DESC);
