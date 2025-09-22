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

const featuresHierarchy = [
  { name: 'Admin' },
  { name: 'Onboarding' },
  { name: 'Attendance', subFeatures: ['AttendanceDetails'] },
  { name: 'Report' },
  {
    name: 'HR',
    subFeatures: ['HREmployees', 'HRAttendance', 'HRReports'],
  },
  {
    name: 'Audit',
    subFeatures: ['AuditPlanning', 'AuditRiskAssessment'],
  },
  {
    name: 'Sales',
    subFeatures: [
      'SalesContacts',
      'SalesPipeline',
      'SalesAutomation',
      'SalesDocuments',
      'SalesGoals',
    ],
  },
  {
    name: 'Tech',
    subFeatures: ['TechLicensing', 'TechAccounts', 'TechOemPartners', 'TechDeals'],
  },
  { name: 'Compliance' },
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
      if (selectedDepartment === 'Admin') {
        const allFeatures = featuresHierarchy.reduce((acc: Record<string, boolean>, feature) => {
          acc[feature.name] = true;
          if (feature.subFeatures) {
            for (const subFeature of feature.subFeatures) {
              acc[subFeature] = true;
            }
          }
          return acc;
        }, {});
        setFeatureFlags(allFeatures);
      } else {
        setLoading(true);
        const fetchFeatureFlags = async () => {
          const { data, error } = await supabase
            .from('department_features')
            .select('feature, is_enabled')
            .eq('department', selectedDepartment);

          if (error) {
            console.error('Error fetching feature flags:', error);
          } else {
            const flags = data.reduce((acc: Record<string, boolean>, { feature, is_enabled }) => {
              acc[feature] = is_enabled;
              return acc;
            }, {});
            setFeatureFlags(flags);
          }
          setLoading(false);
        };
        fetchFeatureFlags();
      }
    }
  }, [selectedDepartment]);

  const handleToggle = (featureName: string, is_enabled: boolean) => {
    const updatedFlags = { ...featureFlags, [featureName]: is_enabled };
    const feature = featuresHierarchy.find(f => f.name === featureName);

    if (!is_enabled && feature?.subFeatures) {
      for (const subFeature of feature.subFeatures) {
        updatedFlags[subFeature] = false;
      }
    }

    setFeatureFlags(updatedFlags);
  };

  const handleSave = async () => {
    setLoading(true);
    const updates = Object.entries(featureFlags).map(([feature, is_enabled]) => ({
      department: selectedDepartment,
      feature,
      is_enabled,
    }));

    const { error } = await supabase
      .from('department_features')
      .upsert(updates, { onConflict: 'department, feature' });

    if (error) {
      console.error('Error saving feature flags:', error);
    } else {
      window.location.reload();
    }
    setLoading(false);
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
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Features for {selectedDepartment}</h3>
                {featuresHierarchy.map((feature) => (
                  <div key={feature.name} className="space-y-2 rounded-md border p-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${feature.name}-switch`}
                        checked={featureFlags[feature.name] || false}
                        onCheckedChange={(checked) => handleToggle(feature.name, checked)}
                      />
                      <Label htmlFor={`${feature.name}-switch`} className="font-semibold">{feature.name}</Label>
                    </div>
                    {feature.subFeatures && featureFlags[feature.name] && (
                      <div className="ml-6 space-y-2">
                        {feature.subFeatures.map((subFeature) => (
                          <div key={subFeature} className="flex items-center space-x-2">
                            <Switch
                              id={`${subFeature}-switch`}
                              checked={featureFlags[subFeature] || false}
                              onCheckedChange={(checked) => handleToggle(subFeature, checked)}
                            />
                            <Label htmlFor={`${subFeature}-switch`}>{subFeature}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {loading && <p>Loading features...</p>}
            {selectedDepartment && (
              <Button onClick={handleSave} disabled={loading} className="mt-4">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
