'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Users, UserPlus, FileText, Clock, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  other_details?: any;
}

interface Induction {
  id: number;
  department: string;
  induction_time: string;
  attendees: string[];
  created_at: string;
}

export default function HROnboardingPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [inductions, setInductions] = useState<Induction[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState<{ name: string; email: string; department: string }>({ name: '', email: '', department: '' });
  const [newInduction, setNewInduction] = useState({ department: '', induction_time: '', attendees: [] as string[] });

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
          department: newUser.department
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`User created successfully! Default password: ${data.default_password}`);
        setNewUser({ name: '', email: '', department: '' });
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
          <h1 className="text-3xl font-bold">HR Onboarding</h1>
          <div className="text-sm text-muted-foreground">{user.department}</div>
        </div>

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
                        <div key={attendeeId} className="flex items-center gap-2 bg-secondary px-2 py-1 rounded">
                          <span className="text-sm">{user?.full_name || attendeeId}</span>
                          <button
                            onClick={() => setNewInduction({
                              ...newInduction,
                              attendees: newInduction.attendees.filter(id => id !== attendeeId)
                            })}
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
      </div>
    </DashboardLayout>
  );
}
