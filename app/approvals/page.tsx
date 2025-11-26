'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

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
  created_at: string;
}

export default function ApprovalsPage() {
  return (
    <AccessControlWrapper pagePath="approvals">
      <ApprovalsContent />
    </AccessControlWrapper>
  );
}

function ApprovalsContent() {
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<CertificationApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificationApproval | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
      const response = await fetch(`http://localhost:4000/api/admin/approvals/certifications/${certId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchApprovals(); // Refetch to restore the correct state
        console.error('Failed to update certification status');
      }
    } catch (error) {
      // Revert optimistic update on error
      await fetchApprovals(); // Refetch to restore the correct state
      console.error('Failed to update certification:', error);
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