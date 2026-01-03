-- Create global_chat_settings table for system-wide chat settings
CREATE TABLE IF NOT EXISTS global_chat_settings (
    id SERIAL PRIMARY KEY,
    is_chat_paused BOOLEAN NOT NULL DEFAULT false,
    paused_by INTEGER REFERENCES users(id),
    paused_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default global chat settings if not exists
INSERT INTO global_chat_settings (id, is_chat_paused) 
SELECT 1, false 
WHERE NOT EXISTS (SELECT 1 FROM global_chat_settings WHERE id = 1);