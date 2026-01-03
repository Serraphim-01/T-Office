-- Remove HR and Approvals pages from Admin department access
DELETE FROM department_page_access 
WHERE department_id = (SELECT id FROM departments WHERE name = 'Admin')
AND page_name IN ('approvals', 'admin/hr');