'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AttendancePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [signInStart, setSignInStart] = useState('07:00');
  const [signInEnd, setSignInEnd] = useState('08:30');
  const [signOutStart, setSignOutStart] = useState('15:30');
  const [signOutEnd, setSignOutEnd] = useState('17:00');
  const [attendance, setAttendance] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const savedAttendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    setAttendance(savedAttendance);
  }, []);

  const handleTimeChange = () => {
    // In a real app, you would save these settings to a backend or localStorage.
    // For this demo, we'll just update the state.
    console.log({ signInStart, signInEnd, signOutStart, signOutEnd });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">View your attendance record and sign in/out.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Time Configuration</CardTitle>
            <CardDescription>Set the sign-in and sign-out time windows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sign-in-start">Sign-in Start Time</Label>
              <Input id="sign-in-start" type="time" value={signInStart} onChange={(e) => setSignInStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-in-end">Sign-in End Time</Label>
              <Input id="sign-in-end" type="time" value={signInEnd} onChange={(e) => setSignInEnd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-out-start">Sign-out Start Time</Label>
              <Input id="sign-out-start" type="time" value={signOutStart} onChange={(e) => setSignOutStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-out-end">Sign-out End Time</Label>
              <Input id="sign-out-end" type="time" value={signOutEnd} onChange={(e) => setSignOutEnd(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Button onClick={handleTimeChange}>Save Configuration</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Your attendance record for the month.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              // Here you would add logic to display attendance data on the calendar
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
