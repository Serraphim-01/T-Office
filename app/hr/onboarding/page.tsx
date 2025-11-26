'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Users, UserPlus, FileText, Clock, CheckCircle, Plus, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchDepartments } from '@/lib/departments';
import { useToast } from '@/hooks/use-toast';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

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

interface DepartmentInduction {
  department: string;
  induction_time: string;
  attendees: string[];
}

export default function HROnboardingPage() {
  return (
    <AccessControlWrapper pagePath="hr/onboarding">
      <HROnboardingContent />
    </AccessControlWrapper>
  );
}

function HROnboardingContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [inductions, setInductions] = useState<Induction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedInduction, setSelectedInduction] = useState<Induction | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [canCreateUser, setCanCreateUser] = useState(false);
  const [canScheduleInductions, setCanScheduleInductions] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState<{ name: string; email: string; department: string }>({ name: '', email: '', department: '' });
  const [newInductions, setNewInductions] = useState<DepartmentInduction[]>([{ department: '', induction_time: '', attendees: [] }]);

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to HR onboarding page
    const onboardingAccess = await hasPageAccess(user, 'hr/onboarding');
    
    if (!onboardingAccess) {
      // If no access to HR onboarding page, disable all features
      setCanCreateUser(false);
      setCanScheduleInductions(false);
      return;
    }
    
    // Check access to specific HR onboarding features
    const createUserAccess = await hasPageAccess(user, 'hr/onboarding/create-user');
    const scheduleInductionsAccess = await hasPageAccess(user, 'hr/onboarding/schedule-inductions');
    
    setCanCreateUser(createUserAccess);
    setCanScheduleInductions(scheduleInductionsAccess);
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchInductions();
      loadDepartments();
    }
  }, [user]);

  const loadDepartments = async () => {
    try {
      const deptList = await fetchDepartments();
      setDepartments(deptList);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
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
        toast({
          title: "Success",
          description: `User created successfully! Default password: ${data.default_password}`,
        });
        setNewUser({ name: '', email: '', department: '' });
        fetchUsers();
      } else {
        toast({
          title: "Error",
          description: "Failed to create user",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Error creating user",
        variant: "destructive",
      });
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
        toast({
          title: "Success",
          description: "All inductions created successfully!",
        });
        setNewInductions([{ department: '', induction_time: '', attendees: [] }]);
        fetchInductions();
      } else {
        toast({
          title: "Error",
          description: "Failed to create some inductions",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating inductions:', error);
      toast({
        title: "Error",
        description: "Error creating inductions",
        variant: "destructive",
      });
    }
    setLoading(false);
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
        toast({
          title: "Success",
          description: "Induction deleted successfully!",
        });
        fetchInductions(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to delete induction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting induction:', error);
      toast({
        title: "Error",
        description: "Error deleting induction",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold">HR Onboarding</h1>
          <div className="text-sm text-muted-foreground">{user?.department}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create User - Only show if user has create user access */}
          {canCreateUser && (
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
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={createUser} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create Inductions for Multiple Departments - Only show if user has schedule inductions access */}
          {canScheduleInductions && (
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
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
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
          )}
        </div>

        {/* Inductions List - Always show if user has access to onboarding page */}
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