-- Добавя цена в EUR за складови артикули (пускай веднъж върху съществуваща база).
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit_cost_eur numeric(14, 4);

COMMENT ON COLUMN public.inventory_items.unit_cost_eur IS
  'Цена за 1 мерна единица в EUR; може да се изчисли от общо платено при зареждане.';
