-- Create Migration: Create all database tables with schemas and populate with initial data
-- This script creates a complete database schema for the office management system
-- Includes chat columns and induction schema updates

-- ===========================================
-- USER MANAGEMENT TABLES
-- ===========================================

-- Users table (core user information)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User details table (extended user information)
CREATE TABLE IF NOT EXISTS user_details (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    date_of_birth DATE,
    hire_date DATE,
    position VARCHAR(100),
    manager_id INTEGER REFERENCES users(id),
    profile_picture_url TEXT,
    certifications JSONB DEFAULT '[]',
    cv TEXT,
    portfolio TEXT,
    job_description TEXT,
    contract TEXT,
    query_count INTEGER DEFAULT 0,
    attendance JSONB DEFAULT '[]',
    other_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User activities table (audit log)
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- CHAT SYSTEM TABLES
-- ===========================================

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    is_moderator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Create chat_settings table for pause functionality
CREATE TABLE IF NOT EXISTS chat_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    paused_by INTEGER REFERENCES users(id),
    paused_at TIMESTAMP WITH TIME ZONE,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    auto_summarize BOOLEAN DEFAULT false,
    summary_interval INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create global_chat_settings table for system-wide settings
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

-- Create chat_summaries table
CREATE TABLE IF NOT EXISTS chat_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- HR FEATURES TABLES
-- ===========================================

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inductions table
CREATE TABLE IF NOT EXISTS inductions (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100),
    induction_time TIMESTAMP WITH TIME ZONE,
    attendees JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR queries table
CREATE TABLE IF NOT EXISTS hr_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    query_type VARCHAR(100), -- Added for query types
    is_locked BOOLEAN DEFAULT false, -- Added for locked queries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query types table for predefined query types
CREATE TABLE IF NOT EXISTS query_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query replies table for query responses
CREATE TABLE IF NOT EXISTS query_replies (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES hr_queries(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    replied_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- WIKI SYSTEM TABLES
-- ===========================================

-- Wiki Topics Table
CREATE TABLE IF NOT EXISTS wiki_topics (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    video_url TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(department, topic)
);

-- Wiki Questions Table
CREATE TABLE IF NOT EXISTS wiki_questions (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER REFERENCES wiki_topics(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wiki Lesson Completions Table
CREATE TABLE IF NOT EXISTS wiki_lesson_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES wiki_topics(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Wiki Comments Table
CREATE TABLE IF NOT EXISTS wiki_comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES wiki_topics(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===========================================
-- LOCATION/GEOFENCING TABLES
-- ===========================================

-- Location-based attendance tracking schema
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-specific locations table for custom location management
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name) -- Prevent duplicate location names per user
);

-- ===========================================
-- DEPARTMENT CONFIGURATION TABLES
-- ===========================================

-- Department page access table
CREATE TABLE IF NOT EXISTS department_page_access (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (department_id, page_name)
);

-- Location events table
CREATE TABLE IF NOT EXISTS location_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    location_id INTEGER REFERENCES locations(id) NOT NULL,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('entry', 'exit')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_auto_generated BOOLEAN DEFAULT false
);

-- Auto attendance records
CREATE TABLE IF NOT EXISTS auto_attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    location_event_id INTEGER REFERENCES location_events(id) NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- ===========================================
-- COMPLIANCE TABLES
-- ===========================================

-- Compliance documents table
CREATE TABLE IF NOT EXISTS compliance_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(100),
    file_url TEXT,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crawled sites table
CREATE TABLE IF NOT EXISTS crawled_sites (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    last_crawled TIMESTAMP WITH TIME ZONE,
    crawl_status VARCHAR(20) DEFAULT 'pending',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INVENTORY TABLES
-- ===========================================

-- Providers table
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    official_contact_name VARCHAR(255),
    official_contact_email VARCHAR(255),
    official_contact_phone VARCHAR(20),
    organization_contact_name VARCHAR(255),
    organization_contact_email VARCHAR(255),
    organization_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider-User Assignment Table
CREATE TABLE IF NOT EXISTS provider_user_assignments (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'attached_staff', -- 'attached_staff', 'support_staff', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, user_id, assignment_type)
);

-- User Support Staff Assignment Table
CREATE TABLE IF NOT EXISTS user_support_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    support_staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, support_staff_id)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    provider_id INTEGER REFERENCES providers(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INVENTORY INBOUND TABLES
-- ===========================================

-- Inbound transactions table
CREATE TABLE IF NOT EXISTS inbound_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    provider_id INTEGER REFERENCES providers(id) ON DELETE RESTRICT,
    expected_arrival_start DATE NOT NULL,
    expected_arrival_end DATE NOT NULL,
    arrival_date DATE,
    status VARCHAR(20) DEFAULT 'Incoming' CHECK (status IN ('Incoming', 'Stored', 'Outbound')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbound serial numbers table
CREATE TABLE IF NOT EXISTS inbound_serial_numbers (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES inbound_transactions(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id, serial_number)
);

-- ===========================================
-- INVENTORY OUTBOUND TABLES
-- ===========================================

-- Outbound transactions table
CREATE TABLE IF NOT EXISTS outbound_transactions (
    id SERIAL PRIMARY KEY,
    inbound_transaction_id INTEGER REFERENCES inbound_transactions(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    receiver_address TEXT NOT NULL,
    receiver_email VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    dispatch_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'Outgoing' CHECK (status IN ('Outgoing', 'Dispatched', 'Delivered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outbound serial numbers table
CREATE TABLE IF NOT EXISTS outbound_serial_numbers (
    id SERIAL PRIMARY KEY,
    outbound_transaction_id INTEGER REFERENCES outbound_transactions(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(outbound_transaction_id, serial_number)
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_timestamp ON user_activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details(user_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_user_created ON chat_summaries(user_id, created_at DESC);

-- HR indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_hr_queries_assigned_to ON hr_queries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hr_queries_user_id ON hr_queries(user_id); -- Added for better query performance
CREATE INDEX IF NOT EXISTS idx_hr_queries_query_type ON hr_queries(query_type); -- Added for query type filtering
CREATE INDEX IF NOT EXISTS idx_query_replies_query_id ON query_replies(query_id); -- Added for reply performance
CREATE INDEX IF NOT EXISTS idx_inductions_department ON inductions(department);
CREATE INDEX IF NOT EXISTS idx_inductions_time ON inductions(induction_time);

-- Wiki indexes
CREATE INDEX IF NOT EXISTS idx_wiki_topics_department ON wiki_topics(department);
CREATE INDEX IF NOT EXISTS idx_wiki_topics_topic ON wiki_topics(topic);
CREATE INDEX IF NOT EXISTS idx_wiki_questions_topic_id ON wiki_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_user_id ON wiki_lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_topic_id ON wiki_lesson_completions(topic_id);
CREATE INDEX IF NOT EXISTS idx_wiki_comments_user_id ON wiki_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_comments_topic_id ON wiki_comments(topic_id);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_active ON user_locations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_location_events_user_timestamp ON location_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_location_timestamp ON location_events(location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auto_attendance_user_timestamp ON auto_attendance(user_id, timestamp DESC);

-- Providers indexes
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products(part_number);
CREATE INDEX IF NOT EXISTS idx_products_provider_id ON products(provider_id);

-- Inbound indexes
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_product_id ON inbound_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_provider_id ON inbound_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_status ON inbound_transactions(status);
CREATE INDEX IF NOT EXISTS idx_inbound_serial_numbers_transaction_id ON inbound_serial_numbers(transaction_id);

-- Outbound indexes
CREATE INDEX IF NOT EXISTS idx_outbound_transactions_inbound_id ON outbound_transactions(inbound_transaction_id);
CREATE INDEX IF NOT EXISTS idx_outbound_transactions_status ON outbound_transactions(status);
CREATE INDEX IF NOT EXISTS idx_outbound_serial_numbers_transaction_id ON outbound_serial_numbers(outbound_transaction_id);

-- User Support Staff Assignment indexes
CREATE INDEX IF NOT EXISTS idx_user_support_assignments_user_id ON user_support_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_support_assignments_support_staff_id ON user_support_assignments(support_staff_id);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_details_updated_at BEFORE UPDATE ON user_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inductions_updated_at BEFORE UPDATE ON inductions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hr_queries_updated_at BEFORE UPDATE ON hr_queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wiki_topics_updated_at BEFORE UPDATE ON wiki_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_documents_updated_at BEFORE UPDATE ON compliance_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crawled_sites_updated_at BEFORE UPDATE ON crawled_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wiki_comments_updated_at BEFORE UPDATE ON wiki_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inbound_transactions_updated_at BEFORE UPDATE ON inbound_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_transactions_updated_at BEFORE UPDATE ON outbound_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_support_assignments table
CREATE TRIGGER update_user_support_assignments_updated_at BEFORE UPDATE ON user_support_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to provider_user_assignments table
CREATE TRIGGER update_provider_user_assignments_updated_at BEFORE UPDATE ON provider_user_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INITIAL DATA POPULATION
-- ===========================================

-- Insert default departments
INSERT INTO departments (name, description) VALUES
('Admin', 'Administrative department with full system access'),
('HR', 'Human Resources department'),
('Engineering', 'Engineering and technical department'),
('Sales', 'Sales and business development'),
('Compliance', 'Compliance and regulatory affairs'),
('Finance', 'Financial operations and accounting'),
('Marketing', 'Marketing and communications'),
('IT', 'Information Technology support'),
('Legal', 'Legal and corporate affairs'),
('Security', 'Security and safety operations'),
('Facilities', 'Facilities and maintenance'),
('Operations', 'Operations and logistics')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
-- REMOVED: Sample products will not be inserted during migration

-- Truncate all inventory tables to ensure they are empty
TRUNCATE TABLE inbound_serial_numbers, inbound_transactions, outbound_serial_numbers, outbound_transactions, products, providers RESTART IDENTITY CASCADE;

-- Insert sample wiki topics
INSERT INTO wiki_topics (department, topic, content, video_url) VALUES
('HR', 'Company Policies', 'This section covers all company policies including code of conduct, dress code, and workplace guidelines.', NULL),
('HR', 'Benefits Overview', 'Information about health insurance, retirement plans, paid time off, and other employee benefits.', NULL),
('IT', 'Password Security', 'Guidelines for creating and maintaining secure passwords, including password requirements and best practices.', NULL),
('IT', 'Remote Access Setup', 'Step-by-step instructions for setting up remote access to company systems and VPN configuration.', NULL),
('Compliance', 'Data Protection', 'GDPR compliance requirements, data handling procedures, and privacy policies.', NULL),
('Finance', 'Expense Reporting', 'How to submit expense reports, reimbursement policies, and approval processes.', NULL),
('Engineering', 'Code Review Process', 'Guidelines for code reviews, pull request procedures, and quality standards.', NULL),
('Sales', 'CRM Usage', 'Training materials for using the company CRM system effectively.', NULL)
ON CONFLICT (department, topic) DO NOTHING;

-- Insert sample wiki questions
INSERT INTO wiki_questions (topic_id, question, options, correct_answer) VALUES
(1, 'What is the company''s dress code policy?', '["Business casual", "Casual", "Formal business attire", "No specific dress code"]', 0),
(1, 'How many days of paid vacation do employees get per year?', '["10 days", "15 days", "20 days", "25 days"]', 1),
(3, 'What is the minimum password length required?', '["6 characters", "8 characters", "10 characters", "12 characters"]', 1),
(3, 'How often should passwords be changed?', '["Every 30 days", "Every 60 days", "Every 90 days", "Never"]', 2)
ON CONFLICT DO NOTHING;

-- Insert sample locations for geofencing
INSERT INTO locations (name, latitude, longitude, radius_meters, address, is_active) VALUES
('Main Office Building', 40.7128, -74.0060, 100, '123 Main St, New York, NY 10001', true),
('Warehouse Facility', 40.7589, -73.9851, 150, '456 Industrial Ave, New York, NY 10002', true),
('Branch Office', 40.7505, -73.9934, 80, '789 Business Blvd, New York, NY 10003', true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- DEPARTMENT PAGE ACCESS CONFIGURATION
-- ===========================================

-- Insert default access for Admin department to Admin Features page
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/features'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for HR department to HR pages
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/query-replies'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/users'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for Admin department to chat features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/moderator'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/pause'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/summarizer'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/clear'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for HR department to chat features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/moderator'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/pause'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/summarizer'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/clear'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for Admin department to clock features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/manage-locations'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/delete-locations'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for HR department to clock features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/manage-locations'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/delete-locations'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for Admin department to HR features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/create-user'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/schedule-inductions'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/send-query'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/query-replies'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/users/view-details'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for HR department to HR features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/create-user'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/schedule-inductions'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/send-query'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/users/view-details'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for Admin department to wiki features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create-topic'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for HR department to wiki features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create-topic'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Insert default access for all departments to common pages
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'dashboard'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'profile'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'settings'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Ensure Admin department has access to all admin pages and chat features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/db'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/departments'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/features'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/hr'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Also ensure Admin has access to all common pages
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'dashboard'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'profile'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/moderator'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/pause'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/summarizer'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat/clear'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/manage-locations'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock/delete-locations'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'settings'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki/create-topic'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Ensure HR department has access to HR pages and features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/create-user'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/onboarding/schedule-inductions'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/send-query'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/queries/query-replies'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/users'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'hr/users/view-details'
FROM departments
WHERE name = 'HR'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Ensure Admin department has access to Inventory pages and features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound/export-csv'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound/add-transaction'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound/edit-transaction'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound/delete-transaction'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/inbound/mark-as-stored'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/store'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/store/export-csv'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/store/create-outbound'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/outbound'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/outbound/export-csv'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/outbound/mark-as-dispatched'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/outbound/mark-as-delivered'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/outbound/delete-transaction'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Ensure Admin department has access to Inventory Products pages and features
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/import-csv'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/import-all-data'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/export-csv'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/add-product'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/add-provider'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/view-details'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/edit-product'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/edit-provider-details'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/delete-product'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'inventory/products/delete-provider'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Give Admin department access to all Admin pages
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/db'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/departments'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'admin/features'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Also ensure Admin has access to all common pages
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'dashboard'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'profile'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'chat'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'clock'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'settings'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'resources/wiki'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Ensure Admin department has access to approvals page
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Migration script to add inventory features to existing departments
-- This script ensures all departments have the new inventory features in the department_page_access table

-- Add inventory inbound page access for all departments that already have inbound access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/inbound/export-csv'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/inbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/inbound/add-transaction'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/inbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/inbound/edit-transaction'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/inbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/inbound/delete-transaction'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/inbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/inbound/mark-as-stored'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/inbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add inventory store page access for all departments that already have store access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/store/export-csv'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/store'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/store/create-outbound'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/store'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add inventory outbound page access for all departments that already have outbound access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/outbound/export-csv'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/outbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/outbound/mark-as-dispatched'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/outbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/outbound/mark-as-delivered'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/outbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/outbound/delete-transaction'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/outbound'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add inventory products page access for all departments that already have products access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/import-csv'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/import-all-data'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/export-csv'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/add-product'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/add-provider'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/view-details'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/edit-product'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/edit-provider-details'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/delete-product'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'inventory/products/delete-provider'
FROM department_page_access dpa
WHERE dpa.page_name = 'inventory/products'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add HR queries page access for all departments that already have queries access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'hr/queries/send-query'
FROM department_page_access dpa
WHERE dpa.page_name = 'hr/queries'
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'hr/queries/query-replies'
FROM department_page_access dpa
WHERE dpa.page_name = 'hr/queries'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- ===========================================
-- ROLES AND ROLE-BASED ACCESS CONTROL TABLES
-- ===========================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, name)
);

-- Role page access table
CREATE TABLE IF NOT EXISTS role_page_access (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, page_name)
);

-- Add role_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- ===========================================
-- INDEXES FOR ROLES
-- ===========================================

-- Role-related indexes
CREATE INDEX IF NOT EXISTS idx_roles_department_id ON roles(department_id);
CREATE INDEX IF NOT EXISTS idx_role_page_access_role_id ON role_page_access(role_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ===========================================
-- TRIGGERS FOR ROLES
-- ===========================================

-- Apply triggers to roles table
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INITIAL DATA POPULATION FOR ROLES
-- ===========================================

-- Insert default roles for all departments
INSERT INTO roles (department_id, name, is_default)
SELECT id, 'default', true
FROM departments
ON CONFLICT (department_id, name) DO NOTHING;

-- Update existing users to have the default role of their department
UPDATE users 
SET role_id = (
    SELECT r.id 
    FROM roles r 
    JOIN departments d ON r.department_id = d.id 
    WHERE d.name = users.department AND r.is_default = true
)
WHERE role_id IS NULL;

-- MIGRATE EXISTING DEPARTMENT ACCESS TO DEFAULT ROLES
-- Copy existing department page access to default roles
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, dpa.page_name
FROM department_page_access dpa
JOIN roles r ON dpa.department_id = r.department_id
WHERE r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;

-- Insert default query types
INSERT INTO query_types (name) VALUES
('Misconduct'),
('Dressing'),
('Attendance'),
('Performance'),
('Policy Violation'),
('Workplace Behavior'),
('Equipment Issue'),
('Other')
ON CONFLICT (name) DO NOTHING;
