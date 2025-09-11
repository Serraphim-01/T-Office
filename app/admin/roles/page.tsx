'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const permissionCategories = [
  {
    title: 'User View',
    permissions: [
      { id: 'view_all_users_inclusive', label: 'View all users, admins inclusive' },
      { id: 'view_all_users_exclusive', label: 'View all users, admins exclusive' },
      { id: 'view_users_in_group', label: 'View all users under a group' },
      { id: 'interact_with_all_users', label: 'Interact with all users' },
    ],
  },
  {
    title: 'Task Management',
    permissions: [
      { id: 'create_tasks', label: 'Create tasks' },
      { id: 'assign_tasks', label: 'Assign tasks' },
      { id: 'view_all_tasks', label: 'View all tasks' },
      { id: 'edit_tasks', label: 'Edit tasks' },
    ],
  },
  {
    title: 'Department Item Access',
    permissions: [
      { id: 'view_special_items', label: 'View special items in a department' },
      { id: 'view_normal_items', label: 'View normal items in a department' },
    ],
  },
  {
    title: 'Department Function Access',
    permissions: [
      { id: 'use_special_functions', label: 'Use special functions in a department' },
      { id: 'use_normal_functions', label: 'Use normal functions in a department' },
    ],
  },
];

const allPermissions = permissionCategories.flatMap(category => category.permissions);

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);

  const handleCreateRole = () => {
    if (newRoleName.trim() === '') return;

    const newRole: Role = {
      id: Date.now().toString(),
      name: newRoleName,
      permissions: newRolePermissions,
    };

    setRoles([...roles, newRole]);
    setIsModalOpen(false);
    setNewRoleName('');
    setNewRolePermissions([]);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roles Management</h1>
            <p className="text-muted-foreground">Create and manage roles for your organization</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Create Role</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create a New Role</DialogTitle>
                <DialogDescription>
                  Define a new role and assign permissions to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input id="role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                </div>
                {permissionCategories.map((category) => (
                  <div key={category.title} className="space-y-2">
                    <Label className="font-semibold">{category.title}</Label>
                    <div className="space-y-2 pl-2">
                      {category.permissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={newRolePermissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewRolePermissions([...newRolePermissions, permission.id]);
                              } else {
                                setNewRolePermissions(newRolePermissions.filter((p) => p !== permission.id));
                              }
                            }}
                          />
                          <Label htmlFor={permission.id} className="font-normal">{permission.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleCreateRole}>Create Role</Button>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Existing Roles</CardTitle>
            <CardDescription>A list of roles in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {roles.length > 0 ? (
              <ul className="space-y-4">
                {roles.map((role) => (
                  <li key={role.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{role.name}</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                      {role.permissions.map((permissionId) => (
                        <li key={permissionId}>
                          {allPermissions.find((p) => p.id === permissionId)?.label}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No roles created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
