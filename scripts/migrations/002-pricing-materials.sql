ALTER TABLE orders ADD COLUMN IF NOT EXISTS agreed_price numeric(12,2);
ALTER TABLE production_materials ADD COLUMN IF NOT EXISTS description varchar(255);
ALTER TABLE production_materials ALTER COLUMN product_unit_id DROP NOT NULL;
