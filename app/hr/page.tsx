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
import { Calendar, UserPlus, Users, FileText, MessageSquare, Clock, Plus, XCircle, Trash2, X } from 'lucide-react';
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

interface DepartmentInduction {
  department: string;
  induction_time: string;
  attendees: string[];
}

interface Query {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  resolution?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function HRDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [inductions, setInductions] = useState<Induction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedInduction, setSelectedInduction] = useState<Induction | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '', induction_eligible: true });
  const [newInductions, setNewInductions] = useState<DepartmentInduction[]>([{ department: '', induction_time: '', attendees: [] }]);
  const [newQuery, setNewQuery] = useState({ user_id: '', subject: '', description: '' });

  useEffect(() => {
    if (user) {
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

  const addDepartmentInduction = () => {
    setNewInductions([...newInductions, { department: '', induction_time: '', attendees: [] }]);
  };

  const removeDepartmentInduction = (index: number) => {
    if (newInductions.length > 1) {
      const updated = [...newInductions];
      updated.splice(index, 1);
      setNewInductions(updated);
    }
  };

  const updateDepartmentInduction = (index: number, field: keyof DepartmentInduction, value: string | string[]) => {
    const updated = [...newInductions];
    updated[index] = { ...updated[index], [field]: value };
    setNewInductions(updated);
  };

  const addAttendeeToInduction = (index: number, attendeeId: string) => {
    const updated = [...newInductions];
    if (!updated[index].attendees.includes(attendeeId)) {
      updated[index].attendees = [...updated[index].attendees, attendeeId];
      setNewInductions(updated);
    }
  };

  const removeAttendeeFromInduction = (index: number, attendeeId: string) => {
    const updated = [...newInductions];
    updated[index].attendees = updated[index].attendees.filter(id => id !== attendeeId);
    setNewInductions(updated);
  };

  const createInductions = async () => {
    setLoading(true);
    try {
      // Create each induction separately
      const promises = newInductions
        .filter(induction => induction.department && induction.induction_time)
        .map(induction => 
          fetch('http://localhost:4000/api/hr/inductions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(induction),
          })
        );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        alert('All inductions created successfully!');
        setNewInductions([{ department: '', induction_time: '', attendees: [] }]);
        fetchInductions();
      } else {
        alert('Failed to create some inductions');
      }
    } catch (error) {
      console.error('Error creating inductions:', error);
      alert('Error creating inductions');
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
        setNewQuery({ user_id: '', subject: '', description: '' });
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

  const updateQueryResolution = async (queryId: number, resolution: string, status: string) => {
    try {
      const updateResponse = await fetch(`http://localhost:4000/api/hr/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ resolution, status }),
      });

      if (updateResponse.ok) {
        alert('Query resolution updated successfully!');
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        alert('Failed to update query resolution');
      }
    } catch (error) {
      console.error('Error updating query resolution:', error);
      alert('Error updating query resolution');
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

  const deleteInduction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this induction?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/hr/inductions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        alert('Induction deleted successfully!');
        fetchInductions(); // Refresh the list
      } else {
        alert('Failed to delete induction');
      }
    } catch (error) {
      console.error('Error deleting induction:', error);
      alert('Error deleting induction');
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Please Log In</h1>
          <p>You need to be logged in to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">HR Dashboard</h1>
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
                  <Button onClick={createUser} disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </CardContent>
              </Card>

              {/* Create Inductions for Multiple Departments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule Inductions
                  </CardTitle>
                  <CardDescription>Schedule induction sessions for multiple departments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newInductions.map((induction, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Department {index + 1}</h3>
                        {newInductions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDepartmentInduction(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`department-${index}`}>Department</Label>
                        <Select 
                          value={induction.department} 
                          onValueChange={(value) => updateDepartmentInduction(index, 'department', value)}
                        >
                          <SelectTrigger id={`department-${index}`}>
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
                        <Label htmlFor={`induction-date-${index}`}>Induction Date & Time</Label>
                        <Input
                          id={`induction-date-${index}`}
                          type="datetime-local"
                          value={induction.induction_time}
                          onChange={(e) => updateDepartmentInduction(index, 'induction_time', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Attendees</Label>
                        <Select
                          value=""
                          onValueChange={(value) => addAttendeeToInduction(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select attendees" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.full_name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {induction.attendees && induction.attendees.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {induction.attendees.map((attendeeId) => {
                              const user = users.find(u => u.id.toString() === attendeeId);
                              return (
                                <div key={attendeeId} className="flex items-center gap-2 bg-secondary px-2 py-1 rounded">
                                  <span className="text-sm">{user?.full_name || attendeeId}</span>
                                  <button
                                    onClick={() => removeAttendeeFromInduction(index, attendeeId)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" onClick={addDepartmentInduction} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Department
                  </Button>
                  
                  <Button onClick={createInductions} disabled={loading} className="w-full">
                    {loading ? 'Scheduling...' : 'Schedule All Inductions'}
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inductions.map((induction) => (
                      <TableRow key={induction.id}>
                        <TableCell>{induction.department}</TableCell>
                        <TableCell>{new Date(induction.induction_time).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-left"
                            onClick={() => {
                              setSelectedInduction(induction);
                              setShowAttendeesModal(true);
                            }}
                          >
                            {(induction.attendees || []).length} users
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInduction(induction.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
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
                      <TableHead>Query Count</TableHead>
                      <TableHead>Actions</TableHead>
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
                        <TableCell>{user.query_count || 0}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push(`/hr/users/${user.id}`)}
                          >
                            View Details
                          </Button>
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
                    <Label htmlFor="query-subject">Query Subject</Label>
                    <Input
                      id="query-subject"
                      value={newQuery.subject}
                      onChange={(e) => setNewQuery({ ...newQuery, subject: e.target.value })}
                      placeholder="Enter query subject..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="query-description">Query Description</Label>
                    <Textarea
                      id="query-description"
                      value={newQuery.description}
                      onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                      placeholder="Enter query description..."
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
                            <p className="text-sm"><strong>Subject:</strong> {query.subject}</p>
                            <p className="text-sm"><strong>Description:</strong> {query.description}</p>
                            {query.resolution && (
                              <p className="text-sm"><strong>Resolution:</strong> {query.resolution}</p>
                            )}
                            {query.status === 'pending' && (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Enter response..."
                                  onBlur={(e) => {
                                    if (e.target.value.trim()) {
                                      updateQueryResolution(query.id, e.target.value.trim(), 'responded');
                                    }
                                  }}
                                />
                              </div>
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
      
      {/* Attendees Modal */}
      <Dialog open={showAttendeesModal} onOpenChange={setShowAttendeesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Induction Attendees</DialogTitle>
            <DialogDescription>
              {selectedInduction?.department} induction on {selectedInduction?.induction_time ? new Date(selectedInduction.induction_time).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedInduction?.attendees && selectedInduction.attendees.length > 0 ? (
              <ul className="space-y-2">
                {selectedInduction.attendees.map((attendeeId) => {
                  const user = users.find(u => u.id.toString() === attendeeId);
                  return (
                    <li key={attendeeId} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <div>
                        <p className="font-medium">{user?.full_name || 'Unknown User'}</p>
                        <p className="text-sm text-muted-foreground">{user?.email || `ID: ${attendeeId}`}</p>
                      </div>
                      <Badge variant="outline">{user?.department || 'Unknown Dept'}</Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No attendees assigned</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}