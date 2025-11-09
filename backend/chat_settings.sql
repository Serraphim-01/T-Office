-- Create chat_settings table for pause functionality
CREATE TABLE chat_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    paused_by INTEGER REFERENCES users(id),
    paused_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO chat_settings (id, is_paused)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
