'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { checkCurrentPageAccess } from '@/lib/page-access';

interface AccessControlWrapperProps {
  children: React.ReactNode;
  pagePath: string;
}

export function AccessControlWrapper({ children, pagePath }: AccessControlWrapperProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const access = await checkCurrentPageAccess(user, pagePath);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking page access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, pagePath]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="text-center p-8 rounded-lg border bg-card text-card-foreground shadow-sm max-w-md">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6 text-muted-foreground">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}