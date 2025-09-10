'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, CheckCircle, AlertCircle, Calendar, MessageSquare, FileText, Clock } from 'lucide-react';

export default function DashboardPage() {
  // Mock data for charts
  const performanceData = [
    { month: 'Jan', completed: 65, pending: 35 },
    { month: 'Feb', completed: 75, pending: 25 },
    { month: 'Mar', completed: 85, pending: 40 },
    { month: 'Apr', completed: 90, pending: 30 },
    { month: 'May', completed: 95, pending: 20 },
    { month: 'Jun', completed: 88, pending: 25 },
  ];

  const departmentData = [
    { name: 'Engineering', value: 35, color: '#3B82F6' },
    { name: 'Marketing', value: 25, color: '#10B981' },
    { name: 'Sales', value: 20, color: '#F59E0B' },
    { name: 'HR', value: 12, color: '#EF4444' },
    { name: 'Operations', value: 8, color: '#8B5CF6' },
  ];

  const activityData = [
    { day: 'Mon', tasks: 24, meetings: 8 },
    { day: 'Tue', tasks: 18, meetings: 12 },
    { day: 'Wed', tasks: 32, meetings: 6 },
    { day: 'Thu', tasks: 28, meetings: 10 },
    { day: 'Fri', tasks: 22, meetings: 14 },
  ];

  const complianceItems = [
    { title: 'Security Training', status: 'completed', progress: 100 },
    { title: 'Data Privacy Course', status: 'pending', progress: 75 },
    { title: 'Safety Protocols', status: 'completed', progress: 100 },
    { title: 'Code of Conduct', status: 'in-progress', progress: 60 },
    { title: 'Emergency Procedures', status: 'pending', progress: 30 },
  ];

  const departmentUpdates = [
    {
      department: 'Engineering',
      title: 'Q2 Sprint Planning Complete',
      time: '2 hours ago',
      type: 'announcement'
    },
    {
      department: 'Marketing',
      title: 'New Brand Guidelines Released',
      time: '4 hours ago',
      type: 'update'
    },
    {
      department: 'HR',
      title: 'Benefits Enrollment Deadline',
      time: '1 day ago',
      type: 'deadline'
    },
    {
      department: 'Operations',
      title: 'Office Maintenance Scheduled',
      time: '2 days ago',
      type: 'notice'
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'deadline':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'update':
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
          <p className="text-gray-600">Here's what's happening in your office today.</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-blue-600">+3</span> new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">88%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+5%</span> improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                Next 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>Task completion trends over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#3B82F6" name="Completed" />
                  <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
              <CardDescription>Team member distribution across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Task and meeting activity for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="tasks" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Tasks"
                />
                <Line 
                  type="monotone" 
                  dataKey="meetings" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Meetings"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Checklist</CardTitle>
              <CardDescription>Your current compliance status and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.title}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <Progress value={item.progress} className="h-2" />
                  <p className="text-xs text-gray-500">{item.progress}% complete</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Department Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Department Updates</CardTitle>
              <CardDescription>Latest announcements and updates from your departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {departmentUpdates.map((update, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getUpdateIcon(update.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{update.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {update.department}
                      </Badge>
                      <span className="text-xs text-gray-500">{update.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}