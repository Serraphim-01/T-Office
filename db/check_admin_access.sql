SELECT d.name as department, dpa.page_name 
FROM department_page_access dpa
JOIN departments d ON dpa.department_id = d.id
WHERE d.name = 'Admin'
ORDER BY dpa.page_name;