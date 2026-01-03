-- Migration to add unit_price column to inbound_transactions table
-- This column will store the actual purchase price for each inbound transaction
-- which may differ from the product's default_unit_price

ALTER TABLE inbound_transactions 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0.00;

-- Add an index for better query performance on unit_price
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_unit_price 
ON inbound_transactions(unit_price);

-- Update any existing records to have the unit_price set to 0.00 (default)
UPDATE inbound_transactions 
SET unit_price = 0.00 
WHERE unit_price IS NULL;