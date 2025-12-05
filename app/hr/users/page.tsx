'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  query_count?: number;
}

export default function HRUsersPage() {
  return (
    <AccessControlWrapper pagePath="hr/users">
      <HRUsersContent />
    </AccessControlWrapper>
  );
}

function HRUsersContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [canViewDetails, setCanViewDetails] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedSupportStaffId, setSelectedSupportStaffId] = useState<string>('');
  const [supportStaffAssignments, setSupportStaffAssignments] = useState<any[]>([]);
  const [supportedUsers, setSupportedUsers] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to HR users page
    const usersAccess = await hasPageAccess(user.id, 'hr/users');
    
    if (!usersAccess) {
      // If no access to HR users page, disable all features
      setCanViewDetails(false);
      return;
    }
    
    // Check access to specific HR users features
    const viewDetailsAccess = await hasPageAccess(user.id, 'hr/users/view-details');
    
    setCanViewDetails(viewDetailsAccess);
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
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

  const fetchSupportedUsers = async (supportStaffId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/users/${supportStaffId}/supported-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch supported users');
      
      const data = await response.json();
      setSupportedUsers(data);
    } catch (error) {
      console.error('Error fetching supported users:', error);
    }
  };

  const handleAssignSupportStaff = async () => {
    if (!selectedUserId || !selectedSupportStaffId) {
      toast({
        title: 'Error',
        description: 'Please select both a user and support staff',
        variant: 'destructive',
      });
      return;
    }

    // Prevent assigning a user as their own support staff
    if (selectedUserId === selectedSupportStaffId) {
      toast({
        title: 'Error',
        description: 'A user cannot be their own support staff',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/users/${selectedUserId}/assign-support`, {
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
      fetchSupportStaffAssignments(selectedUserId);
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
      const response = await fetch(`http://localhost:4000/api/users/${selectedUserId}/unassign-support/${supportStaffId}`, {
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
      fetchSupportStaffAssignments(selectedUserId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unassign support staff',
        variant: 'destructive',
      });
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      fetchSupportStaffAssignments(userId);
    } else {
      setSupportStaffAssignments([]);
    }
  };

  const handleSupportStaffSelect = (staffId: string) => {
    setSelectedSupportStaffId(staffId);
    if (staffId) {
      fetchSupportedUsers(staffId);
    } else {
      setSupportedUsers([]);
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
          <h1 className="text-3xl font-bold">HR Users</h1>
          <div className="text-sm text-muted-foreground">{user?.department}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users List Section */}
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
                        {/* Only show View Details button if user has view details access */}
                        {canViewDetails && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => router.push(`/hr/users/${user.id}`)}
                          >
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Support Staff Management Section */}
          <div className="space-y-6">
            {/* Assign Support Staff Section */}
            <Card>
              <CardHeader>
                <CardTitle>Assign Support Staff</CardTitle>
                <CardDescription>Assign support staff to users for offboarding scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="userSelect">Select User</Label>
                    <Select value={selectedUserId} onValueChange={handleUserSelect}>
                      <SelectTrigger id="userSelect">
                        <SelectValue placeholder="Select a user" />
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
                    <Label htmlFor="supportStaffSelect">Select Support Staff</Label>
                    <Select value={selectedSupportStaffId} onValueChange={handleSupportStaffSelect}>
                      <SelectTrigger id="supportStaffSelect">
                        <SelectValue placeholder="Select support staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user => user.id.toString() !== selectedUserId) // Exclude the selected user
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleAssignSupportStaff}
                    disabled={!selectedUserId || !selectedSupportStaffId}
                  >
                    Assign Support Staff
                  </Button>

                  {selectedUserId && (
                    <div className="mt-6">
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
                  )}
                </div>
              </CardContent>
            </Card>

            {/* View Supported Users Section */}
            <Card>
              <CardHeader>
                <CardTitle>Supported Users</CardTitle>
                <CardDescription>View users supported by a specific staff member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="viewSupportStaffSelect">Select Support Staff</Label>
                    <Select value={selectedSupportStaffId} onValueChange={handleSupportStaffSelect}>
                      <SelectTrigger id="viewSupportStaffSelect">
                        <SelectValue placeholder="Select support staff" />
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

                  {selectedSupportStaffId && (
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Users Supported</h3>
                      {supportedUsers.length > 0 ? (
                        <div className="space-y-2">
                          {supportedUsers.map((user) => (
                            <div key={user.id} className="p-2 border rounded">
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">This support staff is not supporting any users</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}