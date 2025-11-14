-- Migration: Create user_locations table and related components
-- This migration adds user-specific location management functionality

-- ===========================================
-- USER LOCATIONS TABLE
-- ===========================================

-- User-specific locations table for custom location management
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name) -- Prevent duplicate location names per user
);

-- ===========================================
-- INDEXES FOR USER LOCATIONS
-- ===========================================

-- User locations indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_active ON user_locations(user_id, is_active);

-- ===========================================
-- TRIGGERS FOR USER LOCATIONS
-- ===========================================

-- Update trigger for user_locations (only create if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_locations_updated_at') THEN
        CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ===========================================
-- INITIAL DATA FOR USER LOCATIONS (Optional)
-- ===========================================

-- You can add initial user locations here if needed
-- Example:
-- INSERT INTO user_locations (user_id, name, latitude, longitude, radius_meters, address) VALUES
-- (1, 'Home Office', 40.7128, -74.0060, 50, '123 Home St, City, State'),
-- (2, 'Secondary Location', 40.7589, -73.9851, 75, '456 Work Ave, City, State')
-- ON CONFLICT (user_id, name) DO NOTHING;
