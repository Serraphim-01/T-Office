'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  GraduationCap,
  CalendarCheck,
  Activity,
  KeyRound,
  Handshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHrMenuOpen, setIsHrMenuOpen] = useState(pathname.startsWith('/hr'));
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(pathname.startsWith('/admin'));
  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(pathname.startsWith('/sales'));
  const [isAuditMenuOpen, setIsAuditMenuOpen] = useState(pathname.startsWith('/audit'));
  const [isTechTeamMenuOpen, setIsTechTeamMenuOpen] = useState(pathname.startsWith('/tech'));
  const [signInStatus, setSignInStatus] = useState<'signed-in' | 'signed-out' | 'disabled'>('disabled');
  const [activities, setActivities] = useState<{ text: string, timestamp: string }[]>([]);
  const [backendMessage, setBackendMessage] = useState("");

  const logActivity = (text: string) => {
    const newActivity = { text, timestamp: new Date().toISOString() };
    setActivities(prev => [newActivity, ...prev]);
    localStorage.setItem('activities', JSON.stringify([newActivity, ...activities]));
  };

  useEffect(() => {
    const savedActivities = JSON.parse(localStorage.getItem('activities') || '[]');
    setActivities(savedActivities);
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = hour + minute / 60;

      const canSignIn = (currentTime >= 7 && currentTime <= 8.5);
      const canSignOut = (currentTime >= 15.5 && currentTime <= 17);

      const today = now.toISOString().split('T')[0];
      const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');

      if (attendance[today]?.signOut) {
        setSignInStatus('disabled');
      } else if (attendance[today]?.signIn) {
        setSignInStatus(canSignOut ? 'signed-in' : 'disabled');
      } else {
        setSignInStatus(canSignIn ? 'signed-out' : 'disabled');
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }

    fetch("http://localhost:4000/api/hello")
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message))
      .catch((err) => console.error(err));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const sidebarItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/chat', label: 'Anonymous Chat', icon: MessageSquare },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/onboarding', label: 'Onboarding', icon: GraduationCap },
    { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/report', label: 'Report', icon: AreaChart },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSignInOut = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    const action = signInStatus === 'signed-out' ? 'Signed In' : 'Signed Out';

    if (signInStatus === 'signed-out') {
      if (!attendance[today]) attendance[today] = {};
      attendance[today].signIn = now.toISOString();
      setSignInStatus('signed-in');
    } else if (signInStatus === 'signed-in') {
      attendance[today].signOut = now.toISOString();
      setSignInStatus('disabled');
    }

    localStorage.setItem('attendance', JSON.stringify(attendance));
    logActivity(action);
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
            {sidebarItems.map((item) => {
              const Icon = item.icon;
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
                  onClick={() => {
                    setSidebarOpen(false);
                    logActivity(`Viewed ${item.label}`);
                  }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <Collapsible open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <Shield className="mr-3 h-5 w-5" />
                  Admin
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                <Link
                  href="/admin/roles"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/admin/roles"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Users2 className="mr-3 h-5 w-5" />
                  Roles
                </Link>
                <Link
                  href="/admin/departments"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/admin/departments"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Briefcase className="mr-3 h-5 w-5" />
                  Departments
                </Link>
              </CollapsibleContent>
            </Collapsible>
            <Collapsible open={isHrMenuOpen} onOpenChange={setIsHrMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <Users2 className="mr-3 h-5 w-5" />
                  HR
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                <Link
                  href="/hr/employees"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/hr/employees"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Database className="mr-3 h-5 w-5" />
                  Employee Database
                </Link>
                <Link
                  href="/hr/attendance"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/hr/attendance"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Clock className="mr-3 h-5 w-5" />
                  Time and Attendance
                </Link>
                <Link
                  href="/hr/reports"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/hr/reports"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <AreaChart className="mr-3 h-5 w-5" />
                  Reporting and Analytics
                </Link>
              </CollapsibleContent>
            </Collapsible>
            <Collapsible open={isSalesMenuOpen} onOpenChange={setIsSalesMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <TrendingUp className="mr-3 h-5 w-5" />
                  Sales
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                <Link
                  href="/sales/contacts"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/sales/contacts"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Contact className="mr-3 h-5 w-5" />
                  Contact Management
                </Link>
                <Link
                  href="/sales/pipeline"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/sales/pipeline"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <KanbanSquare className="mr-3 h-5 w-5" />
                  Pipeline Management
                </Link>
                <Link
                  href="/sales/automation"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/sales/automation"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Bot className="mr-3 h-5 w-5" />
                  Task Automation
                </Link>
                <Link
                  href="/sales/documents"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/sales/documents"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Folder className="mr-3 h-5 w-5" />
                  Document Management
                </Link>
                <Link
                  href="/sales/goals"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/sales/goals"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Target className="mr-3 h-5 w-5" />
                  Goal Setting & Tracking
                </Link>
              </CollapsibleContent>
            </Collapsible>
            <Collapsible open={isAuditMenuOpen} onOpenChange={setIsAuditMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <ShieldAlert className="mr-3 h-5 w-5" />
                  Audit
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                <Link
                  href="/audit/planning"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/audit/planning"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <ClipboardList className="mr-3 h-5 w-5" />
                  Audit Planning
                </Link>
                <Link
                  href="/audit/risk-assessment"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/audit/risk-assessment"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <ShieldAlert className="mr-3 h-5 w-5" />
                  Risk Assessment
                </Link>
              </CollapsibleContent>
            </Collapsible>
            <Collapsible open={isTechTeamMenuOpen} onOpenChange={setIsTechTeamMenuOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                  <Users2 className="mr-3 h-5 w-5" />
                  Tech Team
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-2">
                <Link
                  href="/tech/licensing"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/tech/licensing"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <KeyRound className="mr-3 h-5 w-5" />
                  Licensing
                </Link>
                <Link
                  href="/tech/accounts"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/tech/accounts"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Users2 className="mr-3 h-5 w-5" />
                  Accounts
                </Link>
                <Link
                  href="/tech/oem-partners"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/tech/oem-partners"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Handshake className="mr-3 h-5 w-5" />
                  OEM Partners
                </Link>
                <Link
                  href="/tech/deals"
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === "/tech/deals"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <Briefcase className="mr-3 h-5 w-5" />
                  Deals
                </Link>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.department || 'Department'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSignInOut}
              className="w-full mb-2"
              disabled={signInStatus === 'disabled'}
            >
              {signInStatus === 'signed-in' ? 'Sign Out' : 'Sign In'}
            </Button>
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
            <div className="w-10 lg:hidden"></div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      {/* Activity Bar */}
      <div className="w-80 border-l border-border bg-card p-4 hidden lg:block">
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity</h3>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start">
              <Activity className="h-4 w-4 mt-1 mr-3 text-primary" />
              <div>
                <p className="text-sm">{activity.text}</p>
                <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}