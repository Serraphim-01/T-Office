'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUI } from '@/lib/ui-context';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  Briefcase,
  Users2,
  Database,
  Clock,
  AreaChart,
  Contact,
  KanbanSquare,
  Bot,
  Folder,
  Target,
  TrendingUp,
  ClipboardList,
  ShieldAlert,
  Package,
  Activity,
  KeyRound,
  Handshake,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, featureFlags, loading, setUser, setFeatureFlags, hasFeatureAccess } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(pathname.startsWith('/admin'));
  const [isHRMenuOpen, setIsHRMenuOpen] = useState(pathname.startsWith('/hr'));
  const [isInventoryMenuOpen, setIsInventoryMenuOpen] = useState(pathname.startsWith('/inventory'));
  const { isActivityBarOpen, toggleActivityBar } = useUI();
  const [activities, setActivities] = useState<{ action: string, details: any, created_at: string }[]>([]);
  const [departmentFeatures, setDepartmentFeatures] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Mock activities for demo mode
  useEffect(() => {
    if (isActivityBarOpen) {
      setActivities([
        { action: 'auth.login', details: {}, created_at: new Date().toISOString() },
        { action: 'dashboard.view', details: {}, created_at: new Date(Date.now() - 3600000).toISOString() }
      ]);
    }
  }, [isActivityBarOpen]);

  useEffect(() => {
    if (user && user.department) {
      fetchDepartmentFeatures();
    }
  }, [user]); // Keep only user as dependency to avoid infinite loops

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <p className="text-lg">Loading...</p>
            </div>
        </div>
    );
  }

  const sidebarItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/chat', label: 'Anonymous Chat', icon: MessageSquare },
    ...(hasFeatureAccess('Profile', 'profile') ? [{ href: '/profile', label: 'Profile', icon: User }] : []),
  ];

  const inventoryItems = [
    { href: '/inventory', label: 'Inventory', icon: Package },
  ];

  const fetchDepartmentFeatures = async () => {
    if (!user?.department) return;

    try {
      const response = await fetch(`http://localhost:4000/api/admin/department-config/${user.department}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Use role-specific features if user has a role, otherwise use department default
        const userRole = user.role; // Assuming user object has role property
        let features = data.features;

        if (userRole && data.roles) {
          const roleConfig = data.roles.find((r: any) => r.id === userRole);
          if (roleConfig) {
            features = roleConfig.features;
          }
        }

        setDepartmentFeatures(features || {});
        setFeatureFlags(features || {}); // Update auth context featureFlags
      } else {
        // Fallback to default features - for Admin, use super-admin features
        const defaultFeatures = user?.department === 'Admin' ? {
          'Admin': {
            'features': { enabled: true },
            'db': { enabled: true },
            'users': { enabled: true }
          },
          'HR': {
            'onboarding': { enabled: true },
            'users': { enabled: true },
            'queries': { enabled: true },
            'attendance': { enabled: true }
          },
          'Compliance': {
            'sites': { enabled: true },
            'documents': { enabled: true },
            'crawling': { enabled: true }
          },
          'Profile': {
            'profile': { enabled: true, functions: { 'view_details': true, 'update_details': true, 'view_role_management': true, 'request_role': true } }
          },
          'Approvals': {
            'certifications': { enabled: true },
            'roles': { enabled: true },
            'documents': { enabled: true }
          },
          'Chat': {
            'messages': { enabled: true }
          }
        } : {
          'HR': {
            'onboarding': { enabled: true },
            'users': { enabled: true },
            'queries': { enabled: true }
          }
        };

        setDepartmentFeatures(defaultFeatures);
        setFeatureFlags(defaultFeatures); // Update auth context featureFlags
      }
    } catch (err) {
      console.error('Error fetching department features:', err);
      // Fallback for Admin
      const fallbackFeatures = user?.department === 'Admin' ? {
        'Admin': {
          'features': { enabled: true },
          'db': { enabled: true },
          'users': { enabled: true }
        },
        'HR': {
          'onboarding': { enabled: true },
          'users': { enabled: true },
          'queries': { enabled: true },
          'attendance': { enabled: true }
        },
        'Compliance': {
          'sites': { enabled: true },
          'documents': { enabled: true },
          'crawling': { enabled: true }
        },
        'Profile': {
          'profile': { enabled: true, functions: { 'view_details': true, 'update_details': true, 'view_role_management': true, 'request_role': true } }
        },
        'Approvals': {
          'certifications': { enabled: true },
          'roles': { enabled: true },
          'documents': { enabled: true }
        },
        'Chat': {
          'messages': { enabled: true }
        }
      } : {};

      setDepartmentFeatures(fallbackFeatures);
      setFeatureFlags(fallbackFeatures); // Update auth context featureFlags
    }
  };

  // Add a function to refresh features when they change
  const refreshFeatures = () => {
    if (user && user.department) {
      fetchDepartmentFeatures();
    }
  };

  const adminItems = [
    { href: '/admin/features', label: 'Features', icon: Shield },
    { href: '/admin/db', label: 'Database', icon: Database },
  ];

  const hrItems = [
    { href: '/hr/onboarding', label: 'Onboarding', icon: UserPlus, feature: 'onboarding' },
    { href: '/hr/users', label: 'User Management', icon: Users2, feature: 'users' },
    { href: '/hr/queries', label: 'Queries', icon: MessageSquare, feature: 'queries' },
  ];

  const handleLogout = async () => {
    setUser(null);
    router.push('/login');
  };

  const formatActivity = (activity: { action: string, details: any, created_at: string }) => {
    const { action, details } = activity;
    switch (action) {
      case 'auth.login':
        return 'Logged in successfully.';
      case 'compliance.site.create':
        return `Added a new site: ${details.url}`;
      case 'compliance.site.delete':
        return `Deleted a site (ID: ${details.siteId}).`;
      case 'compliance.document.update':
        return 'Updated the master compliance document.';
      default:
        return action;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Task Office</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                onClick={() => {
                  setSidebarOpen(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}

            <Collapsible open={isInventoryMenuOpen} onOpenChange={setIsInventoryMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <Package className="mr-3 h-5 w-5" />
                  Inventory
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                {inventoryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                    onClick={() => {
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
            {user?.department === 'Admin' && hasFeatureAccess('Admin', 'features', 'view') && (
              <Collapsible open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <Shield className="mr-3 h-5 w-5" />
                    Admin
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {adminItems.map((item) => {
                    const featureKey = item.href.split('/')[2]; // 'features', 'db'
                    const hasAccess = hasFeatureAccess('Admin', featureKey, 'view');
                    if (!hasAccess) return null;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          pathname === item.href
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  {hasFeatureAccess('Approvals', 'certifications', 'view') && (
                    <Link
                      href="/admin/approvals"
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        pathname === "/admin/approvals"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <ShieldCheck className="mr-3 h-5 w-5" />
                      Approvals
                    </Link>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {hasFeatureAccess('Approvals', 'certifications', 'view') && user?.department !== 'Admin' && (
              <Link
                href="/admin/approvals"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === "/admin/approvals"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <ShieldCheck className="mr-3 h-5 w-5" />
                Approvals
              </Link>
            )}

            {(user?.department === 'Admin' || user?.department === 'HR') && hasFeatureAccess('HR', 'users', 'view') && (
              <Collapsible open={isHRMenuOpen} onOpenChange={setIsHRMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <Users2 className="mr-3 h-5 w-5" />
                    HR
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {hrItems.filter(item => {
                    if (!item.feature) return true;
                    return hasFeatureAccess('HR', item.feature, 'view');
                  }).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        pathname === item.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.department || 'Department'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {sidebarItems.find(item => item.href === pathname)?.label || 'Task Office'}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={toggleActivityBar}
            >
              {isActivityBarOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
            <div className="w-10 lg:hidden"></div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      {/* Activity Bar */}
      <div className={cn(
        "border-l border-border bg-card p-4 hidden lg:block transition-all duration-300 ease-in-out overflow-hidden",
        isActivityBarOpen ? "w-80" : "w-0 p-0"
      )}>
        <div className={cn("transition-opacity", isActivityBarOpen ? "opacity-100" : "opacity-0")}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Activity</h3>
          <div className="space-y-4">
            {activities.length > 0 ? activities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <Activity className="h-4 w-4 mt-1 mr-3 text-primary flex-shrink-0" />
                <div className="flex-grow">
                  <p className="text-sm">{formatActivity(activity)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}