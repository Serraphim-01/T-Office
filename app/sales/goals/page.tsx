'use client';

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Target, TrendingUp, CheckCircle } from "lucide-react";

const salesGoals = [
  {
    id: 'G001',
    title: 'Quarterly Revenue Target',
    target: 250000,
    current: 175000,
    unit: '$',
  },
  {
    id: 'G002',
    title: 'New Leads per Month',
    target: 100,
    current: 85,
    unit: 'leads',
  },
  {
    id: 'G003',
    title: 'Close 10 Enterprise Deals',
    target: 10,
    current: 7,
    unit: 'deals',
  },
];

export default function GoalSettingPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-2xl font-bold">Goal Setting & Tracking</h1>
          <p className="text-muted-foreground">Set sales goals and monitor progress toward achieving them.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Set New Goal
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {salesGoals.map(goal => (
          <Card key={goal.id}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                {goal.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {goal.unit === '$' && '$'}{goal.current.toLocaleString()} / {goal.unit === '$' && '$'}{goal.target.toLocaleString()} {goal.unit !== '$' && goal.unit}
              </div>
              <div className="w-full bg-secondary rounded-full h-4 mt-2">
                <div
                  className="bg-primary h-4 rounded-full"
                  style={{ width: `${(goal.current / goal.target) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {((goal.current / goal.target) * 100).toFixed(1)}% complete
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>A summary of your team's progress towards all goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            <p>Your team is on track to meet its quarterly revenue target.</p>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
            <p>You have met 85% of your new leads goal for the month.</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
