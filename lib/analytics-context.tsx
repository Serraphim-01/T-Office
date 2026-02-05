'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsContextType {
  isAnalyticsSidebarOpen: boolean;
  openAnalyticsSidebar: () => void;
  closeAnalyticsSidebar: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [isAnalyticsSidebarOpen, setIsAnalyticsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const openAnalyticsSidebar = () => {
    setIsAnalyticsSidebarOpen(true);
  };

  const closeAnalyticsSidebar = () => {
    setIsAnalyticsSidebarOpen(false);
  };

  return (
    <AnalyticsContext.Provider 
      value={{ 
        isAnalyticsSidebarOpen, 
        openAnalyticsSidebar, 
        closeAnalyticsSidebar,
        currentPage,
        setCurrentPage
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}