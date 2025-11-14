'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Users, UserPlus, MessageSquare, FileText, Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';

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

interface Induction {
  id: number;
  department: string;
  induction_time: string;
  attendees: string[];
  created_at: string;
}

interface Query {
  id: number;
  user_id: number;
  query_text: string;
  response?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function HRPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [inductions, setInductions] = useState<Induction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '', induction_eligible: true });
  const [newInduction, setNewInduction] = useState({ department: '', induction_time: '', attendees: [] as string[] });
  const [newQuery, setNewQuery] = useState({ user_id: '', query_text: '' });

  useEffect(() => {
    if (user && (user.department === 'Admin' || user.department === 'HR')) {
      fetchUsers();
      fetchInductions();
    }
  }, [user]);

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
      } else {
        console.error('Failed to fetch users - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchInductions = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/hr/inductions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInductions(data);
      } else {
        console.error('Failed to fetch inductions - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch inductions:', error);
    }
  };

  const createUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/hr/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          department: newUser.department,
          induction_eligible: newUser.induction_eligible
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`User created successfully! Default password: ${data.default_password}`);
        setNewUser({ name: '', email: '', department: '', induction_eligible: true });
        fetchUsers();
      } else {
        alert('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    }
    setLoading(false);
  };

  const createInduction = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/hr/inductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newInduction),
      });

      if (response.ok) {
        alert('Induction created successfully!');
        setNewInduction({ department: '', induction_time: '', attendees: [] });
        fetchInductions();
      } else {
        alert('Failed to create induction');
      }
    } catch (error) {
      console.error('Error creating induction:', error);
      alert('Error creating induction');
    }
    setLoading(false);
  };

  const sendQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/hr/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newQuery),
      });

      if (response.ok) {
        alert('Query sent successfully!');
        setNewQuery({ user_id: '', query_text: '' });
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        alert('Failed to send query');
      }
    } catch (error) {
      console.error('Error sending query:', error);
      alert('Error sending query');
    }
    setLoading(false);
  };

  const fetchUserQueries = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/queries/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueries(data);
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error);
    }
  };

  const updateUserDetails = async (userId: number, details: any) => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(details),
      });

      if (response.ok) {
        alert('User details updated successfully!');
        fetchUsers();
      } else {
        alert('Failed to update user details');
      }
    } catch (error) {
      console.error('Error updating user details:', error);
      alert('Error updating user details');
    }
  };

  if (!user || (user.department !== 'Admin' && user.department !== 'HR')) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">HR Management</h1>
          <Badge variant="secondary">{user.department}</Badge>
        </div>

        <Tabs defaultValue="onboarding" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create User */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Create New User
                  </CardTitle>
                  <CardDescription>Create a new user account with default password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={newUser.department} onValueChange={(value) => setNewUser({ ...newUser, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="induction-eligible"
                      checked={newUser.induction_eligible}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, induction_eligible: checked })}
                    />
                    <Label htmlFor="induction-eligible">Eligible for Induction</Label>
                  </div>
                  <Button onClick={createUser} disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </CardContent>
              </Card>

              {/* Create Induction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule Induction
                  </CardTitle>
                  <CardDescription>Schedule an induction session for a department</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="induction-dept">Department</Label>
                    <Select value={newInduction.department} onValueChange={(value) => setNewInduction({ ...newInduction, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="induction-date">Induction Date & Time</Label>
                    <Input
                      id="induction-date"
                      type="datetime-local"
                      value={newInduction.induction_time}
                      onChange={(e) => setNewInduction({ ...newInduction, induction_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attendees</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!newInduction.attendees.includes(value)) {
                          setNewInduction({
                            ...newInduction,
                            attendees: [...newInduction.attendees, value]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select attendees" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user => user.other_details?.induction_eligible !== false)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {newInduction.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newInduction.attendees.map((attendeeId) => {
                          const user = users.find(u => u.id.toString() === attendeeId);
                          return (
                            <Badge key={attendeeId} variant="secondary" className="flex items-center gap-1">
                              {user?.full_name || attendeeId}
                              <XCircle
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => setNewInduction({
                                  ...newInduction,
                                  attendees: newInduction.attendees.filter(id => id !== attendeeId)
                                })}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button onClick={createInduction} disabled={loading} className="w-full">
                    {loading ? 'Scheduling...' : 'Schedule Induction'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Inductions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Scheduled Inductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inductions.map((induction) => (
                      <TableRow key={induction.id}>
                        <TableCell>{induction.department}</TableCell>
                        <TableCell>{new Date(induction.induction_time).toLocaleString()}</TableCell>
                        <TableCell>{induction.attendees.length} users</TableCell>
                        <TableCell>{new Date(induction.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>View and manage all user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.department}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queries" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Send Query */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Send Query
                  </CardTitle>
                  <CardDescription>Send a query to a user</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="query-user">Select User</Label>
                    <Select value={newQuery.user_id} onValueChange={(value) => setNewQuery({ ...newQuery, user_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="query-text">Query Text</Label>
                    <Textarea
                      id="query-text"
                      value={newQuery.query_text}
                      onChange={(e) => setNewQuery({ ...newQuery, query_text: e.target.value })}
                      placeholder="Enter your query..."
                    />
                  </div>
                  <Button onClick={sendQuery} disabled={loading} className="w-full">
                    {loading ? 'Sending...' : 'Send Query'}
                  </Button>
                </CardContent>
              </Card>

              {/* Query History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Query History
                  </CardTitle>
                  <CardDescription>View queries for selected user</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Select User to View Queries</Label>
                    <Select onValueChange={(value) => {
                      const userId = parseInt(value);
                      setSelectedUser(users.find(u => u.id === userId) || null);
                      fetchUserQueries(userId);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedUser && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium">Queries for {selectedUser.full_name}</h4>
                      {queries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No queries found</p>
                      ) : (
                        queries.map((query) => (
                          <div key={query.id} className="border rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={query.status === 'pending' ? 'secondary' : 'default'}>
                                {query.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(query.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm"><strong>Query:</strong> {query.query_text}</p>
                            {query.response && (
                              <p className="text-sm"><strong>Response:</strong> {query.response}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
