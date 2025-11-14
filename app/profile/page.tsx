'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Building, FileText, Upload, Calendar, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
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

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    title: '',
    issuer: '',
    file_url: '',
    expiry_date: '',
    has_expiry: false
  });
  const [dragActive, setDragActive] = useState(false);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    // In a real app, you'd upload to a cloud storage service
    // For now, we'll create a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setNewCert(prev => ({ ...prev, file_url: e.target?.result as string }));
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
        setNewCert({ title: '', issuer: '', file_url: '', expiry_date: '', has_expiry: false });
      }
    } catch (error) {
      console.error('Failed to add certification:', error);
    }
  };

  const openCertification = (cert: Certification) => {
    if (cert.file_url) {
      window.open(cert.file_url, '_blank');
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your current profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
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
            {/* Role Management */}
            <Card>
              <CardHeader>
                <CardTitle>Role Information</CardTitle>
                <CardDescription>Your department and role details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <Badge variant="secondary">{profile?.department || 'No Department'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="outline">{profile?.department || 'No Role'}</Badge>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your role and department determine your access to different features in the system.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Certifications */}
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
                          {newCert.file_url && (
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
                            <Input
                              id="cert-expiry"
                              type="date"
                              value={newCert.expiry_date}
                              onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                            />
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
                        {cert.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCertification(cert)}
                            className="ml-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications added yet.</p>
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

        {/* Additional Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks Completed</span>
                  <span className="text-sm font-semibold text-foreground">127</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Projects</span>
                  <span className="text-sm font-semibold text-foreground">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Team Collaborations</span>
                  <span className="text-sm font-semibold text-foreground">24</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}