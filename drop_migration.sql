-- Drop Migration: Remove all database tables in reverse dependency order
-- This script drops all tables to allow for a clean database reset

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS wiki_lesson_completions CASCADE;
DROP TABLE IF EXISTS wiki_questions CASCADE;
DROP TABLE IF EXISTS wiki_topics CASCADE;

DROP TABLE IF EXISTS auto_attendance CASCADE;
DROP TABLE IF EXISTS location_events CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

DROP TABLE IF EXISTS product_states CASCADE;
DROP TABLE IF EXISTS sub_products CASCADE;
DROP TABLE IF EXISTS products CASCADE;

DROP TABLE IF EXISTS hr_queries CASCADE;
DROP TABLE IF EXISTS inductions CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;

DROP TABLE IF EXISTS compliance_documents CASCADE;
DROP TABLE IF EXISTS crawled_sites CASCADE;

DROP TABLE IF EXISTS user_details CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining indexes or constraints
DROP INDEX IF EXISTS idx_wiki_topics_department CASCADE;
DROP INDEX IF EXISTS idx_wiki_topics_topic CASCADE;
DROP INDEX IF EXISTS idx_wiki_questions_topic_id CASCADE;
DROP INDEX IF EXISTS idx_wiki_completions_user_id CASCADE;
DROP INDEX IF EXISTS idx_wiki_completions_topic_id CASCADE;
DROP INDEX IF EXISTS idx_location_events_user_timestamp CASCADE;
DROP INDEX IF EXISTS idx_location_events_location_timestamp CASCADE;
DROP INDEX IF EXISTS idx_auto_attendance_user_timestamp CASCADE;

-- Drop any custom functions or triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations CASCADE;
