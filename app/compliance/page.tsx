'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompliancePage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compliance</h1>
            <p className="text-muted-foreground">Monitor and manage compliance with external regulations and internal policies.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
            <CardDescription>This page is under construction.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>The compliance agent and dashboard will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
