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
  const { user } = useAuth();
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

      // Validate inputs
      if (!user) {
        router.push('/login');
        return;
      }

      // Ensure userId is a string
      const userId = typeof user.id === 'string' ? user.id : user.id.toString();

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
  }, [user, pagePath, router, initialCheckDone]);

  // Show loading only on subsequent checks, not initial render
  if (loading && initialCheckDone) {
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