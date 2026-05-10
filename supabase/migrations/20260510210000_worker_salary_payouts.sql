-- Отбелязва платена заплата за работник за даден месец (връзка с разход).
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
