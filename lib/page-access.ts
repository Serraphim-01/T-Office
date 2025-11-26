// Utility functions for checking page access based on user department

import { Profile } from '@/lib/auth-context';

// Cache for department page access to reduce API calls
let departmentPageAccessCache: Record<number, string[]> = {};
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user has access to a specific page or feature
 * @param user - The user profile
 * @param pagePath - The page path or feature name to check (e.g., 'admin/features' or 'chat/moderator')
 * @returns Promise<boolean> - Whether the user has access to the page or feature
 */
export async function hasPageAccess(user: Profile | null, pagePath: string): Promise<boolean> {
  // If no user, deny access
  if (!user || !user.department) {
    return false;
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

    if (!deptResponse.ok) {
      console.log('Failed to fetch departments:', deptResponse.status);
      return false;
    }

    const departments = await deptResponse.json();
    const userDept = departments.find((dept: any) => dept.name === user.department);
    
    if (!userDept) {
      console.log(`Department ${user.department} not found`);
      return false;
    }

    const departmentId = userDept.id;
    console.log(`Checking access for department ${user.department} (ID: ${departmentId}) to page/feature ${pagePath}`);

    // Special case: Admin department has access to all admin pages
    if (user.department === 'Admin' && pagePath.startsWith('admin/')) {
      return true;
    }

    // Check cache first
    const now = Date.now();
    if (departmentPageAccessCache[departmentId] && (now - lastCacheUpdate) < CACHE_DURATION) {
      console.log('Using cached page access data');
      const hasAccess = departmentPageAccessCache[departmentId].includes(pagePath);
      console.log(`${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'} for page/feature ${pagePath} to department ${user.department} (cached)`);
      return hasAccess;
    }

    // Fetch page access for this department
    const accessResponse = await fetch(`http://localhost:4000/api/admin/departments/${departmentId}/pages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!accessResponse.ok) {
      console.log('Failed to fetch page access:', accessResponse.status);
      return false;
    }

    const accessiblePages = await accessResponse.json();
    console.log(`Department ${user.department} has access to pages/features:`, accessiblePages);
    
    // Update cache
    departmentPageAccessCache[departmentId] = accessiblePages;
    lastCacheUpdate = now;

    const hasAccess = accessiblePages.includes(pagePath);
    console.log(`${hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'} for page/feature ${pagePath} to department ${user.department}`);
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