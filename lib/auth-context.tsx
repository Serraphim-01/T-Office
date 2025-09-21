'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export interface Profile {
  id: string;
  updated_at: string;
  full_name: string;
  avatar_url: string;
  department: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  featureFlags: Record<string, boolean>;
  loading: boolean;
  logout: () => Promise<void>;
  login: (email, password) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);

        if (profileData?.department) {
          const { data: flagsData } = await supabase
            .from('department_features')
            .select('feature, is_enabled')
            .eq('department', profileData.department);

          const flags = flagsData.reduce((acc, { feature, is_enabled }) => {
            acc[feature] = is_enabled;
            return acc;
          }, {});
          setFeatureFlags(flags);
        }
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profileData);

          if (profileData?.department) {
            const { data: flagsData } = await supabase
              .from('department_features')
              .select('feature, is_enabled')
              .eq('department', profileData.department);

            const flags = flagsData.reduce((acc, { feature, is_enabled }) => {
              acc[feature] = is_enabled;
              return acc;
            }, {});
            setFeatureFlags(flags);
          }
        } else {
          setProfile(null);
          setFeatureFlags({});
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const refreshProfile = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    }
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        if (error.message === 'Invalid login credentials') {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });
            if (signUpError) {
                throw signUpError;
            }
        } else {
            throw error;
        }
    }
  };

  const value = {
    session,
    user,
    profile,
    featureFlags,
    loading,
    logout,
    refreshProfile,
    login,
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