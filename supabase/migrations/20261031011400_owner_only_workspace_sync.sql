ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS workspace_state jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_owner_all ON public.projects;
CREATE POLICY projects_owner_all ON public.projects FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS prds_owner_all ON public.prds;
CREATE POLICY prds_owner_all ON public.prds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = prds.project_id AND p.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = prds.project_id AND p.owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS tasks_owner_all ON public.tasks;
CREATE POLICY tasks_owner_all ON public.tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS screens_owner_all ON public.screens;
CREATE POLICY screens_owner_all ON public.screens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = screens.project_id AND p.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = screens.project_id AND p.owner_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS files_owner_all ON public.files;
CREATE POLICY files_owner_all ON public.files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = files.project_id AND p.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = files.project_id AND p.owner_id = (SELECT auth.uid())));
