'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface Department {
  id: number;
  name: string;
  page_count?: number;
}

interface Role {
  id: number;
  name: string;
  is_default: boolean;
}

// Add a new interface for editing roles
interface EditingRole {
  id: number;
  name: string;
}

export default function DepartmentsPage() {
  return (
    <AccessControlWrapper pagePath="admin/departments">
      <DepartmentsContent />
    </AccessControlWrapper>
  );
}

function DepartmentsContent() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null);
  const { toast } = useToast();
  const { refreshToken: authRefreshToken } = useAuth();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
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

      const response = await fetch('http://localhost:4000/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Removed console statement for production
      
      // Handle token expiration
      if (response.status === 403) {
        // Removed console statement for production
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
            // Removed console statement for production
            setDepartments(data);
            return;
          } else {
            const errorText = await retryResponse.text();
            // Removed console statement for production
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
          description: `Failed to fetch departments: ${response.status} ${errorText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to connect to server. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const fetchRoles = async (departmentId: number) => {
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

      const response = await fetch(`http://localhost:4000/api/admin/departments/${departmentId}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Department name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true); // Set saving state to true
      const response = await fetch('http://localhost:4000/api/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newDepartmentName.trim() }),
      });

      if (response.ok) {
        const newDepartment = await response.json();
        setDepartments([...departments, { ...newDepartment, page_count: 0 }]);
        setNewDepartmentName('');
        setIsAddDialogOpen(false);
        toast({
          title: "Success",
          description: "Department added successfully",
        });
        // Refresh the departments list
        fetchDepartments();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add department",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // Reset saving state
    }
  };

  const handleRenameDepartment = async () => {
    if (!editingDepartment || !editName.trim()) {
      toast({
        title: "Validation Error",
        description: "Department name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true); // Set saving state to true
      const response = await fetch(`http://localhost:4000/api/admin/departments/${editingDepartment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        const updatedDepartment = await response.json();
        setDepartments(departments.map(dept => 
          dept.id === updatedDepartment.id ? { ...updatedDepartment, page_count: editingDepartment.page_count } : dept
        ));
        setEditingDepartment(null);
        setEditName('');
        toast({
          title: "Success",
          description: "Department renamed successfully",
        });
        // Refresh the departments list
        fetchDepartments();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to rename department",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // Reset saving state
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setEditName(department.name);
  };

  const openRoleDialog = async (departmentId: number) => {
    setSelectedDepartmentId(departmentId);
    await fetchRoles(departmentId);
    setIsRoleDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !selectedDepartmentId) {
      toast({
        title: "Validation Error",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`http://localhost:4000/api/admin/departments/${selectedDepartmentId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });

      if (response.ok) {
        const newRole = await response.json();
        setRoles([...roles, newRole]);
        setNewRoleName('');
        toast({
          title: "Success",
          description: "Role added successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add role",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameRole = async () => {
    if (!editingRole || !editingRole.name.trim() || !selectedDepartmentId) {
      toast({
        title: "Validation Error",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`http://localhost:4000/api/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ name: editingRole.name.trim() }),
      });

      if (response.ok) {
        const updatedRole = await response.json();
        setRoles(roles.map(role => 
          role.id === updatedRole.id ? updatedRole : role
        ));
        setEditingRole(null);
        toast({
          title: "Success",
          description: "Role renamed successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to rename role",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Department Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage departments and roles in the organization
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
                <DialogDescription>
                  Enter the name of the new department to add it to the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-department-name">Department Name</Label>
                  <Input
                    id="new-department-name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter department name"
                    disabled={isSaving}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDepartment} disabled={isSaving}>
                    {isSaving ? 'Adding...' : 'Add Department'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>
              List of all departments in the organization. Note: Departments can be added and renamed, but not deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No departments found. Add a new department to get started.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((department) => (
                    <div 
                      key={department.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{department.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {department.page_count !== undefined ? `${department.page_count} pages assigned` : 'Loading...'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRoleDialog(department.id)}
                          disabled={isSaving}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(department)}
                          disabled={isSaving}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Department Dialog */}
        <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Department</DialogTitle>
              <DialogDescription>
                Enter a new name for the department.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department-name">Department Name</Label>
                <Input
                  id="edit-department-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter new department name"
                  disabled={isSaving}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingDepartment(null)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleRenameDepartment} disabled={isSaving}>
                  {isSaving ? 'Renaming...' : 'Rename Department'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Roles Management Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={(open) => {
          setIsRoleDialogOpen(open);
          if (!open) {
            setEditingRole(null); // Reset editing role when closing dialog
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Roles</DialogTitle>
              <DialogDescription>
                Add and manage roles for this department.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="new-role-name">New Role Name</Label>
                    <Input
                      id="new-role-name"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Enter role name"
                      disabled={isSaving}
                    />
                  </div>
                  <Button onClick={handleAddRole} disabled={isSaving}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium">Existing Roles</h3>
                {roles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No roles found for this department.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div 
                        key={role.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        {editingRole && editingRole.id === role.id ? (
                          // Edit mode for role
                          <div className="flex-1 flex items-end space-x-2">
                            <div className="flex-1">
                              <Input
                                value={editingRole.name}
                                onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                                placeholder="Enter role name"
                                disabled={isSaving}
                              />
                            </div>
                            <Button 
                              onClick={handleRenameRole} 
                              disabled={isSaving}
                              size="sm"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEditingRole(null)} 
                              disabled={isSaving}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          // Display mode for role
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <span className="font-medium">{role.name}</span>
                              {role.is_default && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingRole({ id: role.id, name: role.name })}
                                disabled={isSaving}
                                title="Rename role"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Navigate to feature access page for this role
                                  window.location.href = `/admin/features?roleId=${role.id}`;
                                }}
                                disabled={isSaving}
                              >
                                Configure Access
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => {
                setIsRoleDialogOpen(false);
                setEditingRole(null); // Reset editing role when closing dialog
              }}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}