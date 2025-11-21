'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: number;
  name: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch departments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
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
        setDepartments([...departments, newDepartment]);
        setNewDepartmentName('');
        setIsAddDialogOpen(false);
        toast({
          title: "Success",
          description: "Department added successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add department",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding department:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
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
          dept.id === updatedDepartment.id ? updatedDepartment : dept
        ));
        setEditingDepartment(null);
        setEditName('');
        toast({
          title: "Success",
          description: "Department renamed successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to rename department",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error renaming department:', error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setEditName(department.name);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Department Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage departments in the organization
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDepartment}>
                    Add Department
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
                      <span className="font-medium">{department.name}</span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(department)}
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
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingDepartment(null)}>
                  Cancel
                </Button>
                <Button onClick={handleRenameDepartment}>
                  Rename Department
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}