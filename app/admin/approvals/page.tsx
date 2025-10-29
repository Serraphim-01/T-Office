'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, FileText, User, Eye, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface CertificationApproval {
  id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  title: string;
  issuer: string;
  file_url?: string;
  expiry_date?: string;
  has_expiry: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface RoleChangeRequest {
  id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  current_role: string;
  requested_role: string;
  department: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<CertificationApproval[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      // Fetch pending certifications
      const certResponse = await fetch('http://localhost:4000/api/admin/approvals/certifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (certResponse.ok) {
        const certData = await certResponse.json();
        setCertifications(certData);
      }

      // Fetch pending role change requests
      const roleResponse = await fetch('http://localhost:4000/api/admin/approvals/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setRoleRequests(roleData);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCertificationApproval = async (certId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`http://localhost:4000/api/admin/approvals/certifications/${certId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update local state
        setCertifications(prev =>
          prev.map(cert =>
            cert.id === certId ? { ...cert, status } : cert
          )
        );
      }
    } catch (error) {
      console.error('Failed to update certification:', error);
    }
  };

  const handleRoleApproval = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`http://localhost:4000/api/admin/approvals/roles/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update local state
        setRoleRequests(prev =>
          prev.map(request =>
            request.id === requestId ? { ...request, status } : request
          )
        );
      }
    } catch (error) {
      console.error('Failed to update role request:', error);
    }
  };

  const openCertification = (cert: CertificationApproval) => {
    if (cert.file_url) {
      window.open(cert.file_url, '_blank');
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
            <h1 className="text-3xl font-bold text-foreground">Approvals Dashboard</h1>
            <p className="text-muted-foreground mt-1">Review and approve pending requests</p>
          </div>
        </div>

        <Tabs defaultValue="certifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="certifications" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Certificate Approvals</span>
              {certifications.filter(c => c.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {certifications.filter(c => c.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Role Change Requests</span>
              {roleRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {roleRequests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="certifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Approvals</CardTitle>
                <CardDescription>Review and approve user certification submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {certifications.length > 0 ? (
                  <div className="space-y-4">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{cert.title}</span>
                            <Badge
                              variant={cert.status === 'approved' ? 'default' : cert.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {cert.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {cert.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {cert.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">Issuer: {cert.issuer}</p>
                          <p className="text-sm text-muted-foreground mb-1">Submitted by: {cert.user_name} ({cert.user_email})</p>
                          {cert.has_expiry && cert.expiry_date && (
                            <p className="text-sm text-muted-foreground">
                              Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {cert.file_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCertification(cert)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {cert.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCertificationApproval(cert.id, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCertificationApproval(cert.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certificate approvals pending.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Change Requests</CardTitle>
                <CardDescription>Review and approve role change requests from users</CardDescription>
              </CardHeader>
              <CardContent>
                {roleRequests.length > 0 ? (
                  <div className="space-y-4">
                    {roleRequests.map((request) => (
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
                          <p className="text-sm text-muted-foreground mb-1">Email: {request.user_email}</p>
                          <p className="text-sm text-muted-foreground mb-1">Department: {request.department}</p>
                          <p className="text-sm text-muted-foreground">
                            Request: {request.current_role} → {request.requested_role}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Reason: {request.reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleRoleApproval(request.id, 'approved')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRoleApproval(request.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No role change requests pending.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
