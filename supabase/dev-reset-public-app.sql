-- ═══════════════════════════════════════════════════════════════════════════
-- САМО ЗА ЛОКАЛЕН / ТЕСТ ПРОЕКТ — изтрива ВСИЧКИ данни в таблиците на приложението.
-- НЕ изтрива auth.users (логините в Authentication остават).
-- Редът е по foreign keys: първо децата, после родителите.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.monthly_reports CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.material_movements CASCADE;
DROP TABLE IF EXISTS public.attendances CASCADE;
DROP TABLE IF EXISTS public.workers CASCADE;
DROP TABLE IF EXISTS public.worker_groups CASCADE;
DROP TABLE IF EXISTS public.daily_work_entries CASCADE;
DROP TABLE IF EXISTS public.project_foremen CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Функцията остава; schema.sql я презаписва с CREATE OR REPLACE.
