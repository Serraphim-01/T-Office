'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Profile {
  id: number; // Changed from string to number to match database
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
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  // Get API URL from environment variable, fallback to localhost for development
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('token');
      return null;
    }

    const response = await fetch(`${apiUrl}/api/refresh-token`, {
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
      console.error('Token refresh failed with status:', response.status);
      localStorage.removeItem('token');
      return null;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Remove token on network errors as well, since it might be corrupted
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
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // First try to refresh the token
          const newToken = await refreshAuthToken();
          if (newToken) {
            localStorage.setItem('token', newToken);
          }

          // Get the updated token (either refreshed or original)
          const currentToken = newToken || token;
          
          // Get API URL from environment variable, fallback to localhost for development
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          
          // Verify token with backend
          const response = await fetch(`${apiUrl}/api/profile`, {
            headers: {
              'Authorization': `Bearer ${currentToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();

            setUser({
              id: userData.id,
              updated_at: userData.created_at,
              full_name: userData.full_name,
              avatar_url: userData.profile_picture_url || '',
              department: userData.department,
            });
          } else {
            // Token is invalid, remove it
            console.error('Profile fetch failed with status:', response.status);
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Remove token on network errors as well
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Set up token refresh interval (refresh every 55 minutes to stay ahead of 1-hour expiration)
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
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
    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
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