-- Construction OS — целева схема за Supabase (без Prisma).
-- Приложи в SQL Editor след като проектът е създаден.
-- Auth: Supabase Auth (auth.users). Профилът в приложението е public.profiles.
--
-- Ако получиш „relation ... already exists“: вече си пускал част от схемата.
-- За чист инстал (изтрива данни в тези таблици, не Auth потребителите):
--   1) пусни dev-reset-public-app.sql
--   2) пак пусни целия schema.sql

-- ─── Функция за updated_at ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Companies ─────────────────────────────────────────────────────────────
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Profiles (1:1 с auth.users) ────────────────────────────────────────────
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'BOSS', 'FOREMAN')),
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_company_id_idx ON public.profiles (company_id);
CREATE INDEX profiles_role_idx ON public.profiles (role);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Projects ───────────────────────────────────────────────────────────────
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL,
  total_price numeric(14, 2) NOT NULL,
  advance_payment boolean NOT NULL DEFAULT false,
  advance_amount numeric(14, 2),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_company_id_idx ON public.projects (company_id);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Project foremen (assignments) ─────────────────────────────────────────
CREATE TABLE public.project_foremen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX project_foremen_user_idx ON public.project_foremen (user_id);

-- ─── Worker groups & workers ────────────────────────────────────────────────
CREATE TABLE public.worker_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER worker_groups_updated_at
  BEFORE UPDATE ON public.worker_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'WORKER' CHECK (role IN ('WORKER', 'FOREMAN')),
  group_id uuid REFERENCES public.worker_groups (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Attendance ───────────────────────────────────────────────────────────────
CREATE TABLE public.attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers (id) ON DELETE CASCADE,
  date date NOT NULL,
  present boolean NOT NULL DEFAULT true,
  hours numeric(6, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date)
);

CREATE TRIGGER attendances_updated_at
  BEFORE UPDATE ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Daily work ─────────────────────────────────────────────────────────────
CREATE TABLE public.daily_work_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_planned text NOT NULL DEFAULT '',
  tasks_completed text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, date)
);

CREATE TRIGGER daily_work_entries_updated_at
  BEFORE UPDATE ON public.daily_work_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Inventory ──────────────────────────────────────────────────────────────
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(14, 3) NOT NULL,
  unit text NOT NULL,
  -- Цена за 1 мерна единица (EUR); при добавяне може да се подаде и общо платено
  unit_cost_eur numeric(14, 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  quantity numeric(14, 3) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Finance ────────────────────────────────────────────────────────────────
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(14, 2) NOT NULL,
  date date NOT NULL,
  category text NOT NULL CHECK (
    category IN ('MATERIALS', 'SALARIES', 'INSURANCE', 'OTHER')
  ),
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL,
  date date NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL,
  total_expenses numeric(14, 2) NOT NULL,
  total_revenue numeric(14, 2) NOT NULL,
  profit numeric(14, 2) NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- ─── RLS (минимум — разшири според multi-tenant правила) ─────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_foremen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Временно: всеки автентикиран клиент през anon ключ вижда/пише всичко.
-- ЗАДЪЛЖИТЕЛНО подмени с истински политики преди production.
CREATE POLICY "authenticated_all_companies" ON public.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_profiles" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_project_foremen" ON public.project_foremen
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_worker_groups" ON public.worker_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_workers" ON public.workers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_attendances" ON public.attendances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_daily_work" ON public.daily_work_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_inventory" ON public.inventory_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_movements" ON public.material_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_expenses" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_payments" ON public.payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_monthly_reports" ON public.monthly_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
