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