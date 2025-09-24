'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  isActivityBarOpen: boolean;
  toggleActivityBar: () => void;
  setActivityBarOpen: (isOpen: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isActivityBarOpen, setActivityBarOpen] = useState(true);

  const toggleActivityBar = () => {
    setActivityBarOpen(prev => !prev);
  };

  return (
    <UIContext.Provider value={{ isActivityBarOpen, toggleActivityBar, setActivityBarOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
