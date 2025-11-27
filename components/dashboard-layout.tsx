'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUI } from '@/lib/ui-context';
import { usePathname } from 'next/navigation';
import AccessControlledNav from '@/components/access-controlled-nav';
import {
  Building2,
  LogOut,
  Menu,
  X,
  PanelRightClose,
  PanelRightOpen,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback,} from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isActivityBarOpen, toggleActivityBar } = useUI();
  const [activities, setActivities] = useState<{ action: string, details: any, created_at: string }[]>([]);

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

  if (loading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <p className="text-lg">Loading...</p>
            </div>
        </div>
    );
  }

  const handleLogout = async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
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
          <nav className="flex-1 px-4 py-4">
            <AccessControlledNav />
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
              Task Office
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