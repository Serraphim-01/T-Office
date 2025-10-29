'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

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

export default function HRUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (user && (user.department === 'Admin' || user.department === 'HR')) {
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
          <h1 className="text-3xl font-bold">User Management</h1>
          <div className="text-sm text-muted-foreground">{user.department}</div>
        </div>

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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{user.full_name}'s Details</DialogTitle>
                            <DialogDescription>View and edit user information</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Certifications</Label>
                                <Textarea
                                  defaultValue={JSON.stringify(user.certifications || [], null, 2)}
                                  onBlur={(e) => {
                                    try {
                                      const certs = JSON.parse(e.target.value);
                                      updateUserDetails(user.id, { certifications: certs });
                                    } catch (err) {
                                      alert('Invalid JSON format');
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Label>CV</Label>
                                <Textarea
                                  defaultValue={user.cv || ''}
                                  onBlur={(e) => updateUserDetails(user.id, { cv: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Portfolio</Label>
                                <Textarea
                                  defaultValue={user.portfolio || ''}
                                  onBlur={(e) => updateUserDetails(user.id, { portfolio: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Job Description</Label>
                                <Textarea
                                  defaultValue={user.job_description || ''}
                                  onBlur={(e) => updateUserDetails(user.id, { job_description: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Contract</Label>
                                <Textarea
                                  defaultValue={user.contract || ''}
                                  onBlur={(e) => updateUserDetails(user.id, { contract: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Other Details</Label>
                                <Textarea
                                  defaultValue={JSON.stringify(user.other_details || {}, null, 2)}
                                  onBlur={(e) => {
                                    try {
                                      const details = JSON.parse(e.target.value);
                                      updateUserDetails(user.id, { other_details: details });
                                    } catch (err) {
                                      alert('Invalid JSON format');
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
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
