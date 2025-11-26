'use client';

import { useState, useEffect } from 'react';
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

interface Page {
  name: string;
  title: string;
}

interface Department {
  id: number;
  name: string;
  page_count: number;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [departmentPages, setDepartmentPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for saving indicator
  const { toast } = useToast();
  const { refreshToken: authRefreshToken, user } = useAuth();

  useEffect(() => {
    loadDepartments();
    loadPages();
  }, []);

  const loadDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching departments for features page with token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        toast({
          title: "Error",
          description: "No authentication token found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Use the standard departments endpoint which now includes page counts
      const response = await fetch('http://localhost:4000/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Departments API response status:', response.status);
      
      // Handle token expiration
      if (response.status === 403) {
        console.log('Token expired, attempting to refresh...');
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await fetch('http://localhost:4000/api/admin/departments', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            console.log('Retried departments data:', data);
            setDepartments(data);
            return;
          } else {
            const errorText = await retryResponse.text();
            console.error('Retry failed:', retryResponse.status, errorText);
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
        console.log('Departments data:', data);
        setDepartments(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to load departments:', response.status, errorText);
        toast({
          title: "Error",
          description: `Failed to load departments: ${response.status} ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments. Please check your connection.",
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

      const response = await fetch('http://localhost:4000/api/admin/pages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Handle token expiration
      if (response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await fetch('http://localhost:4000/api/admin/pages', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
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
      console.error('Error loading pages:', error);
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

      const response = await fetch(`http://localhost:4000/api/admin/departments/${departmentId}/pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Handle token expiration
      if (response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await fetch(`http://localhost:4000/api/admin/departments/${departmentId}/pages`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
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
      console.error('Error loading department pages:', error);
      toast({
        title: "Error",
        description: "Failed to load department pages. Please check your connection.",
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
      loadDepartmentPages(department.id);
    } else {
      setSelectedDepartmentId(null);
      setDepartmentPages([]);
      setSelectedPages([]);
    }
  };

  const handlePageToggle = (pageName: string) => {
    if (selectedPages.includes(pageName)) {
      setSelectedPages(selectedPages.filter(page => page !== pageName));
    } else {
      setSelectedPages([...selectedPages, pageName]);
    }
  };

  const handleSave = async () => {
    if (!selectedDepartmentId) return;
    
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

      const response = await fetch(`http://localhost:4000/api/admin/departments/${selectedDepartmentId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pages: selectedPages }),
      });
      
      // Handle token expiration
      if (response.status === 403) {
        const refreshed = await authRefreshToken();
        if (refreshed) {
          // Retry the request
          const retryResponse = await fetch(`http://localhost:4000/api/admin/departments/${selectedDepartmentId}/pages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ pages: selectedPages }),
          });
          if (retryResponse.ok) {
            // Update the departments list to reflect the new page count
            updateDepartmentPageCount(selectedDepartmentId, selectedPages.length);
            
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
      
      if (response.ok) {
        // Update the departments list to reflect the new page count
        updateDepartmentPageCount(selectedDepartmentId, selectedPages.length);
        
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
        const errorText = await response.text();
        throw new Error(`Failed to update feature access: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating feature access:', error);
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
    } else {
      category = page.name.split('/')[0] || 'general';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(page);
    return acc;
  }, {} as Record<string, Page[]>);

  // Check if main pages are enabled for current department
  const isChatPageEnabled = selectedPages.includes('chat');
  const isClockPageEnabled = selectedPages.includes('clock');
  const isHRPageEnabled = selectedPages.includes('hr') || selectedPages.includes('hr/onboarding') || selectedPages.includes('hr/queries') || selectedPages.includes('hr/users');
  const isWikiPageEnabled = selectedPages.includes('resources/wiki');

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Access Control</h1>
          <p className="text-muted-foreground mt-1">
            Manage which pages and features each department can access
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Selection</CardTitle>
            <CardDescription>
              Choose a department to manage its feature access
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
                        {dept.name} {dept.page_count !== undefined ? `(${dept.page_count} features assigned)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedDepartment && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">Selected Department: {selectedDepartment}</p>
                  <p className="text-muted-foreground mt-2">
                    Configure which pages and features this department can access.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedDepartmentId && (
          <Card>
            <CardHeader>
              <CardTitle>Page and Feature Access</CardTitle>
              <CardDescription>
                Select which pages and features this department can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading page access...</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPages).map(([category, categoryPages]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-medium capitalize">
                        {category === 'chat' ? 'Chat Features' : `${category} Pages`}
                      </h3>
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
                                (page.name.startsWith('hr/') && !isHRPageEnabled) ||
                                (page.name.startsWith('resources/wiki/') && !isWikiPageEnabled)
                              }
                            />
                            <label
                              htmlFor={page.name}
                              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                                (page.name.startsWith('chat/') && !isChatPageEnabled) ||
                                (page.name.startsWith('clock/') && !isClockPageEnabled) ||
                                (page.name.startsWith('hr/') && !isHRPageEnabled) ||
                                (page.name.startsWith('resources/wiki/') && !isWikiPageEnabled)
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
                              {page.name.startsWith('hr/') && !isHRPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires HR page access
                                </span>
                              )}
                              {page.name.startsWith('resources/wiki/') && !isWikiPageEnabled && (
                                <span className="text-xs text-muted-foreground block">
                                  Requires Wiki page access
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