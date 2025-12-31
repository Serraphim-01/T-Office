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
    return (
      <div className="p-6 text-center">
        <PieChart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Coming Soon</h3>
        <p className="text-gray-500">Analytics for this page are coming soon</p>
      </div>
    );
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