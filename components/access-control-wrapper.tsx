'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { useRouter } from 'next/navigation';

interface AccessControlWrapperProps {
  children: React.ReactNode;
  pagePath: string;
}

export function AccessControlWrapper({ children, pagePath }: AccessControlWrapperProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // Don't show loading state on initial render to prevent flash
      if (!initialCheckDone) {
        setLoading(false);
      }

      // Wait for auth context to finish loading before checking access
      if (authLoading) {
        return;
      }

      // Validate inputs - only redirect if auth is done loading and no user
      if (!user) {
        router.push('/login');
        return;
      }

      // Ensure userId is a string (user.id is already a string according to Profile interface)
      const userId = user.id;

      try {
        const access = await hasPageAccess(userId, pagePath);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
        setInitialCheckDone(true);
      }
    };

    checkAccess();
  }, [user, pagePath, router, initialCheckDone, authLoading]);

  // Show loading only on subsequent checks, not initial render
  // Also show loading while auth context is still initializing
  if ((loading && initialCheckDone) || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!hasAccess && initialCheckDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Render children immediately to prevent flash, hide with CSS if no access
  return (
    <div style={{ display: (initialCheckDone && !hasAccess) ? 'none' : 'block' }}>
      {children}
    </div>
  );
}