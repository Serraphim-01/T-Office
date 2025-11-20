-- Update Inductions Table Schema
-- This script modifies the inductions table to match the frontend expectations

-- Add missing columns
ALTER TABLE inductions 
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS induction_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';

-- Remove unused columns that don't match the frontend expectations
ALTER TABLE inductions 
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS scheduled_date,
DROP COLUMN IF EXISTS completed_date,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS assigned_by,
DROP COLUMN IF EXISTS notes;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inductions_department ON inductions(department);
CREATE INDEX IF NOT EXISTS idx_inductions_time ON inductions(induction_time);