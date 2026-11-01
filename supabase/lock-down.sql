-- Legacy safety helper: enabling RLS without owner policies blocks browser
-- access. The owner-only policies are installed by the migration
-- 20261031011400_owner_only_workspace_sync.sql; use that migration instead of
-- running this file independently.
--
-- These statements are intentionally left as a reference for the protected
-- tables and are safe to repeat after the policies have been installed.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
