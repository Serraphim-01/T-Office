-- Migration to add sub-features for approvals
-- This adds certificate approvals and role change approvals as separate features

-- Add main approvals page feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add certificate approvals feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals/certificate'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add role change approvals feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals/role-change'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Also add these features to any department that already has general approvals access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'approvals/certificate'
FROM department_page_access dpa
WHERE dpa.page_name = 'approvals'
  AND NOT EXISTS (
    SELECT 1 FROM department_page_access dpa2 
    WHERE dpa2.department_id = dpa.department_id 
    AND dpa2.page_name = 'approvals/certificate'
  )
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'approvals/role-change'
FROM department_page_access dpa
WHERE dpa.page_name = 'approvals'
  AND NOT EXISTS (
    SELECT 1 FROM department_page_access dpa2 
    WHERE dpa2.department_id = dpa.department_id 
    AND dpa2.page_name = 'approvals/role-change'
  )
ON CONFLICT (department_id, page_name) DO NOTHING;-- Migration to add sub-features for approvals
-- This adds certificate approvals and role change approvals as separate features

-- Add main approvals page feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add certificate approvals feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals/certificate'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Add role change approvals feature access for Admin department
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals/role-change'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;

-- Also add these features to any department that already has general approvals access
INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'approvals/certificate'
FROM department_page_access dpa
WHERE dpa.page_name = 'approvals'
  AND NOT EXISTS (
    SELECT 1 FROM department_page_access dpa2 
    WHERE dpa2.department_id = dpa.department_id 
    AND dpa2.page_name = 'approvals/certificate'
  )
ON CONFLICT (department_id, page_name) DO NOTHING;

INSERT INTO department_page_access (department_id, page_name)
SELECT dpa.department_id, 'approvals/role-change'
FROM department_page_access dpa
WHERE dpa.page_name = 'approvals'
  AND NOT EXISTS (
    SELECT 1 FROM department_page_access dpa2 
    WHERE dpa2.department_id = dpa.department_id 
    AND dpa2.page_name = 'approvals/role-change'
  )
ON CONFLICT (department_id, page_name) DO NOTHING;