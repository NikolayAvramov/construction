-- Добавя дневна ставка (надник) към работниците. Пусни веднъж в Supabase SQL Editor.
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS nadnik numeric(12, 2);
