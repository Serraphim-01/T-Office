-- Migration to ensure all default roles have approval sub-features access
-- This ensures that role-based access control works properly for approvals

-- Add certificate approvals feature access for all default roles
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, 'approvals/certificate'
FROM roles r
WHERE r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;

-- Add role change approvals feature access for all default roles
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, 'approvals/role-change'
FROM roles r
WHERE r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;

-- Also ensure Admin department default role has access to all approval features
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, 'approvals/certificate'
FROM roles r
JOIN departments d ON r.department_id = d.id
WHERE d.name = 'Admin' AND r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;

INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, 'approvals/role-change'
FROM roles r
JOIN departments d ON r.department_id = d.id
WHERE d.name = 'Admin' AND r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;

-- Add approvals dashboard page access for all default roles
INSERT INTO role_page_access (role_id, page_name)
SELECT r.id, 'approvals'
FROM roles r
WHERE r.is_default = true
ON CONFLICT (role_id, page_name) DO NOTHING;