'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AccessControlledNav } from './access-controlled-nav';
import { NotificationPanel } from './notification-panel';
import { useAnalytics } from '@/lib/analytics-context';
import { ChatbotSidebar } from './chatbot-sidebar';
import { Button } from './ui/button';
import { Bell, Menu, X, ChevronLeft, ChevronRight, PieChart, Bot } from 'lucide-react';
import { useNotification } from '@/lib/notification-context';
import { RefreshCountdown } from './refresh-countdown';

export function DashboardLayout({ children, customTitle }: { children: React.ReactNode, customTitle?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const [chatbotSidebarOpen, setChatbotSidebarOpen] = useState(false);
  const { setCurrentPage, openAnalyticsSidebar } = useAnalytics();
  const { unreadCount } = useNotification();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // Extract page name from pathname for analytics
  const getPageName = () => {
    if (pathname === '/') return 'dashboard';
    
    // Handle nested routes by taking the first part after /
    const pathParts = pathname.split('/').filter(part => part !== '');
    
    if (pathParts.length === 0) return 'dashboard';
    
    // Handle specific routes that have sub-routes
    if (pathParts[0] === 'hr' && pathParts.length > 1) {
      return `hr/${pathParts[1]}`;
    }
    
    if (pathParts[0] === 'inventory' && pathParts.length > 1) {
      return pathParts[1]; // Return the sub-page (inbound, outbound, products, etc.)
    }
    
    if (pathParts[0] === 'resources' && pathParts.length > 1) {
      return pathParts[1]; // Return wiki
    }
    
    return pathParts[0];
  };
  
  const currentPage = getPageName();
  
  // Update the current page in analytics context for global analytics
  useEffect(() => {
    setCurrentPage(currentPage);
  }, [currentPage, setCurrentPage]);

  // Function to handle refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Toggle sidebar collapse state
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Refresh Countdown Overlay */}
      <RefreshCountdown onRefresh={handleRefresh} />
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 bg-background border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center h-16' : 'justify-between h-16 px-4'} border-b border-border`}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-md p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className="ml-2 text-xl font-bold">Task Office</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden lg:flex"
            onClick={toggleSidebarCollapse}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className={sidebarCollapsed ? "py-4" : ""}>
          <AccessControlledNav collapsed={sidebarCollapsed} onItemClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-background">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold capitalize">
              {customTitle || (pathname === '/' ? 'Dashboard' : pathname.split('/').pop()?.replace(/-/g, ' ') || '')}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setNotificationPanelOpen(true)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-xs text-primary-foreground items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={openAnalyticsSidebar}
              className="relative group"
            >
              <PieChart className="h-5 w-5" />
              <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50">
                Analytics
                <div className="absolute top-1/2 -translate-y-1/2 right-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-800"></div>
              </div>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setChatbotSidebarOpen(true)}
              className="relative"
            >
              <Bot className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-2">
              {/* Profile Avatar */}
              <div className="relative">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.full_name || 'User'} 
                    className="w-8 h-8 rounded-full object-cover border border-border"
                    onError={(e) => {
                      // If image fails to load, fallback to initials
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '';
                        const initialsDiv = document.createElement('div');
                        initialsDiv.className = 'w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground border border-border';
                        
                        // Generate initials from user's name
                        const names = (user.full_name || '').split(' ');
                        let initials = '';
                        if (names.length >= 2) {
                          initials = (names[0][0] + names[1][0]).toUpperCase();
                        } else if (names.length === 1) {
                          initials = names[0][0].toUpperCase();
                        } else {
                          initials = '?';
                        }
                        
                        initialsDiv.textContent = initials;
                        parent.appendChild(initialsDiv);
                      }
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground border border-border">
                    {user ? (() => {
                      const names = user.full_name?.split(' ') || [];
                      let initials = '';
                      if (names.length >= 2) {
                        initials = (names[0][0] + names[1][0]).toUpperCase();
                      } else if (names.length === 1) {
                        initials = names[0][0].toUpperCase();
                      } else {
                        initials = '?';
                      }
                      return initials;
                    })() : '?'}
                  </div>
                )}
              </div>
              
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={logout}
                  className="relative group p-0 w-8 h-8"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  <span className="sr-only">Logout</span>
                  <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50">
                    Logout
                    <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-800"></div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={notificationPanelOpen} 
        onClose={() => setNotificationPanelOpen(false)} 
      />
      

      
      {/* Chatbot Sidebar */}
      <ChatbotSidebar 
        isOpen={chatbotSidebarOpen} 
        onClose={() => setChatbotSidebarOpen(false)} 
      />
    </div>
  );
}