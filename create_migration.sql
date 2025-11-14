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
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    paused_by INTEGER REFERENCES users(id),
    paused_at TIMESTAMP WITH TIME ZONE,
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
-- INVENTORY MANAGEMENT TABLES
-- ===========================================

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE,
    part_number VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    state VARCHAR(50) NOT NULL DEFAULT 'Incoming',
    container VARCHAR(50),
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product states history table
CREATE TABLE IF NOT EXISTS product_states (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Sub-products table for breaking down products with quantity > 1
CREATE TABLE IF NOT EXISTS sub_products (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
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

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_products_state ON products(state);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_product_states_product_timestamp ON product_states(product_id, timestamp DESC);

-- Wiki indexes
CREATE INDEX IF NOT EXISTS idx_wiki_topics_department ON wiki_topics(department);
CREATE INDEX IF NOT EXISTS idx_wiki_topics_topic ON wiki_topics(topic);
CREATE INDEX IF NOT EXISTS idx_wiki_questions_topic_id ON wiki_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_user_id ON wiki_lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_completions_topic_id ON wiki_lesson_completions(topic_id);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_location_events_user_timestamp ON location_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_location_timestamp ON location_events(location_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auto_attendance_user_timestamp ON auto_attendance(user_id, timestamp DESC);

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
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wiki_topics_updated_at BEFORE UPDATE ON wiki_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_documents_updated_at BEFORE UPDATE ON compliance_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crawled_sites_updated_at BEFORE UPDATE ON crawled_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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



-- Insert default chat settings
INSERT INTO chat_settings (id, is_paused) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- Insert sample inventory data
INSERT INTO products (name, serial_number, part_number, quantity, state, container, type) VALUES
('Laptop Dell XPS 13', 'DLXPS001', 'DELL-XPS-13-001', 1, 'Stored', 'Individual piece', 'PC'),
('Server Rack Components', 'SRV001', 'SRV-RACK-001', 5, 'Incoming', 'Carton', 'Rack'),
('Network Switch Cisco', 'NSW001', 'CISCO-SW-001', 1, 'Arrived', 'Individual piece', 'Server'),
('Monitor LG 27"', 'MON001', 'LG-27-001', 3, 'Outgoing', 'Carton', 'Monitor'),
('Keyboard Mechanical', 'KB001', 'MECH-KB-001', 10, 'Stored', 'Carton', 'PC'),
('Mouse Wireless', 'MS001', 'WIRE-MS-001', 5, 'Dispatched', 'Carton', 'PC'),
('Printer HP LaserJet', 'PRN001', 'HP-LJ-001', 1, 'Delivered', 'Individual piece', 'PC'),
('iPad Pro 12.9"', 'IPAD001', 'APPLE-IPAD-PRO-001', 1, 'Stored', 'Individual piece', 'PC'),
('Wireless Router TP-Link', 'ROUT001', 'TP-LINK-AC1200', 2, 'Arrived', 'Carton', 'Server'),
('External Hard Drive 2TB', 'HDD001', 'WD-ELEMENTS-2TB', 4, 'Incoming', 'Carton', 'PC'),
('USB-C Hub Multiport', 'HUB001', 'ANKER-USB-C-HUB', 6, 'Stored', 'Carton', 'PC'),
('Bluetooth Headphones', 'HEAD001', 'SONY-WH-1000XM4', 1, 'Outgoing', 'Individual piece', 'PC'),
('Webcam Logitech HD', 'CAM001', 'LOGITECH-C920', 3, 'Dispatched', 'Carton', 'PC'),
('Graphics Card NVIDIA RTX 3080', 'GPU001', 'NVIDIA-RTX3080', 1, 'Delivered', 'Individual piece', 'PC'),
('RAM DDR4 16GB Kit', 'RAM001', 'CORSAIR-DDR4-16GB', 1, 'Dispatched', 'Individual piece', 'PC'),
('Projector Epson', 'PROJ001', 'EPSON-EH-TW7400', 1, 'Delivered', 'Individual piece', 'PC'),
('Smart TV Samsung 55"', 'TV001', 'SAMSUNG-QN55Q70A', 1, 'Stored', 'Individual piece', 'Monitor'),
('Soundbar Sony', 'SBAR001', 'SONY-HT-X8500', 1, 'Arrived', 'Individual piece', 'PC'),
('Gaming Console PlayStation 5', 'PS5001', 'SONY-PS5', 1, 'Incoming', 'Individual piece', 'PC'),
('VR Headset Oculus Quest 2', 'VR001', 'META-QUEST2', 2, 'Stored', 'Carton', 'PC'),
('Drone DJI Mini 2', 'DRONE001', 'DJI-MINI2', 1, 'Outgoing', 'Individual piece', 'PC'),
('Smart Watch Apple Series 8', 'WATCH001', 'APPLE-WATCH-S8', 3, 'Dispatched', 'Carton', 'PC'),
('E-Reader Kindle Paperwhite', 'KINDLE001', 'AMAZON-KINDLE-PW', 4, 'Delivered', 'Carton', 'PC'),
('Coffee Machine Nespresso', 'COFFEE001', 'NESPRESSO-VERTUO', 1, 'Stored', 'Individual piece', 'PC'),
('Air Purifier Dyson', 'PURIFIER001', 'DYSON-PURE-COOL', 1, 'Arrived', 'Individual piece', 'PC'),
('Robot Vacuum Roomba', 'ROOMBA001', 'IROBOT-ROOMBA-I7', 2, 'Incoming', 'Carton', 'PC'),
('Smart Thermostat Nest', 'THERM001', 'GOOGLE-NEST-THERMOSTAT', 3, 'Stored', 'Carton', 'PC'),
('Security Camera Ring', 'CAMRING001', 'RING-SPOTLIGHT-CAM', 5, 'Outgoing', 'Carton', 'PC')
ON CONFLICT (serial_number) DO NOTHING;

-- Insert sample product state history
INSERT INTO product_states (product_id, state, notes) VALUES
(1, 'Incoming', 'Initial state'),
(1, 'Arrived', 'Received at warehouse'),
(1, 'Stored', 'Placed in storage location A1'),
(2, 'Incoming', 'Bulk order received'),
(3, 'Incoming', 'Order placed'),
(3, 'Arrived', 'Delivered to facility'),
(4, 'Incoming', 'Customer order'),
(4, 'Arrived', 'Ready for pickup'),
(4, 'Outgoing', 'Prepared for shipping'),
(5, 'Incoming', 'Stock replenishment'),
(5, 'Arrived', 'Quality checked'),
(5, 'Stored', 'Added to inventory'),
(6, 'Incoming', 'New shipment'),
(6, 'Arrived', 'Unpacked'),
(6, 'Stored', 'Stored in warehouse'),
(6, 'Outgoing', 'Customer request'),
(6, 'Dispatched', 'Shipped via courier'),
(7, 'Incoming', 'Purchase order'),
(7, 'Arrived', 'Received'),
(7, 'Stored', 'Inventory updated'),
(7, 'Outgoing', 'Office request'),
(7, 'Dispatched', 'Delivered to office'),
(7, 'Delivered', 'Confirmed delivery')
ON CONFLICT DO NOTHING;

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
