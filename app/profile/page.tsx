'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Building, FileText, Upload, Calendar, CheckCircle, AlertCircle, Eye, Download, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';

interface Certification {
  id: string;
  title: string;
  issuer: string;
  file_url?: string;
  file_data?: string;
  file_type?: string;
  expiry_date?: string;
  has_expiry: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
}

interface Profile {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  certifications: Certification[];
  cv?: string;
  portfolio?: string;
  job_description?: string;
  contract?: string;
  query_count: number;
  attendance: any[];
  other_details: any;
}

interface UserQuery {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assigned_to?: number;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

interface ProfileWithQueries extends Profile {
  queries: UserQuery[];
  max_queries_before_action: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileWithQueries | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    title: '',
    issuer: '',
    file_data: '',
    file_name: '',
    file_type: '',
    expiry_date: '',
    has_expiry: false
  });
  const [dragActive, setDragActive] = useState(false);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();

    // Add event listener for window focus to refetch profile
    const handleFocus = () => {
      fetchProfile();
    };

    window.addEventListener('focus', handleFocus);

    // Add polling for real-time updates every 10 seconds
    const interval = setInterval(() => {
      fetchProfile();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const fetchProfile = async () => {
    try {
      // Fetch profile data
      const profileResponse = await fetch('http://localhost:4000/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Fetch queries data
      const queriesResponse = await fetch('http://localhost:4000/api/profile/queries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (profileResponse.ok && queriesResponse.ok) {
        const profileData = await profileResponse.json();
        const queriesData = await queriesResponse.json();
        
        // Combine the data
        setProfile({
          ...profileData,
          queries: queriesData.queries,
          max_queries_before_action: queriesData.max_queries_before_action
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    // In a real app, you'd upload to a cloud storage service
    // For now, we'll create a data URL and extract base64 data
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 data and MIME type from data URL
      const [mimePart, base64Data] = dataUrl.split(',');
      const mimeType = mimePart.split(':')[1].split(';')[0];

      setNewCert(prev => ({
        ...prev,
        file_data: base64Data,
        file_name: file.name,
        file_type: mimeType
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const addCertification = async () => {
    if (!newCert.title || !newCert.issuer) return;

    try {
      const response = await fetch('http://localhost:4000/api/profile/certifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCert)
      });

      if (response.ok) {
        const addedCert = await response.json();
        setProfile(prev => prev ? {
          ...prev,
          certifications: [...prev.certifications, addedCert]
        } : null);
        setIsAddCertModalOpen(false);
        setIsApprovalModalOpen(true);
        setNewCert({ title: '', issuer: '', file_data: '', file_name: '', file_type: '', expiry_date: '', has_expiry: false });
      }
    } catch (error) {
      console.error('Failed to add certification:', error);
    }
  };



  const openCertification = (cert: Certification) => {
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

  const handleDeleteCertification = async (certId: string) => {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      return;
    }

    // Optimistic update - remove from UI immediately
    setProfile(prev => prev ? {
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== certId)
    } : null);

    try {
      const response = await fetch(`http://localhost:4000/api/profile/certifications/${certId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        // Revert optimistic update on failure - need to refetch
        await fetchProfile();
        console.error('Failed to delete certification');
      }
    } catch (error) {
      // Revert optimistic update on error - need to refetch
      await fetchProfile();
      console.error('Failed to delete certification:', error);
    }
  };


  const departments = [
    'Engineering',
    'Marketing',
    'Operations',
    'Finance',
    'Customer Support',
    'Design',
    'Legal',
    'Executive'
  ];


  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information and preferences</p>
          </div>
        </div>


        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your current profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <span className="text-sm font-medium text-foreground">{profile?.full_name || 'User Name'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium text-foreground break-all">{profile?.email || 'user@example.com'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="text-sm font-medium text-foreground">{profile?.department || 'No Department'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Role</span>
                    <span className="text-sm font-medium text-foreground">{profile?.department || 'No Role'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certifications - Full Width */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Certifications</CardTitle>
                  <CardDescription>Your professional certifications</CardDescription>
                </div>
                <Dialog open={isAddCertModalOpen} onOpenChange={setIsAddCertModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">Add</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Certification</DialogTitle>
                      <DialogDescription>
                        Enter the details of your certification. It will be sent for approval.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cert-title">Title</Label>
                        <Input
                          id="cert-title"
                          placeholder="e.g., AWS Certified Solutions Architect"
                          value={newCert.title}
                          onChange={(e) => setNewCert({ ...newCert, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cert-issuer">Issuing Organization</Label>
                        <Input
                          id="cert-issuer"
                          placeholder="e.g., Amazon Web Services"
                          value={newCert.issuer}
                          onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                        />
                      </div>

                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label>Certificate File</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Drag & drop your certificate file here, or click to browse
                          </p>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileInput}
                            className="hidden"
                            id="file-upload"
                          />
                          <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                            Choose File
                          </Label>
                          {newCert.file_data && (
                            <p className="text-xs text-green-600 mt-2">File uploaded successfully</p>
                          )}
                        </div>
                      </div>

                      {/* Expiry Section */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-expiry"
                            checked={newCert.has_expiry}
                            onCheckedChange={(checked) => setNewCert({ ...newCert, has_expiry: checked as boolean })}
                          />
                          <Label htmlFor="has-expiry" className="text-sm">This certificate has an expiry date</Label>
                        </div>
                        {newCert.has_expiry && (
                          <div className="space-y-2">
                            <Label htmlFor="cert-expiry">Expiry Date</Label>
                            <div className="relative">
                              <Input
                                id="cert-expiry"
                                type="date"
                                value={newCert.expiry_date}
                                onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                                className="pr-10"
                              />
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={addCertification}
                      disabled={!newCert.title || !newCert.issuer}
                      className="w-full"
                    >
                      Submit for Approval
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {profile?.certifications && profile.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cert.issuer}</p>
                          {cert.has_expiry && cert.expiry_date && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant={cert.status === 'approved' ? 'default' : cert.status === 'rejected' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {cert.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {cert.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {(cert.file_data || cert.file_url) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCertification(cert)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCertification(cert.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications added yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Account Status - Single Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Account Type</span>
                    <Badge variant="default">Active User</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Login</span>
                    <span className="text-sm text-foreground">Today, 9:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="text-sm text-foreground">January 2024</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Queries Section */}
            <Card>
              <CardHeader>
                <CardTitle>HR Queries</CardTitle>
                <CardDescription>Recent queries from HR</CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.queries && profile.queries.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Queries Received</p>
                        <p className="text-xs text-muted-foreground">Total: {profile.query_count || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {profile.max_queries_before_action - (profile.query_count || 0)} more before action
                        </p>
                        <p className="text-xs text-muted-foreground">Threshold: {profile.max_queries_before_action}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {profile.queries.slice(0, 3).map((query) => (
                        <div key={query.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{query.subject}</h4>
                            <Badge 
                              variant={query.status === 'open' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {query.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{query.description}</p>
                          {query.resolution && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-medium">HR Response:</p>
                              <p className="text-xs text-muted-foreground">{query.resolution}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(query.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No queries received yet</p>
                    <p className="text-xs text-muted-foreground mt-1">You have {profile?.max_queries_before_action || 3} queries remaining before official action is taken</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approval Request Sent</DialogTitle>
                  <DialogDescription>
                    Your certification has been submitted for approval. You will be notified once it's reviewed.
                  </DialogDescription>
                </DialogHeader>
                <Button onClick={() => setIsApprovalModalOpen(false)}>Close</Button>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedCert?.title}</DialogTitle>
              <DialogDescription>
                Issued by {selectedCert?.issuer}
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
