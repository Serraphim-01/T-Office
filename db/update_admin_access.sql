-- Give Admin department access to all Admin pages
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