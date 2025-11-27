'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess, clearPageAccessCache } from '@/lib/page-access';
import { 
  Home,
  User,
  MessageCircle,
  Clock,
  Settings,
  Users,
  FileText,
  Archive,
  CheckCircle,
  Database,
  Building,
  Key
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    pagePath: 'dashboard'
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
    pagePath: 'profile'
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageCircle,
    pagePath: 'chat'
  },
  {
    title: 'Clock',
    href: '/clock',
    icon: Clock,
    pagePath: 'clock'
  },
  {
    title: 'HR',
    href: '', // Empty href for parent items with children
    icon: Users,
    pagePath: 'hr/onboarding',
    children: [
      {
        title: 'Onboarding',
        href: '/hr/onboarding',
        pagePath: 'hr/onboarding'
      },
      {
        title: 'Queries',
        href: '/hr/queries',
        pagePath: 'hr/queries'
      },
      {
        title: 'Users',
        href: '/hr/users',
        pagePath: 'hr/users'
      }
    ]
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Archive,
    pagePath: 'inventory/inbound',
    children: [
      {
        title: 'Inbound',
        href: '/inventory/inbound',
        pagePath: 'inventory/inbound'
      },
      {
        title: 'Outbound',
        href: '/inventory/outbound',
        pagePath: 'inventory/outbound'
      },
      {
        title: 'Products',
        href: '/inventory/products',
        pagePath: 'inventory/products'
      },
      {
        title: 'Store',
        href: '/inventory/store',
        pagePath: 'inventory/store'
      }
    ]
  },
  {
    title: 'Resources',
    href: '/resources',
    icon: FileText,
    pagePath: 'resources/wiki',
    children: [
      {
        title: 'Wiki',
        href: '/resources/wiki',
        pagePath: 'resources/wiki'
      },
      {
        title: 'Create Wiki',
        href: '/resources/wiki/create',
        pagePath: 'resources/wiki/create'
      }
    ]
  },
  {
    title: 'Approvals',
    href: '/approvals',
    icon: CheckCircle,
    pagePath: 'approvals'
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Building,
    pagePath: 'admin/departments',
    children: [
      {
        title: 'Departments',
        href: '/admin/departments',
        pagePath: 'admin/departments'
      },
      {
        title: 'Features',
        href: '/admin/features',
        icon: Key,
        pagePath: 'admin/features'
      }
    ]
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    pagePath: 'settings'
  }
];

// Export refreshNavigation function so it can be called from other components
export async function refreshNavigation(user: any, setAccessibleItems: any, setLoading: any) {
  if (!user || !user.id) {
    setAccessibleItems([]);
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    // Clear the cache to get fresh data
    clearPageAccessCache();
    
    const accessible = [];
    const accessiblePaths = []; // Track accessible paths for logging
    
    for (const item of menuItems) {
      try {
        // Check if user has access to the main item
        const hasAccess = await hasPageAccess(user.id.toString(), item.pagePath);
        
        if (hasAccess) {
          accessiblePaths.push(item.pagePath); // Log accessible path
          
          // If item has children, check their access too
          if (item.children) {
            const accessibleChildren = [];
            for (const child of item.children) {
              try {
                const childHasAccess = await hasPageAccess(user.id.toString(), child.pagePath);
                if (childHasAccess) {
                  accessibleChildren.push(child);
                  accessiblePaths.push(child.pagePath); // Log accessible child path
                }
              } catch (childError) {
                console.error(`Error checking access for child item ${child.pagePath}:`, childError);
                // Continue with other children even if one fails
              }
            }
            
            // Only include parent if it has accessible children
            if (accessibleChildren.length > 0) {
              accessible.push({
                ...item,
                children: accessibleChildren
              });
            }
          } else {
            // No children, just add the item
            accessible.push(item);
          }
        }
      } catch (itemError) {
        console.error(`Error checking access for item ${item.pagePath}:`, itemError);
        // Continue with other items even if one fails
      }
    }
    
    // Console log the accessible pages for debugging
    console.log(`User "${user.full_name}" with role "${user.role || 'default'}" in department "${user.department}" has access to pages:`, accessiblePaths);

    setAccessibleItems(accessible);

    // Store the navigation data in localStorage for faster subsequent loads
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nav-access-${user.id}`, JSON.stringify(accessiblePaths));
    }
  } catch (error) {
    console.error('Error checking navigation access:', error);
    // Fallback to showing all items if there's an error
    setAccessibleItems(menuItems);
  } finally {
    setLoading(false);
  }
};

export function AccessControlledNav() {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [accessibleItems, setAccessibleItems] = useState<typeof menuItems>([]);
  const [loading, setLoading] = useState(true);

  // Memoize the refresh function to prevent unnecessary re-renders
  const refreshNav = useCallback(async (forceRefresh = false) => {
    if (user && !authLoading) {
      // Always fetch fresh navigation data to ensure accuracy
      await refreshNavigation(user, setAccessibleItems, setLoading);
    } else {
      setAccessibleItems([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    // Only refresh navigation when user changes or on initial load
    refreshNav();

    // Listen for navigation refresh events (only when features actually change)
    const handleNavigationRefresh = () => {
      refreshNav(true); // Force refresh when features change
    };

    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      window.addEventListener('navigation-refresh', handleNavigationRefresh);

      return () => {
        window.removeEventListener('navigation-refresh', handleNavigationRefresh);
      };
    }
  }, [refreshNav]);

  // Remove the effect that was causing navigation refresh on route changes
  // This was causing the sidenav to reload every time the route changed
  // useEffect(() => {
  //   // Don't refresh the entire navigation on route change, just update active state
  //   // This prevents the flashing/loading issue when navigating between pages
  // }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  // Show loading only when auth is loading or when we're specifically loading nav data
  if (authLoading || loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading navigation...
      </div>
    );
  }

  // Show empty state if no accessible items and user is logged in
  if (accessibleItems.length === 0 && user) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No accessible items found. Please contact your administrator.
      </div>
    );
  }

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {accessibleItems.map((item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        
        return (
          <div key={item.href || item.title}>
            {hasChildren ? (
              // Parent items with children are not clickable, just toggle dropdown
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary cursor-pointer",
                  isActive(item.href) && "bg-muted text-primary"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.title}
              </div>
            ) : (
              // Items without children are clickable
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive(item.href) && "bg-muted text-primary"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.title}
              </Link>
            )}
            
            {hasChildren && (
              <div className="ml-6 mt-1 space-y-1">
                {item.children?.map((child) => {
                  const ChildIcon = child.icon || Icon;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                        isActive(child.href) && "bg-muted text-primary"
                      )}
                    >
                      {ChildIcon && <ChildIcon className="h-3 w-3" />}
                      {child.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default AccessControlledNav;