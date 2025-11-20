-- Add missing columns to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Create chat_summaries table
CREATE TABLE IF NOT EXISTS chat_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for chat_summaries
CREATE INDEX IF NOT EXISTS idx_chat_summaries_user_created ON chat_summaries(user_id, created_at DESC);
