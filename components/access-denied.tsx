'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  featureName?: string;
  returnUrl?: string;
  returnLabel?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  message = 'You don\'t have permission to access this feature. Please contact your administrator.',
  featureName,
  returnUrl = '/dashboard',
  returnLabel = 'Return to Dashboard'
}: AccessDeniedProps) {
  const router = useRouter();
  
  const displayMessage = featureName 
    ? `You don't have permission to access the ${featureName} feature. Please contact your administrator.`
    : message;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              {title}
            </CardTitle>
            <CardDescription>
              {displayMessage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(returnUrl)} className="w-full">
              {returnLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AccessDenied;