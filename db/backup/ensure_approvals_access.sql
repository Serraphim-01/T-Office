-- Ensure Admin department has access to approvals page
INSERT INTO department_page_access (department_id, page_name)
SELECT id, 'approvals'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;