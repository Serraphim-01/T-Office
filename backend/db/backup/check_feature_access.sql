SELECT d.name as department, dpa.page_name 
FROM department_page_access dpa
JOIN departments d ON dpa.department_id = d.id
ORDER BY d.name, dpa.page_name;