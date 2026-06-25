-- История на обекти (събития + запазване при изтриване)
CREATE TABLE IF NOT EXISTS public.project_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  project_name text NOT NULL,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  actor_name text,
  kind text NOT NULL,
  title text NOT NULL,
  detail text,
  amount_eur numeric(14, 2),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_events_project_id_idx
  ON public.project_events (project_id);

CREATE INDEX IF NOT EXISTS project_events_company_id_idx
  ON public.project_events (company_id);

ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_project_events" ON public.project_events;
CREATE POLICY "authenticated_all_project_events" ON public.project_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
