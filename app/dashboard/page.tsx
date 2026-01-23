'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, CheckCircle, AlertCircle, Calendar, MessageSquare, FileText, Clock, Building, Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Define the data type for our attendance analytics
type AttendanceAnalyticsData = {
  week_start: string;
  avg_clock_in: string | null;
  avg_clock_out: string | null;
  clock_ins_outs_count: number;
};

// Define the data type for user department analytics
type UserDepartmentData = {
  department: string;
  userCount: number;
  color: string;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State to hold attendance analytics data
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalyticsData[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  
  // State to hold user department data
  const [departmentData, setDepartmentData] = useState<UserDepartmentData[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

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

  // Fetch department user data - only for current user's department
  useEffect(() => {
    const fetchDepartmentData = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/hr/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          
          // Filter users by current user's department
          const currentUserDepartment = user.department;
          const departmentUsers = users.filter((u: any) => 
            u.department === currentUserDepartment && u.active !== false
          );
          
          // Count users in current department
          const departmentCount = departmentUsers.length;
          
          // Generate data for current department only
          const formattedData: UserDepartmentData[] = [{
            department: currentUserDepartment || 'Unassigned',
            userCount: departmentCount,
            color: '#4f46e5'
          }];
          
          setDepartmentData(formattedData);
        } else {
          console.error('Failed to fetch department data');
        }
      } catch (error) {
        console.error('Error fetching department data:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    if (user && !loading) {
      fetchDepartmentData();
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
      weekLabel: new Date(item.week_start).toLocaleDateString(),
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

        {/* Current Department User Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Your Department: {user?.department}
              </CardTitle>
              <CardDescription>
                Number of active users in your department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDepartments ? (
                <div className="h-80 flex items-center justify-center">
                  <p>Loading department data...</p>
                </div>
              ) : departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={departmentData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="department" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Active Users']}
                      labelFormatter={(label) => `Department: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="userCount" 
                      name="Active Users" 
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No department data</h3>
                  <p className="text-muted-foreground max-w-md">
                    No department data available. Contact your administrator to ensure proper data is loaded.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Department Breakdown
              </CardTitle>
              <CardDescription>
                Your department overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDepartments ? (
                <div className="h-80 flex items-center justify-center">
                  <p>Loading department data...</p>
                </div>
              ) : departmentData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="userCount"
                        nameKey="department"
                        label={({ department, userCount }) => `${department}: ${userCount}`}
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [value, 'Active Users']}
                        labelFormatter={(label) => `Department: ${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-4 w-full">
                    <h3 className="text-lg font-medium mb-3">Department Summary</h3>
                    <div className="space-y-2">
                      {departmentData.map((dept, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: dept.color }}
                            ></div>
                            <span className="font-medium">{dept.department}</span>
                          </div>
                          <Badge variant="secondary">{dept.userCount} users</Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="font-medium text-blue-800 mb-2">Your Department Info</h4>
                      <p className="text-sm text-blue-700">
                        You belong to the <span className="font-semibold">{user?.department}</span> department. 
                        There are <span className="font-semibold">{departmentData[0]?.userCount || 0}</span> active users in your department.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No department data</h3>
                  <p className="text-muted-foreground max-w-md">
                    No department data available. Contact your administrator to ensure proper data is loaded.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}