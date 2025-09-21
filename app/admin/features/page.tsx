'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const departments = [
  'Admin',
  'HR',
  'Sales',
  'Tech',
  'Audit',
  'Procurement',
  'Compliance',
];

const features = [
  'Attendance',
  'AttendanceDetails',
  'HR',
  'HREmployees',
  'HRAttendance',
  'HRReports',
  'Audit',
  'AuditPlanning',
  'AuditRiskAssessment',
  'Sales',
  'SalesContacts',
  'SalesPipeline',
  'SalesAutomation',
  'SalesDocuments',
  'SalesGoals',
  'Tech',
  'TechLicensing',
  'TechAccounts',
  'TechOemPartners',
  'TechDeals',
  'Report',
  'Onboarding',
];

export default function FeaturesPage() {
  const { profile } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && profile.department !== 'Admin') {
      // Redirect or show error for non-admins
    }
  }, [profile]);

  useEffect(() => {
    if (selectedDepartment) {
      setLoading(true);
      const fetchFeatureFlags = async () => {
        const { data, error } = await supabase
          .from('department_features')
          .select('feature, is_enabled')
          .eq('department', selectedDepartment);

        if (error) {
          console.error('Error fetching feature flags:', error);
        } else {
          const flags = data.reduce((acc, { feature, is_enabled }) => {
            acc[feature] = is_enabled;
            return acc;
          }, {});
          setFeatureFlags(flags);
        }
        setLoading(false);
      };
      fetchFeatureFlags();
    }
  }, [selectedDepartment]);

  const handleToggle = async (feature: string, is_enabled: boolean) => {
    setFeatureFlags({ ...featureFlags, [feature]: is_enabled });

    const { error } = await supabase
      .from('department_features')
      .upsert({ department: selectedDepartment, feature, is_enabled }, { onConflict: 'department, feature' });

    if (error) {
      console.error('Error updating feature flag:', error);
      // Revert UI change on error
      setFeatureFlags({ ...featureFlags, [feature]: !is_enabled });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Management</CardTitle>
            <CardDescription>Enable or disable features for each department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Select Department</Label>
              <Select onValueChange={setSelectedDepartment} value={selectedDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDepartment && !loading && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Features for {selectedDepartment}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Switch
                        id={`${feature}-switch`}
                        checked={featureFlags[feature] || false}
                        onCheckedChange={(checked) => handleToggle(feature, checked)}
                      />
                      <Label htmlFor={`${feature}-switch`}>{feature}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {loading && <p>Loading features...</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
