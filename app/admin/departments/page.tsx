'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DepartmentsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Departments Management</h1>
        <p className="text-muted-foreground mb-6">This page is under construction.</p>
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>A list of departments in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Feature coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
