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
  Handshake,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OnboardingModal } from './onboarding-modal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { session, profile, featureFlags, loading, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHrMenuOpen, setIsHrMenuOpen] = useState(pathname.startsWith('/hr'));
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(pathname.startsWith('/admin'));
  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(pathname.startsWith('/sales'));
  const [isAuditMenuOpen, setIsAuditMenuOpen] = useState(pathname.startsWith('/audit'));
  const [isTechTeamMenuOpen, setIsTechTeamMenuOpen] = useState(pathname.startsWith('/tech'));
  const [isActivityBarOpen, setIsActivityBarOpen] = useState(true);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [activities, setActivities] = useState<{ text: string, timestamp: string }[]>([]);
  const [onboardingModalShown, setOnboardingModalShown] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
    if (!loading && profile && (!profile.full_name || !profile.department) && !onboardingModalShown) {
      setIsOnboardingModalOpen(true);
      setOnboardingModalShown(true);
    }
  }, [loading, session, profile, router, onboardingModalShown]);

  if (loading || !session) {
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
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/onboarding', label: 'Onboarding', icon: GraduationCap, feature: 'Onboarding' },
    { href: '/attendance', label: 'Attendance', icon: CalendarCheck, feature: 'Attendance' },
    { href: '/report', label: 'Report', icon: AreaChart, feature: 'Report' },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="h-screen flex bg-background">
      <OnboardingModal
        open={isOnboardingModalOpen}
        onOpenChange={setIsOnboardingModalOpen}
        onProfileUpdate={refreshProfile}
      />
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
            {sidebarItems.map((item) =>
              (!item.feature || featureFlags[item.feature]) && (
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
              )
            )}
            {profile?.department === 'Admin' && (
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
                  <Link
                    href="/admin/features"
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      pathname === "/admin/features"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Briefcase className="mr-3 h-5 w-5" />
                    Features
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            )}
            {featureFlags['HR'] && (
              <Collapsible open={isHrMenuOpen} onOpenChange={setIsHrMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <Users2 className="mr-3 h-5 w-5" />
                    HR
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {featureFlags['HREmployees'] && (
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
                  )}
                  {featureFlags['HRAttendance'] && (
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
                  )}
                  {featureFlags['HRReports'] && (
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
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
            {featureFlags['Sales'] && (
              <Collapsible open={isSalesMenuOpen} onOpenChange={setIsSalesMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <TrendingUp className="mr-3 h-5 w-5" />
                    Sales
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {featureFlags['SalesContacts'] && (
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
                  )}
                  {featureFlags['SalesPipeline'] && (
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
                  )}
                  {featureFlags['SalesAutomation'] && (
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
                  )}
                  {featureFlags['SalesDocuments'] && (
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
                  )}
                  {featureFlags['SalesGoals'] && (
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
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
            {featureFlags['Audit'] && (
              <Collapsible open={isAuditMenuOpen} onOpenChange={setIsAuditMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <ShieldAlert className="mr-3 h-5 w-5" />
                    Audit
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {featureFlags['AuditPlanning'] && (
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
                  )}
                  {featureFlags['AuditRiskAssessment'] && (
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
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
            {featureFlags['Tech'] && (
              <Collapsible open={isTechTeamMenuOpen} onOpenChange={setIsTechTeamMenuOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50">
                    <Users2 className="mr-3 h-5 w-5" />
                    Tech Team
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-2">
                  {featureFlags['TechLicensing'] && (
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
                  )}
                  {featureFlags['TechAccounts'] && (
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
                  )}
                  {featureFlags['TechOemPartners'] && (
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
                  )}
                  {featureFlags['TechDeals'] && (
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
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.department || 'Department'}
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
              onClick={() => setIsActivityBarOpen(!isActivityBarOpen)}
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
        "border-l border-border bg-card p-4 hidden lg:block transition-all duration-300 ease-in-out",
        isActivityBarOpen ? "w-80" : "w-0 p-0"
      )}>
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