'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { AttendanceDetails } from '@/components/attendance-details';

interface AttendanceRecord {
  id: number;
  sign_in_time: string;
  sign_out_time: string;
}

export default function AttendancePage() {
  const { user, featureFlags } = useAuth();
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDetails, setShowDetails] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (data) {
        setAttendanceRecord(data);
      }
      setLoading(false);
    };

    fetchAttendance();
  }, [user, today]);

  const canSignIn = () => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const time = hour + minute / 60;
    return time >= 7 && time <= 8.5;
  };

  const canSignOut = () => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const time = hour + minute / 60;
    return time >= 15.5 && time <= 17;
  };

  const handleSignIn = async () => {
    if (!user) return;

    // Check if a record for today already exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: "exact one row expected, but found no rows" which is fine here
      setError(fetchError.message);
      return;
    }

    if (existingRecord) {
      setError("You have already signed in today.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .insert({ user_id: user.id, date: today, sign_in_time: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setAttendanceRecord(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    if (!user || !attendanceRecord) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .update({ sign_out_time: new Date().toISOString() })
      .eq('id', attendanceRecord.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setAttendanceRecord(data);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">View your attendance record and sign in/out.</p>
          </div>
          {featureFlags['AttendanceDetails'] && (
            <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
            <CardDescription>
              {today} - {currentTime.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button
                onClick={handleSignIn}
                disabled={loading || !canSignIn() || !!attendanceRecord?.sign_in_time}
              >
                Sign In
              </Button>
              <Button
                onClick={handleSignOut}
                disabled={loading || !canSignOut() || !attendanceRecord?.sign_in_time || !!attendanceRecord?.sign_out_time}
                variant="outline"
              >
                Sign Out
              </Button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            {attendanceRecord && (
              <div className="space-y-2">
                <p>Signed In: {new Date(attendanceRecord.sign_in_time).toLocaleTimeString()}</p>
                {attendanceRecord.sign_out_time && <p>Signed Out: {new Date(attendanceRecord.sign_out_time).toLocaleTimeString()}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {showDetails && <AttendanceDetails />}
      </div>
    </DashboardLayout>
  );
}
