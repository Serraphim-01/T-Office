-- Wiki Topics Table
CREATE TABLE wiki_topics (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(department, topic)
);

-- Create index for better performance
CREATE INDEX idx_wiki_topics_department ON wiki_topics(department);
CREATE INDEX idx_wiki_topics_topic ON wiki_topics(topic);
