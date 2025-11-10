-- Wiki Topics Table
CREATE TABLE wiki_topics (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT, -- Optional video URL for the topic
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(department, topic)
);

-- Wiki Questions Table
CREATE TABLE wiki_questions (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES wiki_topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options
    correct_answer INTEGER NOT NULL, -- Index of correct option (0-based)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_wiki_topics_department ON wiki_topics(department);
CREATE INDEX idx_wiki_topics_topic ON wiki_topics(topic);
CREATE INDEX idx_wiki_questions_topic_id ON wiki_questions(topic_id);
