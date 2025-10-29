'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Users, Shield, MessageSquare, FileText, Database, UserCheck, Calendar, Briefcase, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Role {
  id: string;
  name: string;
  description: string;
  features: Record<string, Record<string, { enabled: boolean; functions?: Record<string, boolean> }>>;
}

interface DepartmentConfig {
  department: string;
  roles: Role[];
  features: Record<string, Record<string, { enabled: boolean; functions?: Record<string, boolean> }>>;
}

// Comprehensive feature hierarchy
const featureHierarchy: Record<string, { icon: any; subfeatures: Record<string, { label: string; functions: string[] }> }> = {
  'Admin': {
    icon: Shield,
    subfeatures: {
      'features': {
        label: 'Feature Management',
        functions: ['view', 'create', 'edit', 'delete']
      },
      'db': {
        label: 'Database Management',
        functions: ['view', 'clear', 'export']
      },
      'users': {
        label: 'User Management',
        functions: ['view', 'create', 'edit', 'delete', 'reset_password']
      }
    }
  },
  'HR': {
    icon: Users,
    subfeatures: {
      'onboarding': {
        label: 'Onboarding',
        functions: ['view', 'create', 'edit', 'schedule']
      },
      'users': {
        label: 'User Management',
        functions: ['view', 'edit', 'certifications', 'attendance']
      },
      'queries': {
        label: 'Queries',
        functions: ['view', 'create', 'respond', 'close']
      },
      'attendance': {
        label: 'Attendance',
        functions: ['view', 'create', 'edit', 'report']
      }
    }
  },
  'Compliance': {
    icon: FileText,
    subfeatures: {
      'sites': {
        label: 'Site Management',
        functions: ['view', 'add', 'delete', 'crawl']
      },
      'documents': {
        label: 'Document Management',
        functions: ['view', 'create', 'update', 'delete']
      },
      'crawling': {
        label: 'Site Crawling',
        functions: ['view', 'start', 'stop', 'schedule']
      }
    }
  },
  'Profile': {
    icon: UserCheck,
    subfeatures: {
      'profile': {
        label: 'Profile Management',
        functions: ['view_details', 'update_details', 'view_role_management', 'request_role']
      }
    }
  },
  'Approvals': {
    icon: CheckCircle,
    subfeatures: {
      'certifications': {
        label: 'Certificate Approvals',
        functions: ['view', 'approve', 'reject', 'review']
      },
      'roles': {
        label: 'Role Change Approvals',
        functions: ['view', 'approve', 'reject', 'review']
      },
      'documents': {
        label: 'Document Approvals',
        functions: ['view', 'approve', 'reject', 'review']
      }
    }
  },
  'Chat': {
    icon: MessageSquare,
    subfeatures: {
      'messages': {
        label: 'Chat Messages',
        functions: ['view', 'send', 'moderate', 'summarize']
      }
    }
  }
};

const defaultDepartments = [
  'Admin',
  'HR',
  'Engineering',
  'Sales',
  'Compliance',
  'Finance',
  'Marketing',
  'IT'
];

