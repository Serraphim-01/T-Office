-- Feature Access Migration: Create department_page_access table and insert default access

-- Create department_page_access table
CREATE TABLE IF NOT EXISTS department_page_access (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (department_id, page_name)
);

-- Insert default access for Admin department to Admin Features page
-- First, get the Admin department ID
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