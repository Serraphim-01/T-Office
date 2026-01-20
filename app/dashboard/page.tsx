'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, CheckCircle, AlertCircle, Calendar, MessageSquare, FileText, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from 'recharts';

// Define the data type for our attendance analytics
type AttendanceAnalyticsData = {
  week_start: string;
  avg_clock_in: string | null;
  avg_clock_out: string | null;
  clock_ins_outs_count: number;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State to hold attendance analytics data
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalyticsData[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Fetch attendance analytics data
  useEffect(() => {
    const fetchAttendanceAnalytics = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/attendance-analytics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAttendanceData(data);
        } else {
          console.error('Failed to fetch attendance analytics');
        }
      } catch (error) {
        console.error('Error fetching attendance analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (user && !loading) {
      fetchAttendanceAnalytics();
    }
  }, [user, loading]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }
  
  // Prepare data for the chart - convert time strings to numbers for plotting
  const chartData = attendanceData.map((item: AttendanceAnalyticsData) => {
    // Convert time strings like "09:30" to decimal hours (9.5)
    const parseTimeToDecimal = (timeStr: string | null) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours + minutes / 60;
    };
    
    return {
      ...item,
      weekLabel: `Week of ${new Date(item.week_start).toLocaleDateString()}`,
      avg_clock_in_decimal: parseTimeToDecimal(item.avg_clock_in),
      avg_clock_out_decimal: parseTimeToDecimal(item.avg_clock_out),
    };
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, {user.full_name}!</h1>
          <p className="text-muted-foreground">Here's your attendance overview.</p>
        </div>

        {/* Attendance Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Analytics (Last 5 Weeks)
            </CardTitle>
            <CardDescription>
              Average clock-in/out times and total clock-ins/outs per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <div className="h-80 flex items-center justify-center">
                <p>Loading attendance data...</p>
              </div>
            ) : attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    tickFormatter={(value) => {
                      // Convert decimal hours back to time format for display
                      const hours = Math.floor(value);
                      const minutes = Math.floor((value - hours) * 60);
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'avg_clock_in_decimal' || name === 'avg_clock_out_decimal') {
                        if (value === null) return ['N/A', name === 'avg_clock_in_decimal' ? 'Avg Clock In' : 'Avg Clock Out'];
                        const hours = Math.floor(Number(value));
                        const minutes = Math.floor((Number(value) - hours) * 60);
                        return [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, 
                                name === 'avg_clock_in_decimal' ? 'Avg Clock In' : 'Avg Clock Out'];
                      }
                      return [value, name === 'clock_ins_outs_count' ? 'Clock Ins & Outs' : name];
                    }}
                    labelFormatter={(label) => `Week: ${label}`}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avg_clock_in_decimal"
                    name="Avg Clock In"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avg_clock_out_decimal"
                    name="Avg Clock Out"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="clock_ins_outs_count"
                    name="Total Clock Ins & Outs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No attendance data</h3>
                <p className="text-muted-foreground max-w-md">
                  You don't have any attendance records in the last 5 weeks. 
                  Start clocking in and out to see your analytics here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}