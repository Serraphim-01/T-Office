// Utility functions for checking page access based on user role

// Cache for page access to avoid repeated database queries
const pageAccessCache = new Map<string, { pages: Set<string>; timestamp: number; userData: any }>();
// Timestamp for cache invalidation (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Clear the page access cache
export function clearPageAccessCache() {
  pageAccessCache.clear();
}

// Check if a user has access to a specific page
export async function hasPageAccess(userId: string, pagePath: string): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || !pagePath) {
      console.warn('Invalid userId or pagePath provided to hasPageAccess');
      return false;
    }
    
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Get user info including department and role
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    // Create cache key
    const cacheKey = `user-${userId}`;
    
    // Check cache first with timestamp
    const cachedEntry = pageAccessCache.get(cacheKey);
    if (cachedEntry && cachedEntry.timestamp && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
      // Check if the specific page is in the cached pages
      return cachedEntry.pages.has(pagePath);
    }
    
    // If not in cache or cache expired, fetch user data and pages
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
    
    // Validate user data
    if (!department) {
      console.warn('User department not found');
      return false;
    }
    
    // Create department-role cache key for pages
    const pagesCacheKey = `${department}-${role || 'default'}`;
    let pages: string[] = [];
    
    // Check if pages are already cached for this department-role combination
    const pagesCachedEntry = pageAccessCache.get(pagesCacheKey);
    if (pagesCachedEntry && pagesCachedEntry.timestamp && (Date.now() - pagesCachedEntry.timestamp < CACHE_DURATION)) {
      pages = Array.from(pagesCachedEntry.pages);
    } else {
      // If not in cache or cache expired, fetch from backend
      if (role) {
        try {
          // Fetch role-specific pages using the role name
          const roleResponse = await fetch(`http://localhost:4000/api/admin/roles/${encodeURIComponent(role)}/pages`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (roleResponse.ok) {
            pages = await roleResponse.json();
          } else if (roleResponse.status === 404) {
            console.warn(`Role '${role}' not found, falling back to department access`);
          } else {
            console.error(`Error fetching role pages: ${roleResponse.status} ${roleResponse.statusText}`);
          }
        } catch (roleError) {
          console.error('Error fetching role pages:', roleError);
        }
        
        // If role has no specific pages, fall back to department access
        if (pages.length === 0) {
          try {
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
                } else {
                  console.error(`Error fetching department pages: ${deptResponse.status} ${deptResponse.statusText}`);
                }
              } else {
                console.warn(`Department '${department}' not found in department list`);
              }
            } else {
              console.error(`Error fetching departments: ${deptIdResponse.status} ${deptIdResponse.statusText}`);
            }
          } catch (deptError) {
            console.error('Error fetching department pages:', deptError);
          }
        }
      } else {
        try {
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
              } else {
                console.error(`Error fetching department pages: ${deptResponse.status} ${deptResponse.statusText}`);
              }
            } else {
              console.warn(`Department '${department}' not found in department list`);
            }
          } else {
            console.error(`Error fetching departments: ${deptIdResponse.status} ${deptIdResponse.statusText}`);
          }
        } catch (deptError) {
          console.error('Error fetching department pages:', deptError);
        }
      }
      
      // Cache the pages result with timestamp
      pageAccessCache.set(pagesCacheKey, {
        pages: new Set(pages),
        timestamp: Date.now(),
        userData: null
      });
    }
    
    // Cache the user data with timestamp
    pageAccessCache.set(cacheKey, {
      pages: new Set(pages),
      timestamp: Date.now(),
      userData: userData
    });
    
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