-- Ajuste incremental: conserva materiales y datos existentes.
BEGIN;
ALTER TABLE production_materials ADD COLUMN IF NOT EXISTS description varchar(255);
ALTER TABLE production_materials ALTER COLUMN product_unit_id DROP NOT NULL;
COMMIT;
