// Utility functions for checking page access based on user department

import { Profile } from '@/lib/auth-context';

// Cache for department page access to reduce API calls
let departmentPageAccessCache: Record<number, string[]> = {};
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user has access to a specific page
 * @param user - The user profile
 * @param pagePath - The page path to check (e.g., 'admin/features')
 * @returns Promise<boolean> - Whether the user has access to the page
 */
export async function hasPageAccess(user: Profile | null, pagePath: string): Promise<boolean> {
  // If no user, deny access
  if (!user || !user.department) {
    return false;
  }

  // Special case: Admin department has access to all admin pages
  if (user.department === 'Admin' && pagePath.startsWith('admin/')) {
    return true;
  }

  try {
    // Get department ID from department name
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    // Fetch departments to get the ID for the user's department
    const deptResponse = await fetch('http://localhost:4000/api/admin/departments', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Check if response is JSON
    const contentType = deptResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Likely redirected to login page, token is invalid
      console.log('Token invalid or expired, redirecting to login');
      localStorage.removeItem('token');
      return false;
    }

    // If the request fails due to an expired token, try to refresh it
    if (deptResponse.status === 403) {
      console.log('Token expired, attempting to refresh');
      // Try to refresh the token
      const refreshResponse = await fetch('http://localhost:4000/api/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        localStorage.setItem('token', refreshData.token);
        // Retry the original request with the new token
        return hasPageAccess(user, pagePath);
      } else {
        return false;
      }
    }

    if (!deptResponse.ok) {
      console.log('Failed to fetch departments:', deptResponse.status);
      return false;
    }

    const departments = await deptResponse.json();
    const userDepartment = departments.find((dept: any) => dept.name === user.department);
    
    if (!userDepartment) {
      console.log(`Department "${user.department}" not found in departments list`);
      return false;
    }

    const departmentId = userDepartment.id;
    console.log(`Checking access for department: ${user.department} (ID: ${departmentId}) to page: ${pagePath}`);

    // Check cache first
    const now = Date.now();
    if (departmentPageAccessCache[departmentId] && (now - lastCacheUpdate < CACHE_DURATION)) {
      const hasAccess = departmentPageAccessCache[departmentId].includes(pagePath);
      console.log(`Cache hit for department ${departmentId}: ${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'} for page ${pagePath}`);
      return hasAccess;
    }

    // Fetch page access for this department
    const accessResponse = await fetch(`http://localhost:4000/api/admin/departments/${departmentId}/pages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Check if response is JSON
    const accessContentType = accessResponse.headers.get('content-type');
    if (!accessContentType || !accessContentType.includes('application/json')) {
      // Likely redirected to login page, token is invalid
      console.log('Token invalid or expired during access check, redirecting to login');
      localStorage.removeItem('token');
      return false;
    }

    // If the request fails due to an expired token, try to refresh it
    if (accessResponse.status === 403) {
      console.log('Token expired during access check, attempting to refresh');
      // Try to refresh the token
      const refreshResponse = await fetch('http://localhost:4000/api/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        localStorage.setItem('token', refreshData.token);
        // Retry the original request with the new token
        return hasPageAccess(user, pagePath);
      } else {
        return false;
      }
    }

    if (!accessResponse.ok) {
      console.log('Failed to fetch page access:', accessResponse.status);
      return false;
    }

    const accessiblePages = await accessResponse.json();
    console.log(`Department ${user.department} has access to pages:`, accessiblePages);
    
    // Update cache
    departmentPageAccessCache[departmentId] = accessiblePages;
    lastCacheUpdate = now;

    const hasAccess = accessiblePages.includes(pagePath);
    console.log(`${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'} for page ${pagePath} to department ${user.department}`);
    return hasAccess;
  } catch (error) {
    console.error('Error checking page access:', error);
    // Remove invalid token
    localStorage.removeItem('token');
    return false;
  }
}

/**
 * Clear the page access cache
 */
export function clearPageAccessCache() {
  departmentPageAccessCache = {};
  lastCacheUpdate = 0;
}

/**
 * Check if user has access to current page and redirect if not
 * @param user - The user profile
 * @param currentPagePath - The current page path
 * @returns Promise<boolean> - Whether the user has access to the current page
 */
export async function checkCurrentPageAccess(user: Profile | null, currentPagePath: string): Promise<boolean> {
  // Special case: Always allow access to dashboard for all users
  if (currentPagePath === 'dashboard') {
    return true;
  }
  
  return hasPageAccess(user, currentPagePath);
}