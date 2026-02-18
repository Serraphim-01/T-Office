'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, User, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import { Input } from '@/components/ui/input';
import { apiGet, apiPut } from '@/lib/api';

interface RoleChangeApproval {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  current_role_name: string;
  requested_role_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: number;
  approved_by_name?: string;
  rejection_reason?: string;
}

export default function RoleChangeApprovalsPage() {
  return (
    <AccessControlWrapper pagePath="approvals/role-change">
      <RoleChangeApprovalsContent />
    </AccessControlWrapper>
  );
}

function RoleChangeApprovalsContent() {
  const { user } = useAuth();
  const [roleChanges, setRoleChanges] = useState<RoleChangeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleChangeRejectionReasons, setRoleChangeRejectionReasons] = useState<{[key: number]: string}>({});
  const [showRoleChangeRejectionInput, setShowRoleChangeRejectionInput] = useState<{[key: number]: boolean}>({});

  const fetchApprovals = async () => {
    try {
      // Fetch pending role change requests
      const roleChangeResponse = await apiGet('/api/role-changes/pending-requests', localStorage.getItem('token') || '');

      if (roleChangeResponse.ok) {
        const roleChangeData = await roleChangeResponse.json();
        setRoleChanges(roleChangeData);
      }
    } catch (error) {
      console.error('Failed to fetch role change approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Add event listener for window focus to refetch approvals
    const handleFocus = () => {
      fetchApprovals();
    };

    window.addEventListener('focus', handleFocus);

    // Add polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchApprovals();
    }, 5000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleRoleChangeApproval = async (requestId: number, status: 'approved' | 'rejected') => {
    // Optimistic update - remove from UI immediately for approved, update status for rejected
    if (status === 'approved') {
      setRoleChanges(prev => prev.filter(request => request.id !== requestId));
    } else {
      setRoleChanges(prev =>
        prev.map(request =>
          request.id === requestId ? { ...request, status } : request
        )
      );
    }

    try {
      const requestBody: any = { status };
      
      // Include rejection reason if rejecting
      if (status === 'rejected' && roleChangeRejectionReasons[requestId]) {
        requestBody.rejection_reason = roleChangeRejectionReasons[requestId];
      }

      const response = await apiPut(`/api/role-changes/requests/${requestId}`, requestBody, localStorage.getItem('token') || '');

      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchApprovals(); // Refetch to restore the correct state
        console.error('Failed to update role change request status');
      } else {
        // Clear rejection reason after successful rejection
        if (status === 'rejected') {
          setRoleChangeRejectionReasons(prev => {
            const newReasons = { ...prev };
            delete newReasons[requestId];
            return newReasons;
          });
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      await fetchApprovals(); // Refetch to restore the correct state
      console.error('Failed to update role change request:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Role Change Approvals</h1>
            <p className="text-muted-foreground mt-1">Review and approve pending role change requests</p>
          </div>
        </div>

        {/* Role Change Approvals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Role Change Approvals
            </CardTitle>
            <CardDescription>Review and approve user role change requests</CardDescription>
          </CardHeader>
          <CardContent>
            {roleChanges.length > 0 ? (
              <div className="space-y-4">
                {roleChanges.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.user_name}</span>
                        <Badge
                          variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}
                        >
                          {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Current Role: {request.current_role_name}</p>
                      <p className="text-sm text-muted-foreground mb-1">Requested Role: {request.requested_role_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested: {new Date(request.requested_at).toLocaleString()}
                      </p>
                      {request.expires_at && (
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(request.expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRoleChangeApproval(request.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <div className="flex flex-col space-y-2">
                            {showRoleChangeRejectionInput[request.id] ? (
                              <div className="flex flex-col space-y-2">
                                <Input
                                  placeholder="Reason for rejection"
                                  value={roleChangeRejectionReasons[request.id] || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoleChangeRejectionReasons(prev => ({
                                    ...prev,
                                    [request.id]: e.target.value
                                  }))}
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRoleChangeApproval(request.id, 'rejected')}
                                    disabled={!roleChangeRejectionReasons[request.id]}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Confirm Reject
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRoleChangeRejectionInput(prev => ({
                                      ...prev,
                                      [request.id]: false
                                    }))}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowRoleChangeRejectionInput(prev => ({
                                  ...prev,
                                  [request.id]: true
                                }))}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No role change approvals pending.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}