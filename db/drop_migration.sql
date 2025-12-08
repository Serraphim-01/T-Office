-- Drop Migration: Drop all database tables, triggers, and relationships
-- This script removes all database objects in the correct order to avoid dependency issues

-- Disable triggers to prevent issues during deletion
SET session_replication_role = replica;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_user_details_updated_at ON user_details;
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
DROP TRIGGER IF EXISTS update_inductions_updated_at ON inductions;
DROP TRIGGER IF EXISTS update_hr_queries_updated_at ON hr_queries;
DROP TRIGGER IF EXISTS update_wiki_topics_updated_at ON wiki_topics;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
DROP TRIGGER IF EXISTS update_user_locations_updated_at ON user_locations;
DROP TRIGGER IF EXISTS update_compliance_documents_updated_at ON compliance_documents;
DROP TRIGGER IF EXISTS update_crawled_sites_updated_at ON crawled_sites;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_inbound_transactions_updated_at ON inbound_transactions;
DROP TRIGGER IF EXISTS update_outbound_transactions_updated_at ON outbound_transactions;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_wiki_comments_updated_at ON wiki_comments;
DROP TRIGGER IF EXISTS update_user_support_assignments_updated_at ON user_support_assignments;
DROP TRIGGER IF EXISTS update_provider_user_assignments_updated_at ON provider_user_assignments;
DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON user_notifications; -- Add this line

-- Drop role-related indexes
DROP INDEX IF EXISTS idx_roles_department_id;
DROP INDEX IF EXISTS idx_role_page_access_role_id;
DROP INDEX IF EXISTS idx_users_role_id;

-- Drop tables in reverse order of creation (due to foreign key constraints)
DROP TABLE IF EXISTS wiki_comments CASCADE;
DROP TABLE IF EXISTS wiki_lesson_completions CASCADE;
DROP TABLE IF EXISTS wiki_questions CASCADE;
DROP TABLE IF EXISTS wiki_topics CASCADE;
DROP TABLE IF EXISTS user_activities CASCADE;
DROP TABLE IF EXISTS user_details CASCADE;
DROP TABLE IF EXISTS chat_summaries CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS inductions CASCADE;
DROP TABLE IF EXISTS query_replies CASCADE;
DROP TABLE IF EXISTS query_types CASCADE;
DROP TABLE IF EXISTS hr_queries CASCADE;
DROP TABLE IF EXISTS user_locations CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS location_events CASCADE;
DROP TABLE IF EXISTS auto_attendance CASCADE;
DROP TABLE IF EXISTS compliance_documents CASCADE;
DROP TABLE IF EXISTS crawled_sites CASCADE;
DROP TABLE IF EXISTS role_page_access CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS department_page_access CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS outbound_serial_numbers CASCADE;
DROP TABLE IF EXISTS outbound_transactions CASCADE;
DROP TABLE IF EXISTS inbound_serial_numbers CASCADE;
DROP TABLE IF EXISTS inbound_transactions CASCADE;
DROP TABLE IF EXISTS user_support_assignments CASCADE;
DROP TABLE IF EXISTS provider_user_assignments CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE; -- Add this line

-- Remove role_id column from users table (only if table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users DROP COLUMN IF EXISTS role_id;
    END IF;
END $$;

-- Drop users table last
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Re-enable triggers
SET session_replication_role = DEFAULT;