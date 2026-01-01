'use client';

import { useState, useEffect, useRef } from 'react';

export const dynamic = 'force-dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Mail, Building, FileText, Calendar, Clock, CheckCircle, AlertCircle, Link, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import io from 'socket.io-client';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  certifications: any[];
  cv: string | null;
  portfolio: string | null;
  job_description: string | null;
  contract: string | null;
  query_count: number;
  attendance: any[];
  other_details: any;
  active: boolean;
  role_name?: string;
}

interface AttendanceRecord {
  id: number;
  user_id: number;
  location_event_id: number;
  event_type: string;
  timestamp: string;
  notes: string | null;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
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
  const searchParams = useSearchParams(); // Add this to read URL parameters
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [wikiCompletions, setWikiCompletions] = useState<WikiCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [supportStaffAssignments, setSupportStaffAssignments] = useState<any[]>([]);
  
  const { toast } = useToast();
  const socketRef = useRef<any>(null);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      // Validate the tab parameter to prevent invalid values
      if (['profile', 'attendance', 'wiki'].includes(tabParam)) {
        setActiveSection(tabParam);
      }
    }
  }, [searchParams]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (currentUser) {
      // Initialize socket connection
      socketRef.current = io('http://localhost:4000');
      
      // Listen for attendance updates
      socketRef.current.on('attendance_updated', (data: { userId: number, record: any, type: string }) => {
        // Only update if this is for the current user being viewed
        if (data.userId === parseInt(params.id)) {
          setAttendance(prev => {
            // Transform the raw record into the format expected by the UI
            const newRecord: AttendanceRecord = {
              id: data.record.id,
              user_id: data.record.user_id,
              location_event_id: data.record.location_event_id,
              event_type: data.record.event_type,
              timestamp: data.record.timestamp,
              notes: data.record.notes,
              clock_in: data.record.event_type === 'clock_in' ? data.record.timestamp : null,
              clock_out: data.record.event_type === 'clock_out' ? data.record.timestamp : null,
              total_hours: null,
              status: 'present',
              created_at: data.record.timestamp,
              updated_at: data.record.timestamp
            };
            
            // Check if this is a clock-out record that should be paired with an existing clock-in
            if (data.record.event_type === 'clock_out') {
              // Find the most recent clock-in record that doesn't have a clock-out
              const updatedAttendance = [...prev];
              for (let i = 0; i < updatedAttendance.length; i++) {
                // Check if this is a clock-in record without clock-out
                if (updatedAttendance[i].event_type === 'clock_in' && !updatedAttendance[i].clock_out) {
                  // Update this record with the clock-out time
                  const clockInTime = new Date(updatedAttendance[i].timestamp);
                  const clockOutTime = new Date(data.record.timestamp);
                  const diffHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
                  
                  updatedAttendance[i] = {
                    ...updatedAttendance[i],
                    clock_out: data.record.timestamp,
                    total_hours: parseFloat(diffHours.toFixed(2)),
                    status: diffHours > 0 ? 'present' : 'absent',
                    updated_at: data.record.timestamp
                  };
                  return [...updatedAttendance]; // Return updated array
                }
              }
              // If no matching clock-in found, add as new record
              return [newRecord, ...prev];
            } else {
              // For clock-in, simply add to the beginning of the list
              return [newRecord, ...prev];
            }
          });
        }
      });
    }
    
    // Clean up socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser, params.id]);

  useEffect(() => {
    if (currentUser && params.id) {
      fetchUserDetails();
      fetchUserAttendance();
      fetchUserWikiCompletions();
      fetchSupportStaffAssignments(params.id);
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
      }
    } catch (error) {
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
      }
    } catch (error) {
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
      }
    } catch (error) {
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
          <Button onClick={() => router.back()}>Back</Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Collapsible Side Navigation - Styled like main sidenav */}
          <div className={cn(
            "flex-shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-12" : "w-full lg:w-64"
          )}>
            <Card className="h-full">
              <CardContent className="p-2">
                <div className="flex items-center justify-between p-2 border-b">
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">Navigation</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      sidebarCollapsed ? "rotate-180" : ""
                    )} />
                  </Button>
                </div>
                <nav className="space-y-1 mt-2">
                  <button
                    onClick={() => setActiveSection('profile')}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                      activeSection === 'profile'
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <User className={cn(
                      "h-5 w-5 transition-all duration-300",
                      sidebarCollapsed ? "mx-auto" : ""
                    )} />
                    {!sidebarCollapsed && <span>Profile</span>}
                  </button>
                  <button
                    onClick={() => setActiveSection('attendance')}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                      activeSection === 'attendance'
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Clock className={cn(
                      "h-5 w-5 transition-all duration-300",
                      sidebarCollapsed ? "mx-auto" : ""
                    )} />
                    {!sidebarCollapsed && <span>Attendance</span>}
                  </button>
                  <button
                    onClick={() => setActiveSection('wiki')}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors",
                      activeSection === 'wiki'
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <FileText className={cn(
                      "h-5 w-5 transition-all duration-300",
                      sidebarCollapsed ? "mx-auto" : ""
                    )} />
                    {!sidebarCollapsed && <span>Wiki Completions</span>}
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeSection === 'profile' && (
              <div className="space-y-6">
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
                        <span className="text-sm font-medium text-foreground">{user?.role_name || user?.department || 'No Role'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Support Staff Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Support Staff</CardTitle>
                    <CardDescription>Support staff assigned to this user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {supportStaffAssignments.length > 0 ? (
                      <div className="space-y-2">
                        {supportStaffAssignments.map((assignment) => (
                          <div key={assignment.id} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium">{assignment.full_name}</p>
                              <p className="text-sm text-muted-foreground">{assignment.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No support staff assigned</p>
                    )}
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
                        <Badge variant={user?.active ? "default" : "destructive"}>
                          {user?.active ? "Active User" : "Offboarded"}
                        </Badge>
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
              </div>
            )}

            {activeSection === 'attendance' && (
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
                              {record.total_hours != null ? Number(record.total_hours).toFixed(2) : '-'}
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
            )}

            {activeSection === 'wiki' && (
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
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}