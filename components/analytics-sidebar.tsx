'use client';

import { useRef } from 'react';
import { X, PieChart, BarChart3, Users, MessageCircle, User, Package, Clock, FileText, Settings, Building } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AnalyticsSidebarProps {
  isOpen: boolean; 
  onClose: () => void;
  currentPage?: string; // e.g., 'products', 'chat', 'profile', etc.
}

export function AnalyticsSidebar({ isOpen, onClose, currentPage = '' }: AnalyticsSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close panel
  const handleClickOutside = (event: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  // Close panel when pressing Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add event listeners when panel is open
  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  }

  // Clean up event listeners when component unmounts
  const cleanupEventListeners = () => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
  };

  // Clean up on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupEventListeners);
  };

  // Get analytics content based on current page
  const getPageAnalytics = () => {
    if (!currentPage) {
      return (
        <div className="p-6 text-center">
          <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Page Selected</h3>
          <p className="text-gray-500">Navigate to a page to see its analytics</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'products':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              <Package className="h-6 w-6 mr-3 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-800">Product Analytics</h3>
                <p className="text-sm text-blue-600">Inventory metrics for products</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Total Products</h4>
                <p className="text-2xl font-bold mt-1">142</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Low Stock</h4>
                <p className="text-2xl font-bold mt-1 text-orange-500">8</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <h4 className="font-medium text-sm mb-2">Top Products</h4>
              <ul className="space-y-2">
                <li className="flex justify-between text-sm">
                  <span>Product A</span>
                  <span className="font-medium">24 units</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Product B</span>
                  <span className="font-medium">18 units</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Product C</span>
                  <span className="font-medium">15 units</span>
                </li>
              </ul>
            </div>
          </div>
        );
      
      case 'chat':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-100">
              <MessageCircle className="h-6 w-6 mr-3 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Chat Analytics</h3>
                <p className="text-sm text-green-600">Communication metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Active Users</h4>
                <p className="text-2xl font-bold mt-1">24</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Messages Today</h4>
                <p className="text-2xl font-bold mt-1">142</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <h4 className="font-medium text-sm mb-2">Most Active Channels</h4>
              <ul className="space-y-2">
                <li className="flex justify-between text-sm">
                  <span>General</span>
                  <span className="font-medium">42 messages</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Support</span>
                  <span className="font-medium">31 messages</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span>Announcements</span>
                  <span className="font-medium">18 messages</span>
                </li>
              </ul>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
              <User className="h-6 w-6 mr-3 text-purple-600" />
              <div>
                <h3 className="font-medium text-purple-800">Profile Analytics</h3>
                <p className="text-sm text-purple-600">User profile metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Profile Views</h4>
                <p className="text-2xl font-bold mt-1">36</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Last Updated</h4>
                <p className="text-sm mt-1">2 days ago</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <h4 className="font-medium text-sm mb-2">Profile Completion</h4>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-right text-xs text-gray-500 mt-1">85% complete</p>
            </div>
          </div>
        );
      
      case 'inventory':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <Package className="h-6 w-6 mr-3 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Inventory Analytics</h3>
                <p className="text-sm text-yellow-600">Overall inventory metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Total Items</h4>
                <p className="text-2xl font-bold mt-1">1,248</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Value</h4>
                <p className="text-2xl font-bold mt-1">$24,568</p>
              </div>
            </div>
          </div>
        );
      
      case 'hr':
      case 'hr/users':
      case 'hr/onboarding':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-100">
              <Users className="h-6 w-6 mr-3 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">HR Analytics</h3>
                <p className="text-sm text-red-600">Human resources metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Total Users</h4>
                <p className="text-2xl font-bold mt-1">42</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Active Today</h4>
                <p className="text-2xl font-bold mt-1">36</p>
              </div>
            </div>
          </div>
        );
      
      case 'clock':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <Clock className="h-6 w-6 mr-3 text-indigo-600" />
              <div>
                <h3 className="font-medium text-indigo-800">Clock Analytics</h3>
                <p className="text-sm text-indigo-600">Time tracking metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Clocked In</h4>
                <p className="text-2xl font-bold mt-1">28</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Avg. Hours</h4>
                <p className="text-2xl font-bold mt-1">7.8</p>
              </div>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <Settings className="h-6 w-6 mr-3 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-800">Settings Analytics</h3>
                <p className="text-sm text-gray-600">System configuration metrics</p>
              </div>
            </div>
            
            <div className="p-4 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="font-medium text-gray-800 mb-1">No specific analytics</h3>
              <p className="text-sm text-gray-600">Settings page doesn't have dedicated analytics</p>
            </div>
          </div>
        );
      
      case 'admin':
        return (
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-teal-50 rounded-lg border border-teal-100">
              <Building className="h-6 w-6 mr-3 text-teal-600" />
              <div>
                <h3 className="font-medium text-teal-800">Admin Analytics</h3>
                <p className="text-sm text-teal-600">Administrative metrics</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">System Status</h4>
                <p className="text-2xl font-bold mt-1">OK</p>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="font-medium text-sm">Active Sessions</h4>
                <p className="text-2xl font-bold mt-1">42</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-6 text-center">
            <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Analytics Available</h3>
            <p className="text-gray-500">Analytics for this page are coming soon</p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Slide-out panel */}
      <div className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Backdrop - only show when panel is open */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={onClose}
          />
        )}
        
        {/* Panel */}
        <div 
          ref={panelRef}
          className="relative h-full w-[50vw] max-w-[600px] min-w-[400px] bg-white shadow-xl border-l border-gray-200 flex flex-col z-50"
        >
          <Card className="flex-1 flex flex-col h-full rounded-none border-0 border-l">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
              <div className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-lg font-semibold">Analytics - {currentPage || 'Dashboard'}</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)] p-4">
                {getPageAnalytics()}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}