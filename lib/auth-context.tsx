'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Profile {
  id: string;
  updated_at: string;
  full_name: string;
  avatar_url: string;
  department: string | null;
  role: string | null;
}

interface AuthContextType {
  user: Profile | null;
  featureFlags: Record<string, any>;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  setFeatureFlags: (flags: Record<string, any>) => void;
  logout: () => void;
  hasFeatureAccess: (mainFeature: string, subfeature: string, func?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true); // Start with loading true

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token with backend
          const response = await fetch('http://localhost:4000/api/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser({
              id: userData.id,
              updated_at: userData.created_at,
              full_name: userData.full_name,
              avatar_url: '',
              department: userData.department,
              role: userData.role,
            });
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    setUser(null);
    setFeatureFlags({});
    localStorage.removeItem('token');
  };

  const hasFeatureAccess = (mainFeature: string, subfeature: string, func?: string): boolean => {
    if (!user || !featureFlags) return false;

    const mainFeatureData = featureFlags[mainFeature];
    if (!mainFeatureData) return false;

    const subfeatureData = mainFeatureData[subfeature];
    if (!subfeatureData || !subfeatureData.enabled) return false;

    // If func is specified, check if it exists in functions object, otherwise assume enabled
    if (func) {
      return subfeatureData.functions ? subfeatureData.functions[func] === true : true;
    }

    return true;
  };

  const value = {
    user,
    featureFlags,
    loading,
    setUser,
    setFeatureFlags,
    logout,
    hasFeatureAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
