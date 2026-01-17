-- Migration: create_chatbot_tables
-- Description: Create tables for chatbot functionality and conversation history

-- Create chatbot conversations table to store conversation history
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'user', -- 'user' or 'bot'
    context JSONB DEFAULT '{}', -- Store context/references used to generate response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chatbot knowledge base table for storing pre-defined responses and training data
CREATE TABLE IF NOT EXISTS chatbot_knowledge_base (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    question_pattern TEXT NOT NULL, -- Regex or keyword pattern to match questions
    response_template TEXT NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher priority patterns are checked first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_session ON chatbot_conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_category ON chatbot_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_active_priority ON chatbot_knowledge_base(is_active, priority DESC);

-- Insert default knowledge base entries for common queries
INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'users', 'how many users|count of users|total users', 'There are {{count}} users in the system.', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'how many users|count of users|total users');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'users', 'users in (.*) department|(.*) department users', 'There are {{count}} users in the {{department}} department.', 9
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'users in (.*) department|(.*) department users');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'users', 'user details|information about user', 'I can help you find user information. Please specify which user you''re looking for.', 8
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'user details|information about user');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'attendance', 'attendance records|clock in|clock out', 'There are {{count}} attendance records in the system. Would you like to see recent records or filter by date?', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'attendance records|clock in|clock out');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'attendance', 'who clocked in today|today''s attendance', 'Today''s attendance shows {{count}} users have clocked in. Would you like to see the list?', 9
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'who clocked in today|today''s attendance');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'inventory', 'products in inventory|inventory count', 'There are {{count}} products in the inventory system.', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'products in inventory|inventory count');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'inventory', 'providers|suppliers', 'There are {{count}} providers/suppliers in the system.', 9
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'providers|suppliers');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'inventory', 'inbound transactions|incoming stock', 'There are {{count}} inbound transactions recorded.', 8
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'inbound transactions|incoming stock');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'inventory', 'outbound transactions|outgoing stock', 'There are {{count}} outbound transactions recorded.', 7
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'outbound transactions|outgoing stock');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'wiki', 'wiki topics|training materials', 'There are {{count}} wiki topics available across {{departments}} departments.', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'wiki topics|training materials');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'wiki', '(.*) department wiki|wiki for (.*)', 'The {{department}} department has {{count}} wiki topics available.', 9
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = '(.*) department wiki|wiki for (.*)');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'hr', 'hr queries|employee queries', 'There are {{count}} HR queries in the system.', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'hr queries|employee queries');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'hr', 'inductions|training sessions', 'There are {{count}} induction/training sessions scheduled.', 9
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'inductions|training sessions');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'system', 'departments|company structure', 'The system has {{count}} departments: {{departments_list}}.', 10
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'departments|company structure');

INSERT INTO chatbot_knowledge_base (category, question_pattern, response_template, priority) 
SELECT 'system', 'help|what can you do', 'I can help you with information about:\n- Users and departments\n- Attendance records\n- Inventory management\n- Wiki/training materials\n- HR queries and inductions\n- System overview\n\nWhat would you like to know?', 5
WHERE NOT EXISTS (SELECT 1 FROM chatbot_knowledge_base WHERE question_pattern = 'help|what can you do');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_chatbot_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chatbot_knowledge_updated_at_trigger 
BEFORE UPDATE ON chatbot_knowledge_base 
FOR EACH ROW EXECUTE FUNCTION update_chatbot_knowledge_updated_at();