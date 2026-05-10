-- Пълен пакет за „Финанси → заплати“: пусни ВЕДНЪЖ в Supabase SQL Editor, ако още не си пускал поотделните миграции.
-- Редът е важен: първо company_id в expenses, после worker_salary_payouts.
-- В края: NOTIFY опреснява PostgREST schema cache.

-- ─── 1) expenses.company_id (от 20260510200000_expenses_company_id.sql) ───
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE;

UPDATE public.expenses e
SET company_id = p.company_id
FROM public.projects p
WHERE e.project_id = p.id
  AND e.company_id IS NULL;

ALTER TABLE public.expenses ALTER COLUMN company_id SET NOT NULL;

-- ─── 2) worker_salary_payouts (от 20260510210000_worker_salary_payouts.sql) ───
CREATE TABLE IF NOT EXISTS public.worker_salary_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  expense_id uuid REFERENCES public.expenses (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, year, month)
);

CREATE INDEX IF NOT EXISTS worker_salary_payouts_company_ym_idx
  ON public.worker_salary_payouts (company_id, year, month);

ALTER TABLE public.worker_salary_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_worker_salary_payouts"
  ON public.worker_salary_payouts;

CREATE POLICY "authenticated_all_worker_salary_payouts"
  ON public.worker_salary_payouts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
