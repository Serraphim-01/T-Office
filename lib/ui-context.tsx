'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  border: string;
  input: string;
  ring: string;
}

interface UIContextType {
  isActivityBarOpen: boolean;
  toggleActivityBar: () => void;
  setActivityBarOpen: (isOpen: boolean) => void;
  theme: Theme;
  updateTheme: (key: keyof Theme, value: string) => void;
  resetTheme: () => void;
}

const defaultTheme: Theme = {
  primary: '221.2 83.2% 53.3%',
  secondary: '210 40% 98%',
  background: '0 0% 100%',
  foreground: '0 0% 3.9%',
  card: '0 0% 100%',
  'card-foreground': '0 0% 3.9%',
  muted: '0 0% 96.1%',
  'muted-foreground': '0 0% 45.1%',
  accent: '0 0% 96.1%',
  'accent-foreground': '0 0% 9%',
  border: '0 0% 89.8%',
  input: '0 0% 89.8%',
  ring: '221.2 83.2% 53.3%',
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isActivityBarOpen, setActivityBarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customTheme');
      return stored ? JSON.parse(stored) : defaultTheme;
    }
    return defaultTheme;
  });

  const toggleActivityBar = () => {
    setActivityBarOpen(prev => !prev);
  };

  const updateTheme = (key: keyof Theme, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
      localStorage.setItem('customTheme', JSON.stringify(theme));
    }
  }, [theme]);

  // Apply theme on mount to ensure consistency
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
    }
  }, []);

  return (
    <UIContext.Provider value={{ isActivityBarOpen, toggleActivityBar, setActivityBarOpen, theme, updateTheme, resetTheme }}>
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