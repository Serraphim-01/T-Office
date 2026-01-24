'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, CheckCircle, AlertCircle, Calendar, MessageSquare, FileText, Clock, Building, Activity, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { io, Socket } from 'socket.io-client';

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

// Define the data type for role distribution
type RoleDistributionData = {
  role: string;
  userCount: number;
  color: string;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  // State to hold attendance analytics data
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalyticsData[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  
  // State for time period selection
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'daily'>('weekly');
  const [timeframe, setTimeframe] = useState<string>('last_6_months');
  const [quarter, setQuarter] = useState<string>('Q1');
  
  // State to hold user department data
  const [departmentData, setDepartmentData] = useState<UserDepartmentData[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  
  // State to hold role distribution data
  const [roleData, setRoleData] = useState<RoleDistributionData[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  

  // Initialize WebSocket connection
  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      socketRef.current = io(apiUrl);

      // Listen for dashboard data updates
      socketRef.current.on('dashboard_data_updated', (data) => {
        console.log('Received dashboard data update:', data);
        // Refresh all dashboard data when any relevant change occurs
        refreshDashboardData();
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [user]);

  // Function to refresh all dashboard data
  const refreshDashboardData = async () => {
    if (!user) return;

    // Refresh attendance data
    const attendanceParams = new URLSearchParams({
      period,
      timeframe,
      quarter
    });
    
    try {
      const attendanceResponse = await fetch(`/api/attendance-analytics?${attendanceParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        setAttendanceData(attendanceData);
      }
    } catch (error) {
      console.error('Error refreshing attendance data:', error);
    }

    // Refresh department statistics
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const deptResponse = await fetch(`${apiUrl}/api/hr/department-statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartmentData(deptData);
      }
    } catch (error) {
      console.error('Error refreshing department data:', error);
    }

    // Refresh role distribution
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const roleResponse = await fetch(`${apiUrl}/api/hr/role-distribution/${encodeURIComponent(user.department || 'Unassigned')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setRoleData(roleData);
      }
    } catch (error) {
      console.error('Error refreshing role data:', error);
    }
  };

  // Fetch attendance analytics data
  useEffect(() => {
    const fetchAttendanceAnalytics = async () => {
      if (!user) return;
      
      try {
        const params = new URLSearchParams({
          period,
          timeframe,
          quarter
        });
        
        const response = await fetch(`/api/attendance-analytics?${params}`, {
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
  }, [user, loading, period, timeframe, quarter]);

  // Fetch department statistics data - all departments
  useEffect(() => {
    const fetchDepartmentData = async () => {
      if (!user) return;
      
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/hr/department-statistics`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setDepartmentData(data);
        } else {
          console.error('Failed to fetch department statistics');
        }
      } catch (error) {
        console.error('Error fetching department statistics:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    if (user && !loading) {
      fetchDepartmentData();
    }
  }, [user, loading]);

  // Fetch role distribution data for current user's department
  useEffect(() => {
    const fetchRoleData = async () => {
      if (!user || !user.department) return;
      
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/hr/role-distribution/${encodeURIComponent(user.department || 'Unassigned')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRoleData(data);
        } else {
          console.error('Failed to fetch role distribution');
        }
      } catch (error) {
        console.error('Error fetching role distribution:', error);
      } finally {
        setLoadingRoles(false);
      }
    };

    if (user && !loading) {
      fetchRoleData();
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
    
    // Format label based on period type
    let label;
    // Parse the date string properly
    const dateValue = new Date(item.week_start);
    
    // Check if date is valid
    if (isNaN(dateValue.getTime())) {
      console.error('Invalid date:', item.week_start);
      label = 'Invalid Date';
    } else {
      if (period === 'monthly') {
        // Show Month and Year (e.g., "Jan 2025")
        label = dateValue.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
      } else if (period === 'daily') {
        // Show Day and Date (e.g., "Mon 19")
        const dayName = dateValue.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = dateValue.getDate();
        label = `${dayName} ${dayNumber}`;
      } else { // weekly
        label = dateValue.toLocaleDateString();
      }
    }
    
    return {
      ...item,
      weekLabel: label,
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attendance Analytics
                </CardTitle>
                <CardDescription>
                  Average clock-in/out times and total clock-ins/outs
                </CardDescription>
              </div>
              
              {/* Time Period Controls */}
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Period</label>
                  <Select value={period} onValueChange={(value: 'monthly' | 'weekly' | 'daily') => setPeriod(value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Timeframe</label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {period === 'monthly' && (
                        <>
                          <SelectItem value="quarter">Quarter</SelectItem>
                          <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                          <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                        </>
                      )}
                      {period === 'weekly' && (
                        <>
                          <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                          <SelectItem value="last_6_weeks">Last 6 Weeks</SelectItem>
                          <SelectItem value="last_8_weeks">Last 8 Weeks</SelectItem>
                        </>
                      )}
                      {period === 'daily' && (
                        <>
                          <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                          <SelectItem value="last_14_days">Last 14 Days</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {period === 'monthly' && timeframe === 'quarter' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Quarter</label>
                    <Select value={quarter} onValueChange={setQuarter}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q1">Q1</SelectItem>
                        <SelectItem value="Q2">Q2</SelectItem>
                        <SelectItem value="Q3">Q3</SelectItem>
                        <SelectItem value="Q4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <div className="h-80 flex items-center justify-center">
                <p>Loading attendance data...</p>
              </div>
            ) : attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(400, Math.min(600, attendanceData.length * (period === 'daily' ? 60 : (period === 'monthly' ? 100 : 80))))}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 50, left: 20, bottom: period === 'daily' ? 60 : (period === 'monthly' ? 40 : 60) }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 12 }}
                    angle={period === 'daily' ? -45 : (period === 'monthly' ? 0 : -45)}
                    textAnchor={period === 'daily' ? "end" : (period === 'monthly' ? "middle" : "end")}
                    height={period === 'daily' ? 80 : (period === 'monthly' ? 60 : 80)}
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
                    labelFormatter={(label) => {
                      if (period === 'monthly') return `Month: ${label}`;
                      if (period === 'daily') {
                        // Extract the actual date from the data for tooltip
                        const actualDate = chartData.find(item => item.weekLabel === label)?.week_start;
                        return actualDate ? `Date: ${new Date(actualDate).toLocaleDateString()}` : `Date: ${label}`;
                      }
                      return `Week: ${label}`;
                    }}
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
                  You don't have any attendance records for the selected {period} period. 
                  Start clocking in and out to see your analytics here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                All Departments
              </CardTitle>
              <CardDescription>
                Active user count across all departments
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
                Roles in {user?.department || 'Your Department'}
              </CardTitle>
              <CardDescription>
                User distribution by role in your department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="h-80 flex items-center justify-center">
                  <p>Loading role data...</p>
                </div>
              ) : roleData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="userCount"
                        nameKey="role"
                        label={({ role, userCount }) => `${role}: ${userCount}`}
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [value, 'Users']}
                        labelFormatter={(label) => `Role: ${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-4 w-full">
                    <h3 className="text-lg font-medium mb-3">Role Summary</h3>
                    <div className="space-y-2">
                      {roleData.map((role, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: role.color }}
                            ></div>
                            <span className="font-medium">{role.role}</span>
                          </div>
                          <Badge variant="secondary">{role.userCount} users</Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="font-medium text-blue-800 mb-2">Department Overview</h4>
                      <p className="text-sm text-blue-700">
                        Your department <span className="font-semibold">{user?.department}</span> has{' '}
                        <span className="font-semibold">{roleData.reduce((sum, role) => sum + role.userCount, 0)}</span>{' '}
                        active users distributed across {roleData.length} different roles.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-80 flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No role data</h3>
                  <p className="text-muted-foreground max-w-md">
                    No role data available for your department. Contact your administrator to ensure proper data is loaded.
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