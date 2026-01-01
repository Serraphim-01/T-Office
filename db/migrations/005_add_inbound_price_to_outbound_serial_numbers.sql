-- Add inbound_price column to outbound_serial_numbers table
ALTER TABLE outbound_serial_numbers 
ADD COLUMN IF NOT EXISTS inbound_price DECIMAL(10, 2) DEFAULT 0.00;

-- Update existing indexes if needed
CREATE INDEX IF NOT EXISTS idx_outbound_serial_numbers_inbound_price ON outbound_serial_numbers(inbound_price);