-- Create the table for the master compliance document
CREATE TABLE IF NOT EXISTS compliance_documents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the table for the websites to be crawled
CREATE TABLE IF NOT EXISTS crawled_sites (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    url TEXT NOT NULL,
    last_crawled_at TIMESTAMPTZ,
    content_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert an initial empty compliance document so the app can assume one exists
INSERT INTO compliance_documents (content) VALUES ('');
