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
SELECT id, 'inventory/products/delete-product'
FROM departments
WHERE name = 'Admin'
ON CONFLICT (department_id, page_name) DO NOTHING;
