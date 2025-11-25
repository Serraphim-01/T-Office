'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
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
    href: '/hr',
    icon: Users,
    pagePath: 'hr',
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
      }
    ]
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Building,
    pagePath: 'admin/departments',
    children: [
      {
        title: 'Database',
        href: '/admin/db',
        pagePath: 'admin/db'
      },
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

export function AccessControlledNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [accessibleItems, setAccessibleItems] = useState<typeof menuItems>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setAccessibleItems([]);
        setLoading(false);
        return;
      }

      try {
        const accessible = [];
        const accessiblePaths = []; // Track accessible paths for logging
        
        for (const item of menuItems) {
          // Check if user has access to the main item
          const hasAccess = await hasPageAccess(user, item.pagePath);
          
          if (hasAccess) {
            accessiblePaths.push(item.pagePath); // Log accessible path
            
            // If item has children, check their access too
            if (item.children) {
              const accessibleChildren = [];
              for (const child of item.children) {
                const childHasAccess = await hasPageAccess(user, child.pagePath);
                if (childHasAccess) {
                  accessibleChildren.push(child);
                  accessiblePaths.push(child.pagePath); // Log accessible child path
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
        }
        
        // Console log the accessible pages for debugging
        console.log(`Department "${user.department}" has access to pages:`, accessiblePaths);
        
        setAccessibleItems(accessible);
      } catch (error) {
        console.error('Error checking navigation access:', error);
        // Fallback to showing all items if there's an error
        setAccessibleItems(menuItems);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading navigation...
      </div>
    );
  }

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {accessibleItems.map((item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        
        return (
          <div key={item.href}>
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