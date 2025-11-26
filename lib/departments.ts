// Centralized department list for the entire application
// This file exports a function to fetch departments from the backend
// and a constant array for fallback/default departments

export const DEFAULT_DEPARTMENTS = [
  'Admin',
  'HR',
  'Engineering',
  'Sales',
  'Compliance',
  'Finance',
  'Marketing',
  'IT',
  'Legal',
  'Security',
  'Facilities',
  'Operations'
];

// Function to fetch departments from the backend
export const fetchDepartments = async (): Promise<string[]> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token) {
      console.warn('No auth token found, using default departments');
      return DEFAULT_DEPARTMENTS;
    }

    const response = await fetch('http://localhost:4000/api/admin/departments', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch departments, using default departments');
      return DEFAULT_DEPARTMENTS;
    }

    const departments = await response.json();
    return departments.map((dept: { name: string }) => dept.name);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return DEFAULT_DEPARTMENTS;
  }
};

// Function to fetch roles for a department
export const fetchRoles = async (departmentName: string): Promise<{id: number, name: string, is_default: boolean}[]> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token) {
      console.warn('No auth token found, returning empty roles');
      return [];
    }

    // First get department ID
    const deptResponse = await fetch('http://localhost:4000/api/admin/departments', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!deptResponse.ok) {
      console.warn('Failed to fetch departments');
      return [];
    }

    const departments = await deptResponse.json();
    const department = departments.find((dept: { name: string }) => dept.name === departmentName);
    
    if (!department) {
      console.warn('Department not found');
      return [];
    }

    // Now get roles for this department
    const rolesResponse = await fetch(`http://localhost:4000/api/admin/departments/${department.id}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!rolesResponse.ok) {
      console.warn('Failed to fetch roles');
      return [];
    }

    return await rolesResponse.json();
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
};

export default DEFAULT_DEPARTMENTS;