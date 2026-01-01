'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefreshCountdownTestPage() {
  const triggerFeatureUpdate = () => {
    // Dispatch the feature update event to trigger the countdown
    window.dispatchEvent(new CustomEvent('feature-update-notification'));
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Refresh Countdown Test</CardTitle>
            <CardDescription>
              Test the feature update refresh countdown functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Click the button below to simulate a feature update notification. 
              This will trigger the refresh countdown that appears at the top of the screen.
            </p>
            <Button onClick={triggerFeatureUpdate}>
              Trigger Feature Update Notification
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}