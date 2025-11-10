-- Wiki Lesson Completions Table
CREATE TABLE wiki_lesson_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES wiki_topics(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Create index for better performance
CREATE INDEX idx_wiki_completions_user_id ON wiki_lesson_completions(user_id);
CREATE INDEX idx_wiki_completions_topic_id ON wiki_lesson_completions(topic_id);
