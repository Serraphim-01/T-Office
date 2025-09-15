'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportPage() {
  const [activities, setActivities] = useState<{ text: string, timestamp: string }[]>([]);
  const [timeFilter, setTimeFilter] = useState('day');

  useEffect(() => {
    const savedActivities = JSON.parse(localStorage.getItem('activities') || '[]');
    setActivities(savedActivities);
  }, []);

  const filteredActivities = activities.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    const now = new Date();
    if (timeFilter === 'day') {
      return activityDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'week') {
      const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
      return activityDate > oneWeekAgo;
    }
    if (timeFilter === 'month') {
      const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
      return activityDate > oneMonthAgo;
    }
    if (timeFilter === 'year') {
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      return activityDate > oneYearAgo;
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Activity Report</h1>
            <p className="text-muted-foreground">A summary of your activity.</p>
          </div>
          <Select onValueChange={setTimeFilter} defaultValue={timeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Activity</CardTitle>
            <CardDescription>A list of your recent activities.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.text}</TableCell>
                    <TableCell>{new Date(activity.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
