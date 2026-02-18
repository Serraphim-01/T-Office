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
  Key,
  ChevronRight
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
    href: '', // Empty href for parent items with children
    icon: CheckCircle,
    pagePath: 'approvals',
    children: [
      {
        title: 'Certificate',
        href: '/approvals/certificate',
        pagePath: 'approvals/certificate'
      },
      {
        title: 'Role Change',
        href: '/approvals/role-change',
        pagePath: 'approvals/role-change'
      }
    ],
    // Check for either sub-feature access
    subFeatures: ['approvals/certificate', 'approvals/role-change']
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
        pagePath: 'admin/features'
      }
    ]
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: Database,
    pagePath: 'analytics'
  },
  {
    title: 'Help',
    href: '/help',
    icon: MessageCircle,
    pagePath: 'help'
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    pagePath: 'settings'
  }
];

interface NavigationItem {
  title: string;
  href: string;
  icon: any;
  pagePath: string;
  children?: NavigationItem[];
  subFeatures?: string[]; // For special handling of items with sub-features
}

export function AccessControlledNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [accessibleItems, setAccessibleItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (title: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '') return false; // Skip empty hrefs (parent items)
    return pathname === href || pathname.startsWith(href + '/');
  };

  useEffect(() => {
    refreshNavigation(user, setAccessibleItems, setLoading);
  }, [user]);

  // Listen for navigation refresh events
  useEffect(() => {
    const handleNavigationRefresh = () => {
      if (user) {
        refreshNavigation(user, setAccessibleItems, setLoading);
      }
    };

    window.addEventListener('navigation-refresh', handleNavigationRefresh);
    return () => window.removeEventListener('navigation-refresh', handleNavigationRefresh);
  }, [user]);

  return (
    <nav className="space-y-2">
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        accessibleItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            pathname={pathname}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            isActive={isActive}
          />
        ))
      )}
    </nav>
  );
}

interface NavItemProps {
  item: NavigationItem;
  pathname: string | null;
  expandedItems: Set<string>;
  toggleExpand: (title: string) => void;
  isActive: (href: string) => boolean;
}

function NavItem({ item, pathname, expandedItems, toggleExpand, isActive }: NavItemProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.title);
  const itemIsActive = isActive(item.href);

  return (
    <div>
      <Link
        href={item.href}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            toggleExpand(item.title);
          }
        }}
        className={cn(
          'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
          itemIsActive
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <item.icon className="h-4 w-4 mr-2" />
        <span className="flex-1">{item.title}</span>
        {hasChildren && (
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
      </Link>

      {hasChildren && isExpanded && (
        <div className="ml-6 space-y-1 mt-1">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'block px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive(child.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {child.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
        let hasAccess = false;
        
        // Special handling for Approvals - check if user has access to either sub-feature
        if (item.title === 'Approvals' && item.subFeatures) {
          // Check if user has access to any of the sub-features
          const subFeatureAccess = await Promise.all(
            item.subFeatures.map(feature => hasPageAccess(user.id.toString(), feature))
          );
          hasAccess = subFeatureAccess.some(access => access);
        } else {
          // Regular access check for other items
          hasAccess = await hasPageAccess(user.id.toString(), item.pagePath);
        }
        
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
                console.error(`Error checking access for child item ${child.title}:`, childError);
              }
            }
            
            // Only add the parent item if it has accessible children
            if (accessibleChildren.length > 0) {
              accessible.push({
                ...item,
                children: accessibleChildren
              });
            }
          } else {
            // Add item without children
            accessible.push(item);
          }
        }
      } catch (itemError) {
        console.error(`Error checking access for item ${item.title}:`, itemError);
      }
    }
    
    // console.log('Accessible paths:', accessiblePaths); // Log for debugging
    setAccessibleItems(accessible);
  } catch (error) {
    console.error('Error refreshing navigation:', error);
    setAccessibleItems([]);
  } finally {
    setLoading(false);
  }
}