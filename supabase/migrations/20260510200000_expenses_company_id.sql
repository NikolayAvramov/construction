-- Разходи към фирмата без задължителен обект (гориво, осигуровки и т.н.).
-- 1) Добавя company_id  2) Попълва от обекта  3) Задължителна колона
-- 4) NOTIFY — задължително за Supabase: опреснява API schema cache (иначе още виждате „Could not find company_id“).

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE;

UPDATE public.expenses e
SET company_id = p.company_id
FROM public.projects p
WHERE e.project_id = p.id
  AND e.company_id IS NULL;

-- Ако SET NOT NULL гърми: има редове без обект и без фирма — задайте им company_id или изтрийте ги.
ALTER TABLE public.expenses ALTER COLUMN company_id SET NOT NULL;

-- Без това PostgREST често още „не вижда“ новата колона от приложението.
NOTIFY pgrst, 'reload schema';
