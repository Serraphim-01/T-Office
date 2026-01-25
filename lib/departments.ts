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
      console.warn('No auth token found, throwing error to trigger redirect');
      throw new Error('No authentication token found');
    }

    // Get API URL from environment variable, fallback to localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    const response = await fetch(`${apiUrl}/api/admin/departments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // If it's an auth error, throw to trigger redirect
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed');
      }
      console.warn('Failed to fetch departments, using default departments');
      return DEFAULT_DEPARTMENTS;
    }

    const departments = await response.json();
    return departments.map((dept: { name: string }) => dept.name);
  } catch (error) {
    console.error('Error fetching departments:', error);
    // Always re-throw errors to let calling components handle authentication redirects
    throw error;
  }
};

// Function to fetch roles for a department
export const fetchRoles = async (departmentName: string): Promise<{id: number, name: string, is_default: boolean}[]> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token) {
      console.warn('No auth token found, throwing error to trigger redirect');
      throw new Error('No authentication token found');
    }

    // Get API URL from environment variable, fallback to localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // First get department ID
    const deptResponse = await fetch(`${apiUrl}/api/admin/departments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!deptResponse.ok) {
      // If it's an auth error, throw to trigger redirect
      if (deptResponse.status === 401 || deptResponse.status === 403) {
        throw new Error('Authentication failed');
      }
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
    const rolesResponse = await fetch(`${apiUrl}/api/admin/departments/${department.id}/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!rolesResponse.ok) {
      // If it's an auth error, throw to trigger redirect
      if (rolesResponse.status === 401 || rolesResponse.status === 403) {
        throw new Error('Authentication failed');
      }
      console.warn('Failed to fetch roles');
      return [];
    }

    return await rolesResponse.json();
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Always re-throw errors to let calling components handle authentication redirects
    throw error;
  }
};

export default DEFAULT_DEPARTMENTS;