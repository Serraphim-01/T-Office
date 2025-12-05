'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Mail, Building, FileText, Calendar, Clock, CheckCircle, AlertCircle, Link } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  certifications?: any[];
  cv?: string;
  portfolio?: string;
  job_description?: string;
  contract?: string;
  query_count?: number;
  attendance?: any[];
  other_details?: any;
}

interface AttendanceRecord {
  id: number;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface WikiCompletion {
  id: number;
  department: string;
  topic: string;
  completed_at: string | null;
  comment: string | null;
}

export default function UserDetailsPage({ params }: { params: { id: string } }) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [wikiCompletions, setWikiCompletions] = useState<WikiCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Support staff state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedSupportStaffId, setSelectedSupportStaffId] = useState<string>('');
  const [supportStaffAssignments, setSupportStaffAssignments] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser && params.id) {
      fetchUserDetails();
      fetchUserAttendance();
      fetchUserWikiCompletions();
      fetchUsers(); // For support staff dropdown
      fetchSupportStaffAssignments(params.id); // For current support staff
    }
  }, [currentUser, params.id]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/users/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.error('Failed to fetch user details - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAttendance = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/attendance/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Map the database fields to what the UI expects
        const mappedAttendance = data.map((record: any) => ({
          id: record.id,
          clock_in: record.clock_in,
          clock_out: record.clock_out,
          total_hours: record.total_hours,
          status: record.status,
          notes: record.notes,
          created_at: record.created_at,
          updated_at: record.updated_at
        }));
        setAttendance(mappedAttendance);
      } else {
        console.error('Failed to fetch attendance - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const fetchUserWikiCompletions = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/wiki-completions/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setWikiCompletions(data);
      } else {
        console.error('Failed to fetch wiki completions - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch wiki completions:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/hr/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchSupportStaffAssignments = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/users/${userId}/support-staff`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch support staff assignments');
      
      const data = await response.json();
      setSupportStaffAssignments(data);
    } catch (error) {
      console.error('Error fetching support staff assignments:', error);
    }
  };

  const handleAssignSupportStaff = async () => {
    if (!selectedSupportStaffId) {
      toast({
        title: 'Error',
        description: 'Please select a support staff member',
        variant: 'destructive',
      });
      return;
    }

    // Prevent assigning a user as their own support staff
    if (params.id === selectedSupportStaffId) {
      toast({
        title: 'Error',
        description: 'A user cannot be their own support staff',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/users/${params.id}/assign-support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ supportStaffId: parseInt(selectedSupportStaffId) }),
      });

      if (!response.ok) throw new Error('Failed to assign support staff');

      toast({
        title: 'Success',
        description: 'Support staff assigned successfully',
      });
      
      // Refresh assignments
      fetchSupportStaffAssignments(params.id);
      setSelectedSupportStaffId(''); // Reset selection
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign support staff',
        variant: 'destructive',
      });
    }
  };

  const handleUnassignSupportStaff = async (supportStaffId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/users/${params.id}/unassign-support/${supportStaffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to unassign support staff');

      toast({
        title: 'Success',
        description: 'Support staff unassigned successfully',
      });
      
      // Refresh assignments
      fetchSupportStaffAssignments(params.id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unassign support staff',
        variant: 'destructive',
      });
    }
  };

  const updateUserDetails = async (details: any) => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(details),
      });

      if (response.ok) {
        alert('User details updated successfully!');
        fetchUserDetails();
      } else {
        alert('Failed to update user details');
      }
    } catch (error) {
      console.error('Error updating user details:', error);
      alert('Error updating user details');
    }
  };

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Please Log In</h1>
          <p>You need to be logged in to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">User Not Found</h1>
          <p>The requested user could not be found.</p>
          <Button onClick={() => router.push('/hr')} className="mt-4">Back to HR Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-muted-foreground">View and manage user information</p>
          </div>
          <Button onClick={() => router.push('/hr')}>Back to HR Dashboard</Button>
        </div>

        {/* User Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-secondary p-3 rounded-full">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{user.full_name}</span>
                  <Badge variant="outline">{user.department}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Department</span>
                <span className="text-sm font-medium">{user.department}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Staff Section */}
        <Card>
          <CardHeader>
            <CardTitle>Support Staff</CardTitle>
            <CardDescription>Manage support staff assignments for this user</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="supportStaffSelect">Assign Support Staff</Label>
                  <Select value={selectedSupportStaffId} onValueChange={setSelectedSupportStaffId}>
                    <SelectTrigger id="supportStaffSelect">
                      <SelectValue placeholder="Select support staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(u => u.id.toString() !== params.id) // Exclude the current user
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAssignSupportStaff}
                    disabled={!selectedSupportStaffId}
                  >
                    Assign
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Current Support Staff</h3>
                {supportStaffAssignments.length > 0 ? (
                  <div className="space-y-2">
                    {supportStaffAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="font-medium">{assignment.full_name}</p>
                          <p className="text-sm text-muted-foreground">{assignment.email}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUnassignSupportStaff(assignment.support_staff_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No support staff assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="wiki">Wiki Completions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>User's current profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <span className="text-sm font-medium text-foreground">{user?.full_name || 'User Name'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium text-foreground break-all">{user?.email || 'user@example.com'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="text-sm font-medium text-foreground">{user?.department || 'No Department'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Role</span>
                    <span className="text-sm font-medium text-foreground">{user?.department || 'No Role'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certifications - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
                <CardDescription>User's professional certifications</CardDescription>
              </CardHeader>
              <CardContent>
                {user?.certifications && user.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {user.certifications.map((cert: any) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cert.issuer}</p>
                          {cert.has_expiry && cert.expiry_date && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {/* Display verification URL if available */}
                          {cert.file_url && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(cert.file_url, '_blank')}
                                className="text-xs"
                              >
                                <Link className="h-3 w-3 mr-1" />
                                Verify Certificate
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant={cert.status === 'approved' ? 'default' : cert.status === 'rejected' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {cert.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {cert.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications added yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Account Status - Single Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Type</span>
                    <Badge variant="default">Active User</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="text-sm text-foreground">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Query Count</span>
                    <span className="text-sm text-foreground">{user?.query_count || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Recent clock in/out records for this user</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}
                          </TableCell>
                          <TableCell>
                            {record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}
                          </TableCell>
                          <TableCell>
                            {record.total_hours ? record.total_hours.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wiki" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wiki Completions</CardTitle>
                <CardDescription>Completed and pending wiki lessons by department</CardDescription>
              </CardHeader>
              <CardContent>
                {wikiCompletions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Group by department */}
                    {Array.from(new Set(wikiCompletions.map(w => w.department))).map(department => {
                      const departmentLessons = wikiCompletions.filter(w => w.department === department);
                      const completedCount = departmentLessons.filter(l => l.completed_at !== null).length;
                      const totalCount = departmentLessons.length;
                      
                      return (
                        <div key={department} className="border rounded-lg">
                          <div className="bg-secondary p-4 flex justify-between items-center">
                            <h3 className="font-semibold">{department}</h3>
                            <Badge variant="outline">
                              {completedCount}/{totalCount} completed
                            </Badge>
                          </div>
                          <div className="p-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Topic</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Completed At</TableHead>
                                  <TableHead>Comment</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {departmentLessons.map((completion) => (
                                  <TableRow key={completion.id}>
                                    <TableCell className="font-medium">{completion.topic}</TableCell>
                                    <TableCell>
                                      <Badge variant={completion.completed_at ? "default" : "secondary"}>
                                        {completion.completed_at ? "Completed" : "Pending"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {completion.completed_at 
                                        ? new Date(completion.completed_at).toLocaleDateString()
                                        : "-"}
                                    </TableCell>
                                    <TableCell>
                                      {completion.comment || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No wiki topics found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}