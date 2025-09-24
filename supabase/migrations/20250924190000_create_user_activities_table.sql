-- Create the table for user activities
CREATE TABLE IF NOT EXISTS user_activities (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- Use SET NULL in case a user is deleted
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);