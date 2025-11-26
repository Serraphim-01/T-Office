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

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to HR users page
    const usersAccess = await hasPageAccess(user, 'hr/users');
    
    if (!usersAccess) {
      // If no access to HR users page, disable all features
      setCanViewDetails(false);
      return;
    }
    
    // Check access to specific HR users features
    const viewDetailsAccess = await hasPageAccess(user, 'hr/users/view-details');
    
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
      </div>
    </DashboardLayout>
  );
}