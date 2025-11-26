// Utility functions for checking page access based on user role

// Cache for page access to avoid repeated database queries
const pageAccessCache = new Map<string, Set<string>>();

// Clear the page access cache
export function clearPageAccessCache() {
  pageAccessCache.clear();
}

// Check if a user has access to a specific page
export async function hasPageAccess(userId: string, pagePath: string): Promise<boolean> {
  try {
    // Get user info including department and role
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return false;
    }

    const response = await fetch('http://localhost:4000/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const userData = await response.json();
    const { department, role } = userData;
    
    // Create cache key
    const cacheKey = `${department}-${role || 'default'}`;
    
    // Check cache first
    if (pageAccessCache.has(cacheKey)) {
      return pageAccessCache.get(cacheKey)!.has(pagePath);
    }
    
    // If not in cache, fetch from backend
    let pages: string[] = [];
    
    if (role) {
      // Fetch role-specific pages using the role name
      const roleResponse = await fetch(`http://localhost:4000/api/admin/roles/${role}/pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (roleResponse.ok) {
        pages = await roleResponse.json();
      }
      
      // If role has no specific pages, fall back to department access
      if (pages.length === 0) {
        // Fetch department ID first
        const deptIdResponse = await fetch('http://localhost:4000/api/admin/departments', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (deptIdResponse.ok) {
          const departments = await deptIdResponse.json();
          const departmentData = departments.find((d: any) => d.name === department);
          
          if (departmentData) {
            // Fetch department-specific pages using the department ID
            const deptResponse = await fetch(`http://localhost:4000/api/admin/departments/${departmentData.id}/pages`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (deptResponse.ok) {
              pages = await deptResponse.json();
            }
          }
        }
      }
    } else {
      // Fetch department ID first
      const deptIdResponse = await fetch('http://localhost:4000/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (deptIdResponse.ok) {
        const departments = await deptIdResponse.json();
        const departmentData = departments.find((d: any) => d.name === department);
        
        if (departmentData) {
          // Fetch department-specific pages using the department ID
          const deptResponse = await fetch(`http://localhost:4000/api/admin/departments/${departmentData.id}/pages`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (deptResponse.ok) {
            pages = await deptResponse.json();
          }
        }
      }
    }
    
    // Cache the result
    pageAccessCache.set(cacheKey, new Set(pages));
    
    return pages.includes(pagePath);
  } catch (error) {
    console.error('Error checking page access:', error);
    return false;
  }
}

// Check if a user has access to a specific feature within a page
export async function hasFeatureAccess(userId: string, featurePath: string): Promise<boolean> {
  // For now, we'll use the same logic as page access
  // In the future, we might want to differentiate between pages and features
  return hasPageAccess(userId, featurePath);
}

export default {
  hasPageAccess,
  hasFeatureAccess,
  clearPageAccessCache
};