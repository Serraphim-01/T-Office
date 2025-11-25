'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Profile {
  id: string;
  updated_at: string;
  full_name: string;
  avatar_url: string;
  department: string | null;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to refresh the token
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch('http://localhost:4000/api/refresh-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    } else {
      // If refresh fails, remove the token
      localStorage.removeItem('token');
      return null;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('token');
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // First try to refresh the token
          const newToken = await refreshAuthToken();
          if (newToken) {
            localStorage.setItem('token', newToken);
          }

          // Verify token with backend
          const response = await fetch('http://localhost:4000/api/profile', {
            headers: {
              'Authorization': `Bearer ${newToken || token}`,
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

  // Set up token refresh interval (refresh every 55 minutes to stay ahead of 1-hour expiration)
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const newToken = await refreshAuthToken();
          if (newToken) {
            localStorage.setItem('token', newToken);
          }
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
        }
      }
    }, 55 * 60 * 1000); // 55 minutes

    return () => clearInterval(interval);
  }, []);

  const refreshToken = async (): Promise<boolean> => {
    const newToken = await refreshAuthToken();
    if (newToken) {
      localStorage.setItem('token', newToken);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    loading,
    setUser,
    logout,
    refreshToken
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