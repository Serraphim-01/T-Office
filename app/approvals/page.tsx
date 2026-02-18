'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileText, User, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import { apiGet } from '@/lib/api';

interface CertificationSummary {
  count: number;
}

interface RoleChangeSummary {
  count: number;
}

export default function ApprovalsPage() {
  return (
    <AccessControlWrapper pagePath="approvals">
      <ApprovalsOverviewContent />
    </AccessControlWrapper>
  );
}

function ApprovalsOverviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [certificationCount, setCertificationCount] = useState(0);
  const [roleChangeCount, setRoleChangeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchApprovalCounts = async () => {
    try {
      // Fetch pending certifications count
      const certResponse = await apiGet('/api/admin/approvals/certifications', localStorage.getItem('token') || '');
      
      // Fetch pending role change requests count
      const roleChangeResponse = await apiGet('/api/role-changes/pending-requests', localStorage.getItem('token') || '');

      if (certResponse.ok) {
        const certData = await certResponse.json();
        setCertificationCount(certData.length);
      }
      
      if (roleChangeResponse.ok) {
        const roleChangeData = await roleChangeResponse.json();
        setRoleChangeCount(roleChangeData.length);
      }
    } catch (error) {
      console.error('Failed to fetch approval counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalCounts();

    // Add event listener for window focus to refetch counts
    const handleFocus = () => {
      fetchApprovalCounts();
    };

    window.addEventListener('focus', handleFocus);

    // Add polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchApprovalCounts();
    }, 5000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleNavigateToCertifications = () => {
    router.push('/approvals/certificate');
  };

  const handleNavigateToRoleChanges = () => {
    router.push('/approvals/role-change');
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approvals Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage pending approval requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Certificate Approvals Card */}
          <Card 
            className="hover:shadow-md cursor-pointer transition-shadow"
            onClick={handleNavigateToCertifications}
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Certificate Approvals
              </CardTitle>
              <CardDescription>Review and approve user certification submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{certificationCount}</span>
                <Badge variant={certificationCount > 0 ? 'default' : 'secondary'}>
                  {certificationCount > 0 ? 'Pending' : 'None'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Role Change Approvals Card */}
          <Card 
            className="hover:shadow-md cursor-pointer transition-shadow"
            onClick={handleNavigateToRoleChanges}
          >
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Role Change Approvals
              </CardTitle>
              <CardDescription>Review and approve user role change requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{roleChangeCount}</span>
                <Badge variant={roleChangeCount > 0 ? 'default' : 'secondary'}>
                  {roleChangeCount > 0 ? 'Pending' : 'None'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Click on a card to review and approve pending requests
        </div>
      </div>
    </DashboardLayout>
  );
}
