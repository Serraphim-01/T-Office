-- Migration script to copy existing department page access to default roles
-- This script should be run after the initial migration to ensure that existing
-- department access is properly migrated to the new role-based system

-- MIGRATE EXISTING DEPARTMENT ACCESS TO DEFAULT ROLES
-- Copy existing department page access to default roles
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, dpa.page_name
FROM department_page_access dpa
JOIN roles r ON dpa.department_id = r.department_id
WHERE r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;