'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/dashboard-layout';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { ArrowLeft, Edit } from 'lucide-react';

interface Provider {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  official_contact_name?: string;
  official_contact_email?: string;
  official_contact_phone?: string;
  organization_contact_name?: string;
  organization_contact_email?: string;
  organization_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
}

interface AssignedUser {
  id: number;
  assignment_type: string;
  user_id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
}

interface SupportStaff {
  id: number;
  support_staff_id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
}

export default function ProviderDetailsPage({ params }: { params: { id: string } }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [supportStaffMap, setSupportStaffMap] = useState<Record<number, SupportStaff[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [formData, setFormData] = useState<Provider>({
    id: 0,
    name: '',
    email: '',
    phone: '',
    address: '',
    official_contact_name: '',
    official_contact_email: '',
    official_contact_phone: '',
    organization_contact_name: '',
    organization_contact_email: '',
    organization_contact_phone: ''
  });
  const [canEditProvider, setCanEditProvider] = useState(false); // Added feature access control
  
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth(); // Added user context

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to edit provider details
    const editProviderDetailsAccess = await hasPageAccess(user.id.toString(), 'inventory/products/edit-provider-details');
    
    setCanEditProvider(editProviderDetailsAccess);
  };

  useEffect(() => {
    fetchProvider();
    fetchUsers();
    fetchAssignedUsers();
  }, [params.id]);

  // Initialize selected user when assigned users are fetched
  useEffect(() => {
    if (assignedUsers.length > 0) {
      const attachedStaff = assignedUsers.find(u => u.assignment_type === 'attached_staff');
      if (attachedStaff) {
        setSelectedUserId(attachedStaff.user_id.toString());
      }
    }
  }, [assignedUsers]);

  const fetchProvider = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch provider');
      
      const data = await response.json();
      setProvider(data);
      setFormData(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load provider details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/hr/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      // Error handling without console.log
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${params.id}/assigned-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch assigned users');
      
      const data = await response.json();
      setAssignedUsers(data);
      
      // Fetch support staff for each assigned user
      const supportStaffPromises = data.map(async (assignedUser: AssignedUser) => {
        try {
          const supportResponse = await fetch(`http://localhost:4000/api/users/${assignedUser.user_id}/support-staff`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (supportResponse.ok) {
            const supportData = await supportResponse.json();
            return { userId: assignedUser.user_id, supportStaff: supportData };
          }
          return { userId: assignedUser.user_id, supportStaff: [] };
        } catch (error) {
          // Error handling without console.log
          return { userId: assignedUser.user_id, supportStaff: [] };
        }
      });
      
      const supportResults = await Promise.all(supportStaffPromises);
      const supportMap: Record<number, SupportStaff[]> = {};
      supportResults.forEach(result => {
        supportMap[result.userId] = result.supportStaff;
      });
      
      setSupportStaffMap(supportMap);
    } catch (error) {
      // Error handling without console.log
      // Even if there's an error, we still want to update the state to avoid infinite loading
      setAssignedUsers([]);
      setSupportStaffMap({});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate official contact (required fields)
    if (!formData.official_contact_name || !formData.official_contact_email || !formData.official_contact_phone) {
      toast({
        title: 'Error',
        description: 'Official contact name, email, and phone are required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Update provider
      const response = await fetch(`http://localhost:4000/api/inventory/providers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update provider');

      const updatedProvider = await response.json();
      setProvider(updatedProvider);
      setFormData(updatedProvider);
      
      // Handle user assignment
      // First, get current assignments
      const currentAssignmentsResponse = await fetch(`http://localhost:4000/api/inventory/providers/${params.id}/assigned-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (currentAssignmentsResponse.ok) {
        const currentAssignments = await currentAssignmentsResponse.json();
        const attachedStaff = currentAssignments.find((a: any) => a.assignment_type === 'attached_staff');
        
        // If there's currently an assigned user and it's different from the selected one, unassign it
        if (attachedStaff && attachedStaff.user_id !== parseInt(selectedUserId || '0')) {
          await fetch(`http://localhost:4000/api/inventory/providers/${params.id}/unassign-user/${attachedStaff.user_id}?assignmentType=attached_staff`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
        
        // If there's a selected user and it's different from the current one, assign it
        if (selectedUserId && attachedStaff?.user_id !== parseInt(selectedUserId)) {
          const assignResponse = await fetch(`http://localhost:4000/api/inventory/providers/${params.id}/assign-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              userId: parseInt(selectedUserId),
              assignmentType: 'attached_staff'
            }),
          });
          
          if (!assignResponse.ok) {
            throw new Error('Failed to assign user');
          }
        }
      }
      
      setIsEditing(false);
      
      // Refresh assigned users list
      fetchAssignedUsers();
      
      toast({
        title: 'Success',
        description: 'Provider updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update provider',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = () => {
    // Initialize form data with current provider data
    setFormData({
      id: provider!.id,
      name: provider!.name,
      email: provider!.email || '',
      phone: provider!.phone || '',
      address: provider!.address || '',
      official_contact_name: provider!.official_contact_name || '',
      official_contact_email: provider!.official_contact_email || '',
      official_contact_phone: provider!.official_contact_phone || '',
      organization_contact_name: provider!.organization_contact_name || '',
      organization_contact_email: provider!.organization_contact_email || '',
      organization_contact_phone: provider!.organization_contact_phone || '',
    });
    
    // Initialize selected user
    const attachedStaff = assignedUsers.find(u => u.assignment_type === 'attached_staff');
    if (attachedStaff) {
      setSelectedUserId(attachedStaff.user_id.toString());
    } else {
      setSelectedUserId('');
    }
    
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!provider) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Provider not found</p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5 mr-2" /> Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout customTitle={provider?.name || 'Provider Details'}>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {isEditing ? 'Edit Provider' : provider?.name || 'Provider Details'}
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {!isEditing && canEditProvider && (
                <Button 
                  onClick={handleEditClick}
                  variant="outline"
                  className="p-2"
                  title="Edit Provider"
                >
                  <Edit className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Provider Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Basic Provider Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Provider Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter provider name"
                        required
                      />
                    </div>
                    <div></div> {/* Empty div to maintain grid structure */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Organization Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        placeholder="Enter organization email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Organization Call Line</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleInputChange}
                        placeholder="Enter organization call line"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address || ''}
                        onChange={handleInputChange}
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                </div>

                {/* Official Contact Section (Required) */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Official Contact *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="official_contact_name">Name *</Label>
                      <Input
                        id="official_contact_name"
                        name="official_contact_name"
                        value={formData.official_contact_name || ''}
                        onChange={handleInputChange}
                        placeholder="Enter official contact name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="official_contact_email">Email *</Label>
                      <Input
                        id="official_contact_email"
                        name="official_contact_email"
                        type="email"
                        value={formData.official_contact_email || ''}
                        onChange={handleInputChange}
                        placeholder="Enter official contact email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="official_contact_phone">Phone *</Label>
                      <Input
                        id="official_contact_phone"
                        name="official_contact_phone"
                        value={formData.official_contact_phone || ''}
                        onChange={handleInputChange}
                        placeholder="Enter official contact phone"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Contact Section (Optional) */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Organization Contact (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization_contact_name">Name</Label>
                      <Input
                        id="organization_contact_name"
                        name="organization_contact_name"
                        value={formData.organization_contact_name || ''}
                        onChange={handleInputChange}
                        placeholder="Enter organization contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization_contact_email">Email</Label>
                      <Input
                        id="organization_contact_email"
                        name="organization_contact_email"
                        type="email"
                        value={formData.organization_contact_email || ''}
                        onChange={handleInputChange}
                        placeholder="Enter organization contact email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization_contact_phone">Phone</Label>
                      <Input
                        id="organization_contact_phone"
                        name="organization_contact_phone"
                        value={formData.organization_contact_phone || ''}
                        onChange={handleInputChange}
                        placeholder="Enter organization contact phone"
                      />
                    </div>
                  </div>
                </div>

                {/* Assign User Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Assign User</h3>
                  <div className="space-y-2">
                    <Label htmlFor="assignedUser">Attach Staff Member</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Basic Provider Information */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Basic Provider Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Provider Name</Label>
                      <p className="font-medium">{provider.name}</p>
                    </div>
                    <div></div> {/* Empty div to maintain grid structure */}
                    <div>
                      <Label className="text-muted-foreground">Organization Email</Label>
                      <p className="font-medium">{provider.email || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Organization Call Line</Label>
                      <p className="font-medium">{provider.phone || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{provider.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Official Contact Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Official Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{provider.official_contact_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{provider.official_contact_email || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{provider.official_contact_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Organization Contact Section */}
                {(provider.organization_contact_name || provider.organization_contact_email || provider.organization_contact_phone) && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Organization Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{provider.organization_contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{provider.organization_contact_email || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium">{provider.organization_contact_phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attached Staff Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Attached Staff</h3>
                  <div className="space-y-4">
                    {assignedUsers.filter(u => u.assignment_type === 'attached_staff').length > 0 ? (
                      <div className="space-y-2">
                        {assignedUsers
                          .filter(u => u.assignment_type === 'attached_staff')
                          .map((assignedUser) => (
                            <div key={assignedUser.id} className="border rounded p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{assignedUser.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{assignedUser.email}</p>
                                  <p className="text-sm text-muted-foreground">{assignedUser.department}</p>
                                </div>
                              </div>
                              
                              {/* Display support staff for this assigned user */}
                              <div className="mt-2">
                                {supportStaffMap[assignedUser.user_id] ? (
                                  supportStaffMap[assignedUser.user_id].length > 0 ? (
                                    <div className="mt-3 pl-3 border-l-2 border-muted">
                                      <h4 className="text-sm font-medium mb-2">Support Staff:</h4>
                                      <ul className="space-y-1">
                                        {supportStaffMap[assignedUser.user_id].map((supportStaff) => (
                                          <li key={supportStaff.id} className="text-sm">
                                            <span className="font-medium">{supportStaff.full_name}</span> - {supportStaff.email}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No support staff assigned to this user.</p>
                                  )
                                ) : (
                                  <p className="text-xs text-muted-foreground">Loading support staff information...</p>
                                )}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No users assigned to this provider</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}