-- Location-based attendance tracking schema

-- Table for storing configured locations/geofences
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100, -- Geofence radius in meters
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking user location events (entry/exit from geofences)
CREATE TABLE IF NOT EXISTS location_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    location_id INTEGER REFERENCES locations(id) NOT NULL,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('entry', 'exit')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(5, 2), -- Location accuracy in meters
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_auto_generated BOOLEAN DEFAULT false -- True for automatic events, false for manual
);

-- Table for automatic attendance records triggered by location events
CREATE TABLE IF NOT EXISTS auto_attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    location_event_id INTEGER REFERENCES location_events(id) NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_events_user_timestamp ON location_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_location_timestamp ON location_events(location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auto_attendance_user_timestamp ON auto_attendance(user_id, timestamp DESC);

-- Update trigger for locations table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