export default function FeaturesPage() {
  const { user, setFeatureFlags } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showFeatures, setShowFeatures] = useState<boolean>(false);
  const [departments, setDepartments] = useState<string[]>(defaultDepartments);
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState('');
  const [departmentConfig, setDepartmentConfig] = useState<DepartmentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  useEffect(() => {
    if (user && user.department !== 'Admin') {
      // Redirect or show error for non-admins
    }
  }, [user]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDepartmentConfig();
      setSelectedRole(''); // Reset role selection when department changes
      setShowFeatures(false); // Hide features when department changes
    }
  }, [selectedDepartment]);

  const fetchDepartmentConfig = async () => {
    if (!selectedDepartment) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/admin/department-config/${selectedDepartment}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartmentConfig(data);
      } else {
        // Create default config
        const defaultConfig: DepartmentConfig = {
          department: selectedDepartment,
          roles: [],
          features: {}
        };

        // Set default features for Admin department
        if (selectedDepartment === 'Admin') {
          defaultConfig.roles = [
            {
              id: 'super-admin',
              name: 'Super Admin',
              description: 'Full administrative access',
              features: {
                'Admin': {
                  'features': { enabled: true },
                  'db': { enabled: true },
                  'users': { enabled: true }
                },
                'HR': {
                  'onboarding': { enabled: true },
                  'users': { enabled: true },
                  'queries': { enabled: true },
                  'attendance': { enabled: true }
                },
                'Compliance': {
                  'sites': { enabled: true },
                  'documents': { enabled: true },
                  'crawling': { enabled: true }
                },
                'Profile': {
                  'profile': { enabled: true, functions: { 'view_details': true, 'update_details': true, 'view_role_management': true, 'request_role': true } }
                },
                'Approvals': {
                  'certifications': { enabled: true },
                  'roles': { enabled: true },
                  'documents': { enabled: true }
                },
                'Chat': {
                  'messages': { enabled: true }
                }
              }
            },
            {
              id: 'admin',
              name: 'Admin',
              description: 'Standard administrative access',
              features: {
                'Admin': {
                  'features': { enabled: true },
                  'db': { enabled: false },
                  'users': { enabled: true }
                },
                'Chat': {
                  'messages': { enabled: true }
                }
              }
            }
          ];
          defaultConfig.features = defaultConfig.roles[0].features; // Default to super admin features
        }

        setDepartmentConfig(defaultConfig);
      }
    } catch (err) {
      console.error('Error fetching department config:', err);
      setDepartmentConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (mainFeature: string, subfeature: string, enabled: boolean) => {
    if (!departmentConfig) return;

    const updatedConfig = { ...departmentConfig };
    const targetFeatures = selectedRole ? updatedConfig.roles.find(r => r.id === selectedRole)?.features : updatedConfig.features;

    if (!targetFeatures) return;

    if (!targetFeatures[mainFeature]) {
      targetFeatures[mainFeature] = {};
    }
    if (!targetFeatures[mainFeature][subfeature]) {
      targetFeatures[mainFeature][subfeature] = { enabled: false };
    }

    targetFeatures[mainFeature][subfeature].enabled = enabled;

    // If disabling the subfeature, also disable all functions
    if (!enabled) {
      if (targetFeatures[mainFeature][subfeature].functions) {
        Object.keys(targetFeatures[mainFeature][subfeature].functions!).forEach(func => {
          targetFeatures[mainFeature][subfeature].functions![func] = false;
        });
      }
    } else {
      // If enabling the subfeature, enable view functions by default
      const subConfig = featureHierarchy[mainFeature]?.subfeatures[subfeature];
      if (subConfig?.functions) {
        if (!targetFeatures[mainFeature][subfeature].functions) {
          targetFeatures[mainFeature][subfeature].functions = {};
        }
        subConfig.functions.forEach(func => {
          if (func.includes('view') || func.includes('details')) {
            targetFeatures[mainFeature][subfeature].functions![func] = true;
          }
        });
      }
    }

    setDepartmentConfig(updatedConfig);
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    // Load role-specific features
    const role = departmentConfig?.roles.find(r => r.id === roleId);
    if (role) {
      // Update the department config to show role features
      setDepartmentConfig(prev => prev ? { ...prev, features: role.features } : null);
      setShowFeatures(true); // Show features when role is selected
    }
  };

  const addRole = async () => {
    if (!newRole.trim() || !departmentConfig) return;

    const newRoleObj: Role = {
      id: newRole.toLowerCase().replace(/\s+/g, '-'),
      name: newRole.trim(),
      description: '',
      features: {}
    };

    const updatedConfig = { ...departmentConfig };
    updatedConfig.roles.push(newRoleObj);

    setDepartmentConfig(updatedConfig);
    setNewRole('');
    setShowAddRole(false);
  };

  const handleSave = async () => {
    if (!selectedDepartment || !departmentConfig) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/api/admin/department-config/${selectedDepartment}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(departmentConfig),
      });

      if (response.ok) {
        alert('Department configuration saved successfully!');

        // Update feature flags in real-time if the saved config affects the current user
        if (selectedDepartment === user?.department && selectedRole === user?.role) {
          const roleConfig = departmentConfig.roles.find(r => r.id === selectedRole);
          if (roleConfig) {
            setFeatureFlags(roleConfig.features);
            // Force a refresh of the dashboard layout features
            window.location.reload(); // Simple way to refresh the entire app with new features
          }
        } else {
          // If the changes affect the current user's department, refresh their features
          if (selectedDepartment === user?.department) {
            // Refresh the current user's features by re-fetching
            window.location.reload();
          }
        }
      } else {
        alert('Failed to save department configuration');
      }
    } catch (err) {
      console.error('Error saving department config:', err);
      alert('Error saving department configuration');
    } finally {
      setLoading(false);
    }
  };

  const addDepartment = async () => {
    if (!newDepartment.trim()) return;

    const updatedDepartments = [...departments, newDepartment.trim()];
    setDepartments(updatedDepartments);
    setNewDepartment('');
    setShowAddDepartment(false);

    // Save to backend
    try {
      await fetch('http://localhost:4000/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newDepartment.trim() }),
      });
    } catch (err) {
      console.error('Error adding department:', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Department & Feature Management</CardTitle>
            <CardDescription>Configure roles and feature access for each department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="space-y-2 flex-1">
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
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDepartment(!showAddDepartment)}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            </div>

            {showAddDepartment && (
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Input
                  placeholder="Enter department name"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                />
                <Button onClick={addDepartment} size="sm">
                  Add
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddDepartment(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {selectedDepartment && departmentConfig && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center space-x-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="role">Select Role</Label>
                    <Select onValueChange={handleRoleSelect} value={selectedRole}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role to configure features" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentConfig.roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddRole(!showAddRole)}
                      className="ml-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Role
                    </Button>
                  </div>
                </div>

                {showAddRole && (
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <Input
                      placeholder="Enter role name"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRole()}
                    />
                    <Button onClick={addRole} size="sm">
                      Add
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAddRole(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDepartment && departmentConfig && selectedRole && showFeatures && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration for {departmentConfig.roles.find(r => r.id === selectedRole)?.name} ({selectedDepartment})</CardTitle>
              <CardDescription>Enable/disable features and their functions for this role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(featureHierarchy).map(([mainFeature, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={mainFeature} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">{mainFeature}</h3>
                    </div>

                    <div className="ml-6 space-y-4">
                      {Object.entries(config.subfeatures).map(([subfeature, subConfig]) => (
                        <div key={subfeature} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            {mainFeature === 'Admin' && subfeature === 'features' && selectedRole === 'super-admin' ? (
                              <>
                                <Switch
                                  id={`${mainFeature}-${subfeature}`}
                                  checked={true}
                                  disabled={true}
                                />
                                <Label htmlFor={`${mainFeature}-${subfeature}`} className="font-semibold">
                                  {subConfig.label} (Always Enabled for Super Admin)
                                </Label>
                              </>
                            ) : (
                              <>
                                <Switch
                                  id={`${mainFeature}-${subfeature}`}
                                  checked={departmentConfig.features[mainFeature]?.[subfeature]?.enabled || false}
                                  onCheckedChange={(checked) => handleFeatureToggle(mainFeature, subfeature, checked)}
                                />
                                <Label htmlFor={`${mainFeature}-${subfeature}`} className="font-semibold">
                                  {subConfig.label}
                                </Label>
                              </>
                            )}
                          </div>

                          {/* Functions section */}
                          {subConfig.functions && subConfig.functions.length > 0 && departmentConfig.features[mainFeature]?.[subfeature]?.enabled && (
                            <div className="ml-6 space-y-2">
                              <Label className="text-sm font-medium text-muted-foreground">Functions:</Label>
                              <div className="grid grid-cols-1 gap-2">
                                {subConfig.functions.map((func) => {
                                  const isViewFunction = func.includes('view') || func.includes('details');
                                  const currentValue = departmentConfig.features[mainFeature]?.[subfeature]?.functions?.[func];
                                  const isChecked = currentValue !== undefined ? currentValue : (isViewFunction ? true : false);

                                  return (
                                    <div key={func} className="flex items-center space-x-2">
                                      <Switch
                                        id={`${mainFeature}-${subfeature}-${func}`}
                                        checked={isChecked}
                                        disabled={isViewFunction && departmentConfig.features[mainFeature]?.[subfeature]?.enabled}
                                        onCheckedChange={(checked) => {
                                          const updatedConfig = { ...departmentConfig };
                                          const targetFeatures = selectedRole ? updatedConfig.roles.find(r => r.id === selectedRole)?.features : updatedConfig.features;

                                          if (!targetFeatures) return;

                                          if (!targetFeatures[mainFeature]) {
                                            targetFeatures[mainFeature] = {};
                                          }
                                          if (!targetFeatures[mainFeature][subfeature]) {
                                            targetFeatures[mainFeature][subfeature] = { enabled: false };
                                          }
                                          if (!targetFeatures[mainFeature][subfeature].functions) {
                                            targetFeatures[mainFeature][subfeature].functions = {};
                                          }

                                          targetFeatures[mainFeature][subfeature].functions![func] = checked;
                                          setDepartmentConfig(updatedConfig);
                                        }}
                                      />
                                      <Label htmlFor={`${mainFeature}-${subfeature}-${func}`} className="text-sm">
                                        {func.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        {isViewFunction && departmentConfig.features[mainFeature]?.[subfeature]?.enabled && (
                                          <span className="text-xs text-muted-foreground ml-2">(Always enabled when subfeature is active)</span>
                                        )}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {loading && <p>Loading configuration...</p>}

        {selectedDepartment && departmentConfig && selectedRole && showFeatures && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} size="lg">
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
