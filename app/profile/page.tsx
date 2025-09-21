'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Phone, Building, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '' });


  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
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
                  <span className="text-sm font-medium text-foreground break-all">{user?.email || 'No Email'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Department</span>
                  <span className="text-sm font-medium text-foreground">{profile?.department || 'No Department'}</span>
                </div>
              </div>
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Certification</DialogTitle>
                    <DialogDescription>
                      Enter the details of your certification. It will be sent for HR approval.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cert-name">Certification Name</Label>
                      <Input id="cert-name" value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cert-issuer">Issuing Organization</Label>
                      <Input id="cert-issuer" value={newCert.issuer} onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cert-date">Date Issued</Label>
                      <Input id="cert-date" type="date" value={newCert.date} onChange={(e) => setNewCert({ ...newCert, date: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={() => {
                    if (newCert.name && newCert.issuer && newCert.date) {
                      setCertifications([...certifications, { ...newCert, id: Date.now().toString() }]);
                      setIsAddCertModalOpen(false);
                      setIsApprovalModalOpen(true);
                      setNewCert({ name: '', issuer: '', date: '' });
                    }
                  }}>Submit for Approval</Button>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {certifications.length > 0 ? (
                <ul className="space-y-2">
                  {certifications.map((cert) => (
                    <li key={cert.id} className="text-sm text-muted-foreground">{cert.name} - {cert.issuer} ({cert.date})</li>
                  ))}
                </ul>
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
                  Your certification has been submitted to the HR department for approval.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => setIsApprovalModalOpen(false)}>Close</Button>
            </DialogContent>
          </Dialog>
        </div>

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