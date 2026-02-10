'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, Eye, Link, User, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import { Input } from '@/components/ui/input';
import { apiGet, apiPut } from '@/lib/api';

interface CertificationApproval {
  id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  title: string;
  issuer: string;
  file_url?: string;
  file_data?: string;
  file_type?: string;
  expiry_date?: string;
  has_expiry: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
}

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

export default function ApprovalsPage() {
  // Remove the main AccessControlWrapper since we're handling access at the section level
  return <ApprovalsContent />;
}

function ApprovalsContent() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<CertificationApproval[]>([]);
  const [roleChanges, setRoleChanges] = useState<RoleChangeApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificationApproval | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<{[key: string]: string}>({});
  const [showRejectionInput, setShowRejectionInput] = useState<{[key: string]: boolean}>({});
  const [roleChangeRejectionReasons, setRoleChangeRejectionReasons] = useState<{[key: number]: string}>({});
  const [showRoleChangeRejectionInput, setShowRoleChangeRejectionInput] = useState<{[key: number]: boolean}>({});

  const fetchApprovals = async () => {
    try {
      // Fetch pending certifications
      const certResponse = await apiGet('/api/admin/approvals/certifications', localStorage.getItem('token') || '');
      // Fetch pending role change requests
      const roleChangeResponse = await apiGet('/api/role-changes/pending-requests', localStorage.getItem('token') || '');

      if (certResponse.ok) {
        const certData = await certResponse.json();
        setCertifications(certData);
      }
      
      if (roleChangeResponse.ok) {
        const roleChangeData = await roleChangeResponse.json();
        setRoleChanges(roleChangeData);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
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

  const handleCertificationApproval = async (certId: string, status: 'approved' | 'rejected') => {
    // Optimistic update - remove from UI immediately for approved, update status for rejected
    if (status === 'approved') {
      setCertifications(prev => prev.filter(cert => cert.id !== certId));
    } else {
      setCertifications(prev =>
        prev.map(cert =>
          cert.id === certId ? { ...cert, status } : cert
        )
      );
    }

    try {
      const requestBody: any = { status };
      
      // Include rejection reason if rejecting
      if (status === 'rejected' && rejectionReasons[certId]) {
        requestBody.rejection_reason = rejectionReasons[certId];
      }

      const response = await apiPut(`/api/admin/approvals/certifications/${certId}`, requestBody, localStorage.getItem('token') || '');

      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchApprovals(); // Refetch to restore the correct state
        console.error('Failed to update certification status');
      } else {
        // Clear rejection reason after successful rejection
        if (status === 'rejected') {
          setRejectionReasons(prev => {
            const newReasons = { ...prev };
            delete newReasons[certId];
            return newReasons;
          });
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      await fetchApprovals(); // Refetch to restore the correct state
      console.error('Failed to update certification:', error);
    }
  };

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

  const openCertification = (cert: CertificationApproval) => {
    console.log('Opening certification:', {
      id: cert.id,
      title: cert.title,
      hasFileData: !!cert.file_data,
      fileType: cert.file_type,
      hasFileUrl: !!cert.file_url,
      fileDataLength: cert.file_data?.length
    });

    setSelectedCert(cert);
    setIsImageModalOpen(true);
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

        {/* Certificate Approvals Section - Wrapped with access control */}
        <AccessControlWrapper pagePath="approvals/certificate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Certificate Approvals
              </CardTitle>
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
                      </div>
                      <div className="flex items-center space-x-2">
                        {(cert.file_data || cert.file_url) && (
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
                            <div className="flex flex-col space-y-2">
                              {showRejectionInput[cert.id] ? (
                                <div className="flex flex-col space-y-2">
                                  <Input
                                    placeholder="Reason for rejection"
                                    value={rejectionReasons[cert.id] || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectionReasons(prev => ({
                                      ...prev,
                                      [cert.id]: e.target.value
                                    }))}
                                  />
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCertificationApproval(cert.id, 'rejected')}
                                      disabled={!rejectionReasons[cert.id]}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Confirm Reject
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowRejectionInput(prev => ({
                                        ...prev,
                                        [cert.id]: false
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
                                  onClick={() => setShowRejectionInput(prev => ({
                                    ...prev,
                                    [cert.id]: true
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
                <p className="text-sm text-muted-foreground">No certificate approvals pending.</p>
              )}
            </CardContent>
          </Card>
        </AccessControlWrapper>

        {/* Role Change Approvals Section - Wrapped with access control */}
        <AccessControlWrapper pagePath="approvals/role-change">
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
        </AccessControlWrapper>

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedCert?.title}</DialogTitle>
              <DialogDescription>
                Certificate submitted by {selectedCert?.user_name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              {selectedCert?.file_data && selectedCert?.file_type ? (
                <img
                  src={`data:${selectedCert.file_type};base64,${selectedCert.file_data}`}
                  alt={selectedCert.title}
                  className="max-w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    e.currentTarget.style.display = 'none';
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Failed to load image';
                    errorMsg.className = 'text-red-500 text-center';
                    e.currentTarget.parentNode?.appendChild(errorMsg);
                  }}
                />
              ) : selectedCert?.file_url ? (
                <img
                  src={selectedCert.file_url}
                  alt={selectedCert.title}
                  className="max-w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    console.error('Image failed to load from URL:', e);
                    e.currentTarget.style.display = 'none';
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Failed to load image from URL';
                    errorMsg.className = 'text-red-500 text-center';
                    e.currentTarget.parentNode?.appendChild(errorMsg);
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No image available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}