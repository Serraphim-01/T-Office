'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { clearPageAccessCache } from '@/lib/page-access';
import { refreshNavigation } from '@/components/access-controlled-nav';
import { AccessControlWrapper } from '@/components/access-control-wrapper';
import { apiGet, apiPost } from '@/lib/api';

interface Page {
  name: string;
  title: string;
}

interface Department {
  id: number;
  name: string;
  page_count: number;
}

interface Role {
  id: number;
  name: string;
  is_default: boolean;
  page_count?: number;
}

export default function FeaturesPage() {
  return (
    <AccessControlWrapper pagePath="admin/features">
      <FeaturesContent />
    </AccessControlWrapper>
  );
}

function FeaturesContent() {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [departmentPages, setDepartmentPages] = useState<string[]>([]);
  const [rolePages, setRolePages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for saving indicator
  const { toast } = useToast();
  const { refreshToken: authRefreshToken, user } = useAuth();

  // Check for roleId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleId = urlParams.get('roleId');
    if (roleId) {
      loadRoleById(parseInt(roleId));
    }
  }, []);

  const loadRoleById = async (roleId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Get role details
      const response = await apiGet('/api/admin/departments', token);

      if (response.ok) {
        const departmentsData = await response.json();
        setDepartments(departmentsData);
        
        // Find the department for this role
        // In a real implementation, you would have an endpoint to get role details
        // For now, we'll just load the first department's roles as an example
        if (departmentsData.length > 0) {
          const dept = departmentsData[0];
          setSelectedDepartment(dept.name);
          setSelectedDepartmentId(dept.id);
          await loadRoles(dept.id);
        }
      }
    } catch (error) {
      // Removed console statement for production
    }
  };

  useEffect(() => {
    loadDepartments();
    loadPages();
  }, []);

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      // Removed console statement for production
      
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Use the standard departments endpoint which now includes page counts
      const response = await apiGet('/api/admin/departments', token);
      
      // Removed console statement for production
      
      // Handle token expiration
      if (response.status === 403) {
        // Removed console statement for production
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await apiGet('/api/admin/departments', localStorage.getItem('token') || '');
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            // Removed console statement for production
            setDepartments(data);
            return;
          } else {
            const errorText = await retryResponse.text();
            // Removed console statement for production
            toast({
              title: "Error",
              description: `Failed to load departments: ${retryResponse.status} ${errorText}`,
              variant: "destructive",
            });
          }
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        // Removed console statement for production
        setDepartments(data);
      } else {
        const errorText = await response.text();
        // Removed console statement for production
        toast({
          title: "Error",
          description: `Failed to load departments: ${response.status} ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load departments. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const loadRoles = async (departmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiGet(`/api/admin/departments/${departmentId}/roles`, token);

      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to load roles: ${response.status} ${errorText}`);
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load roles. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const loadPages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiGet('/api/admin/pages', token);
      
      // Handle token expiration
      if (response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await apiGet('/api/admin/pages', localStorage.getItem('token') || '');
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setPages(data);
            return;
          }
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to load pages: ${response.status} ${errorText}`);
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load pages. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const loadDepartmentPages = async (departmentId: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiGet(`/api/admin/departments/${departmentId}/pages`, token);
      
      // Handle token expiration
      if (response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await apiGet(`/api/admin/departments/${departmentId}/pages`, localStorage.getItem('token') || '');
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setDepartmentPages(data);
            setSelectedPages(data);
            setIsLoading(false);
            return;
          }
        }
      }
      
      if (response.ok) {
        const data = await response.json();
        setDepartmentPages(data);
        setSelectedPages(data);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to load department pages: ${response.status} ${errorText}`);
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load department pages. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRolePages = async (roleId: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiGet(`/api/admin/roles/${roleId}/pages`, token);
      
      if (response.ok) {
        const data = await response.json();
        setRolePages(data);
        setSelectedPages(data);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to load role pages: ${response.status} ${errorText}`);
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load role pages. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
    const department = departments.find(dept => dept.name === value);
    if (department) {
      setSelectedDepartmentId(department.id);
    } else {
      setSelectedDepartmentId(null);
    }
  };

  // Load roles and department pages when department ID changes
  useEffect(() => {
    if (selectedDepartmentId) {
      // Reset selections
      setSelectedRole('');
      setSelectedRoleId(null);
      setRoles([]);
      setDepartmentPages([]);
      setRolePages([]);
      setSelectedPages([]);
      
      // Load roles for this department and department pages after render
      setTimeout(() => {
        loadRoles(selectedDepartmentId);
        loadDepartmentPages(selectedDepartmentId);
      }, 0);
    } else {
      // Clear all selections
      setSelectedRole('');
      setSelectedRoleId(null);
      setRoles([]);
      setDepartmentPages([]);
      setRolePages([]);
      setSelectedPages([]);
    }
  }, [selectedDepartmentId]);

  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    const role = roles.find(r => r.name === value);
    if (role) {
      setSelectedRoleId(role.id);
    } else {
      setSelectedRoleId(null);
    }
  };

  // Load role pages when role ID changes
  useEffect(() => {
    if (selectedRoleId) {
      setTimeout(() => {
        loadRolePages(selectedRoleId);
      }, 0);
    }
    // Don't load department pages when no role is selected
    // This ensures features are only shown when a role is selected
  }, [selectedRoleId]);

  const handlePageToggle = (pageName: string) => {
    if (selectedPages.includes(pageName)) {
      setSelectedPages(selectedPages.filter(page => page !== pageName));
    } else {
      setSelectedPages([...selectedPages, pageName]);
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId && !selectedDepartmentId) return;
    
    try {
      setIsSaving(true); // Set saving state to true
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      let response;
      if (selectedRoleId) {
        // Save role-specific feature access
        response = await apiPost(`/api/admin/roles/${selectedRoleId}/pages`, { pages: selectedPages }, token);
      } else if (selectedDepartmentId) {
        // Save department-level feature access (backward compatibility)
        response = await apiPost(`/api/admin/departments/${selectedDepartmentId}/pages`, { pages: selectedPages }, token);
      }
      
      // Handle token expiration
      if (response && response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          let retryResponse;
          if (selectedRoleId) {
            retryResponse = await apiPost(`/api/admin/roles/${selectedRoleId}/pages`, { pages: selectedPages }, localStorage.getItem('token') || '');
          } else if (selectedDepartmentId) {
            retryResponse = await apiPost(`/api/admin/departments/${selectedDepartmentId}/pages`, { pages: selectedPages }, localStorage.getItem('token') || '');
          }
          
          if (retryResponse && retryResponse.ok) {
            // Update the departments list to reflect the new page count
            if (selectedDepartmentId) {
              updateDepartmentPageCount(selectedDepartmentId, selectedPages.length);
            }
            
            // Clear cache and show success message
            clearPageAccessCache();
            
            // Refresh navigation for all users
            // Note: In a real application, you would use a more sophisticated approach
            // like WebSocket or server-sent events to notify all clients
            if (user) {
              // This would refresh the navigation for the current user
              // In a real app, you might want to broadcast this to all users
              window.dispatchEvent(new CustomEvent('navigation-refresh'));
            }
            
            toast({
              title: "Success",
              description: "Feature access updated successfully",
            });
            setIsSaving(false);
            return;
          }
        }
      }
      
      if (response && response.ok) {
        // Update the departments list to reflect the new page count
        if (selectedDepartmentId) {
          updateDepartmentPageCount(selectedDepartmentId, selectedPages.length);
        }
        
        // Clear cache to force refresh of navigation
        clearPageAccessCache();
        
        // Dispatch event to refresh navigation
        window.dispatchEvent(new CustomEvent('navigation-refresh'));
        
        // Show success message
        toast({
          title: "Success",
          description: "Feature access updated successfully",
        });
      } else {
        const errorText = response ? await response.text() : "Unknown error";
        throw new Error(`Failed to update feature access: ${response?.status} ${errorText}`);
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to update feature access. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // Reset saving state
    }
  };

  // Helper function to update department page count in real-time
  const updateDepartmentPageCount = (departmentId: number, pageCount: number) => {
    setDepartments(prevDepartments => 
      prevDepartments.map(dept => 
        dept.id === departmentId ? { ...dept, page_count: pageCount } : dept
      )
    );
  };

  // Group pages by category for better UI organization
  const groupedPages = pages.reduce((acc, page) => {
    // Extract category from page name
    let category;
    if (page.name.startsWith('chat/')) {
      category = 'chat';
    } else if (page.name.startsWith('clock/')) {
      category = 'clock';
    } else if (page.name.startsWith('hr/')) {
      category = 'hr';
    } else if (page.name.startsWith('resources/')) {
      category = 'resources';
    } else if (page.name.startsWith('inventory/')) {
      category = 'inventory';
    } else if (page.name.includes('/')) {
      // For other pages with slashes, take the first part as category
      category = page.name.split('/')[0];
    } else {
      // For pages without slashes, put them in a 'general' category
      category = 'general';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(page);
    return acc;
  }, {} as Record<string, Page[]>);

  // Check if main pages are enabled for current department/role
  const isChatPageEnabled = selectedPages.includes('chat');
  const isClockPageEnabled = selectedPages.includes('clock');
  const isHRPageEnabled = selectedPages.includes('hr') || selectedPages.includes('hr/onboarding') || selectedPages.includes('hr/queries') || selectedPages.includes('hr/users');
  const isHRonboardingPageEnabled = selectedPages.includes('hr/onboarding');
  const isHRqueriesPageEnabled = selectedPages.includes('hr/queries');
  const isHRusersPageEnabled = selectedPages.includes('hr/users');
  const isWikiPageEnabled = selectedPages.includes('resources/wiki');
  const isCreateWikiPageEnabled = selectedPages.includes('resources/wiki/create');
  const isInboundPageEnabled = selectedPages.includes('inventory/inbound');
  const isOutboundPageEnabled = selectedPages.includes('inventory/outbound');
  const isStorePageEnabled = selectedPages.includes('inventory/store');
  const isProductsPageEnabled = selectedPages.includes('inventory/products');

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Access Control</h1>
          <p className="text-muted-foreground mt-1">
            Manage which pages and features each department or role can access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department/Role Selection</CardTitle>
            <CardDescription>
              Choose a department and a role to manage its feature access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedDepartmentId && roles.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name} {role.is_default ? '(Default)' : ''} {role.page_count !== undefined ? `(${role.page_count} features assigned)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedDepartment && selectedRole && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">
                    Selected: {selectedDepartment} / {selectedRole}
                  </p>
                  <p className="text-muted-foreground mt-2">
                    Configure which pages and features this role can access.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedRoleId && ( // Only show features when a role is selected
          <Card>
            <CardHeader>
              <CardTitle>Page and Feature Access</CardTitle>
              <CardDescription>
                Select which pages and features this role can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading page access...</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPages).map(([category, categoryPages]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium capitalize">
                          {category === 'chat' ? 'Chat Features' : category === 'hr' ? 'HR Pages' : category === 'inventory' ? 'Inventory Pages' : `${category} Pages`}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {selectedPages.filter(page => 
                              category === 'general' 
                                ? !page.includes('/') 
                                : page.startsWith(`${category}/`)
                            ).length} / {categoryPages.length}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const categoryPageNames = categoryPages.map(page => page.name);
                              const selectedCategoryPages = selectedPages.filter(page => 
                                categoryPageNames.includes(page)
                              );
                              
                              if (selectedCategoryPages.length === categoryPageNames.length) {
                                // Deselect all
                                setSelectedPages(prev => prev.filter(page => !categoryPageNames.includes(page)));
                              } else {
                                // Select all
                                const newSelectedPages = [...selectedPages];
                                categoryPageNames.forEach(pageName => {
                                  if (!newSelectedPages.includes(pageName)) {
                                    newSelectedPages.push(pageName);
                                  }
                                });
                                setSelectedPages(newSelectedPages);
                              }
                            }}
                          >
                            {selectedPages.filter(page => 
                              category === 'general' 
                                ? !page.includes('/') 
                                : page.startsWith(`${category}/`)
                            ).length === categoryPages.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryPages.map((page) => (
                          <div key={page.name} className="flex items-center space-x-2 p-3 border rounded-lg">
                            <Checkbox
                              id={page.name}
                              checked={selectedPages.includes(page.name)}
                              onCheckedChange={() => handlePageToggle(page.name)}
                              disabled={
                                (page.name.startsWith('chat/') && !isChatPageEnabled) ||
                                (page.name.startsWith('clock/') && !isClockPageEnabled) ||
                                (page.name.startsWith('hr/onboarding/') && !isHRonboardingPageEnabled) ||
                                (page.name.startsWith('hr/queries/') && !isHRqueriesPageEnabled) ||
                                (page.name.startsWith('hr/users/') && !isHRusersPageEnabled) ||
                                (page.name.startsWith('resources/wiki/create-topic') && !isCreateWikiPageEnabled) ||
                                (page.name.startsWith('inventory/inbound/') && !isInboundPageEnabled) ||
                                (page.name.startsWith('inventory/outbound/') && !isOutboundPageEnabled) ||
                                (page.name.startsWith('inventory/store/') && !isStorePageEnabled) ||
                                (page.name.startsWith('inventory/products/') && !isProductsPageEnabled)
                              }
                            />
                            <label
                              htmlFor={page.name}
                              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                (page.name.startsWith('chat/') && !isChatPageEnabled) ||
                                (page.name.startsWith('clock/') && !isClockPageEnabled) ||
                                (page.name.startsWith('hr/onboarding/') && !isHRonboardingPageEnabled) ||
                                (page.name.startsWith('hr/queries/') && !isHRqueriesPageEnabled) ||
                                (page.name.startsWith('hr/users/') && !isHRusersPageEnabled) ||
                                (page.name.startsWith('resources/wiki/create-topic') && !isCreateWikiPageEnabled) ||
                                (page.name.startsWith('inventory/inbound/') && !isInboundPageEnabled) ||
                                (page.name.startsWith('inventory/outbound/') && !isOutboundPageEnabled) ||
                                (page.name.startsWith('inventory/store/') && !isStorePageEnabled) ||
                                (page.name.startsWith('inventory/products/') && !isProductsPageEnabled)
                                  ? 'text-muted-foreground opacity-50' 
                                  : ''
                              }`}
                            >
                              {page.title}
                              {page.name.startsWith('chat/') && !isChatPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires main Chat page access
                                </span>
                              )}
                              {page.name.startsWith('clock/') && !isClockPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires main Clock page access
                                </span>
                              )}
                              {page.name.startsWith('hr/onboarding/') && !isHRonboardingPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires HR Onboarding page access
                                </span>
                              )}
                              {page.name.startsWith('hr/queries/') && !isHRqueriesPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires HR Queries page access
                                </span>
                              )}
                              {page.name.startsWith('hr/users/') && !isHRusersPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires HR Users page access
                                </span>
                              )}
                              {page.name.startsWith('resources/wiki/create-topic') && !isCreateWikiPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Create Wiki page access
                                </span>
                              )}
                              {page.name.startsWith('inventory/inbound/') && !isInboundPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Inbound page access
                                </span>
                              )}
                              {page.name.startsWith('inventory/outbound/') && !isOutboundPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Outbound page access
                                </span>
                              )}
                              {page.name.startsWith('inventory/store/') && !isStorePageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Store page access
                                </span>
                              )}
                              {page.name.startsWith('inventory/products/') && !isProductsPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Products page access
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}