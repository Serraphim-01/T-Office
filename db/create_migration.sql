-- Create Migration: Create all database tables with schemas and populate with initial data
-- This script creates a complete database schema for the office management system

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
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled',
    assigned_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HR queries table
CREATE TABLE IF NOT EXISTS hr_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Department configurations table
CREATE TABLE IF NOT EXISTS department_configs (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) UNIQUE NOT NULL,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    product_type VARCHAR(100) NOT NULL,
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
    provider VARCHAR(255) NOT NULL,
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

-- HR indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_hr_queries_status ON hr_queries(status);
CREATE INDEX IF NOT EXISTS idx_hr_queries_assigned_to ON hr_queries(assigned_to);

-- Wiki indexes
CREATE INDEX IF NOT EXISTS idx_wiki_topics_department ON wiki_topics(department);
CREATE INDEX IF NOT EXISTS idx_wiki_topics_topic ON wiki_topics(topic);
CREATE INDEX IF NOT EXISTS idx_wiki_questions_topic_id ON wiki_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_user_id ON wiki_lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_topic_id ON wiki_lesson_completions(topic_id);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_active ON user_locations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_location_events_user_timestamp ON location_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_location_timestamp ON location_events(location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auto_attendance_user_timestamp ON auto_attendance(user_id, timestamp DESC);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_part_number ON products(part_number);

-- Inbound indexes
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_product_id ON inbound_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inbound_transactions_status ON inbound_transactions(status);
CREATE INDEX IF NOT EXISTS idx_inbound_serial_numbers_transaction_id ON inbound_serial_numbers(transaction_id);

-- Outbound indexes
CREATE INDEX IF NOT EXISTS idx_outbound_transactions_inbound_id ON outbound_transactions(inbound_transaction_id);
CREATE INDEX IF NOT EXISTS idx_outbound_transactions_status ON outbound_transactions(status);
CREATE INDEX IF NOT EXISTS idx_outbound_serial_numbers_transaction_id ON outbound_serial_numbers(outbound_transaction_id);

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
CREATE TRIGGER update_department_configs_updated_at BEFORE UPDATE ON department_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_documents_updated_at BEFORE UPDATE ON compliance_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crawled_sites_updated_at BEFORE UPDATE ON crawled_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inbound_transactions_updated_at BEFORE UPDATE ON inbound_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_transactions_updated_at BEFORE UPDATE ON outbound_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
INSERT INTO products (name, part_number, product_type) VALUES
('Laptop Computer', 'LAPTOP-001', 'Electronics'),
('Wireless Mouse', 'MOUSE-001', 'Electronics'),
('Mechanical Keyboard', 'KEYBOARD-001', 'Electronics'),
('USB-C Cable', 'CABLE-001', 'Electronics'),
('External Hard Drive', 'HDD-001', 'Electronics')
ON CONFLICT (part_number) DO NOTHING;

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