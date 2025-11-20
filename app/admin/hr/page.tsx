'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHRRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hr');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg">Redirecting to HR Dashboard...</p>
      </div>
    </div>
  );
}
