-- Migration: Update location management to use global locations table
-- This migration updates the system to use the global locations table with created_by field
-- instead of the separate user_locations table

-- ===========================================
-- NOTES
-- ===========================================

-- The global locations table already exists and has a created_by field.
-- User locations are now stored in the global locations table with created_by = userId.
-- This allows locations created by users to be visible to all users for clock-in purposes,
-- while still maintaining ownership through the created_by field.

-- If you have existing data in user_locations table, you may need to migrate it:
-- INSERT INTO locations (name, latitude, longitude, radius_meters, address, created_by, is_active, created_at, updated_at)
-- SELECT name, latitude, longitude, radius_meters, address, user_id, is_active, created_at, updated_at
-- FROM user_locations;

-- After migration, you can drop the old user_locations table:
-- DROP TABLE IF EXISTS user_locations CASCADE;

-- ===========================================
-- NO SCHEMA CHANGES NEEDED
-- ===========================================

-- The locations table already has the required structure:
-- - id SERIAL PRIMARY KEY
-- - name VARCHAR(255) NOT NULL
-- - latitude DECIMAL(10, 8) NOT NULL
-- - longitude DECIMAL(11, 8) NOT NULL
-- - radius_meters INTEGER NOT NULL DEFAULT 100
-- - address TEXT
-- - is_active BOOLEAN DEFAULT true
-- - created_by INTEGER REFERENCES users(id)
-- - created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- - updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
