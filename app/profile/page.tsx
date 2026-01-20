'use client';

import { DashboardLayout } from '@/components/dashboard-layout';

export const dynamic = 'force-dynamic';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Building, FileText, Upload, Calendar, CheckCircle, AlertCircle, Eye, Download, Trash2, MessageSquare, Plus, Send, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { fetchDepartments } from '@/lib/departments';
import { useToast } from '@/hooks/use-toast';

interface Certification {
  id: string;
  title: string;
  issuer: string;
  file_url?: string;
  file_data?: string;
  file_type?: string;
  expiry_date?: string;
  has_expiry: boolean;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface Profile {
  id: number;
  full_name: string;
  email: string;
  department: string;
  role?: string;
  created_at: string;
  certifications: Certification[];
  cv?: string;
  portfolio?: string;
  job_description?: string;
  contract?: string;
  query_count: number;
  attendance: any[];
  other_details: any;
  inductions?: Induction[];
}

interface SupportStaff {
  id: number;
  support_staff_id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
}

interface ProfileWithQueries extends Profile {
  queries: UserQuery[];
  max_queries_before_action: number;
  role?: string;
  supportStaff?: SupportStaff[]; // Add support staff to the profile interface
}

interface Induction {
  id: number;
  department: string;
  induction_time: string;
  attendees: string[];
  attendee_names: { id: string; name: string }[];
}

interface UserQuery {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  assigned_to?: number;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  query_type?: string;
  is_locked?: boolean; // Added for locked queries
  last_reply_from_authorized_user?: boolean; // Added to track who last replied
  current_user_has_replied?: boolean; // Added to track if current user has replied
  replies?: QueryReply[];
}

interface QueryReply {
  id: number;
  query_id: number;
  reply_text: string;
  replied_by: number;
  replied_by_name: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileWithQueries | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddCertModalOpen, setIsAddCertModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    title: '',
    issuer: '',
    file_data: '',
    file_name: '',
    file_type: '',
    expiry_date: '',
    has_expiry: false,
    file_url: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Added states for query modal
  const [selectedQuery, setSelectedQuery] = useState<UserQuery | null>(null);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.avatar_url || null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch profile data
  useEffect(() => {
    // Only fetch profile if user is available
    if (user) {
      fetchProfile();
    }
    loadDepartments();

    // Add event listener for window focus to refetch profile
    const handleFocus = () => {
      if (user) {
        fetchProfile();
      }
    };

    window.addEventListener('focus', handleFocus);

    // Add polling for real-time updates every 10 seconds
    const interval = setInterval(() => {
      if (user) {
        fetchProfile();
      }
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user]); // Add user as dependency

  const loadDepartments = async () => {
    try {
      const deptList = await fetchDepartments();
      setDepartments(deptList);
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    // Don't fetch if user is not available
    if (!user) {
      // Removed console statement for production
      return;
    }
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Fetch profile data
      const profileResponse = await fetch(`${apiUrl}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Fetch queries data
      const queriesResponse = await fetch(`${apiUrl}/api/profile/queries`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Fetch support staff data
      const userId = user.id; // Now we can safely access user.id
      // Removed console statement for production
      
      const supportStaffResponse = await fetch(`${apiUrl}/api/users/${userId}/support-staff`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (profileResponse.ok && queriesResponse.ok) {
        const profileData = await profileResponse.json();
        const queriesData = await queriesResponse.json();
        let supportStaffData = [];
        
        if (supportStaffResponse.ok) {
          supportStaffData = await supportStaffResponse.json();
          // Removed console statement for production
        } else {
          // Removed console statement for production
          try {
            const errorText = await supportStaffResponse.text();
            // Removed console statement for production
          } catch (e) {
            // Removed console statement for production
          }
        }
        
        // Combine the data
        setProfile({
          ...profileData,
          queries: queriesData.queries,
          max_queries_before_action: queriesData.max_queries_before_action,
          supportStaff: supportStaffData // Add support staff to the profile data
        });
        
        // Set profile picture from profile data
        setProfilePicture(profileData.profile_picture_url);
      }
    } catch (error) {
      // Removed console statement for production
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    // In a real app, you'd upload to a cloud storage service
    // For now, we'll create a data URL and extract base64 data
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 data and MIME type from data URL
      const [mimePart, base64Data] = dataUrl.split(',');
      const mimeType = mimePart.split(':')[1].split(';')[0];

      setNewCert(prev => ({
        ...prev,
        file_data: base64Data,
        file_name: file.name,
        file_type: mimeType
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const addCertification = async () => {
    if (!newCert.title || !newCert.issuer) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/profile/certifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCert)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Certification submitted for approval!",
        });
        setIsAddCertModalOpen(false);
        setNewCert({
          title: '',
          issuer: '',
          file_data: '',
          file_name: '',
          file_type: '',
          expiry_date: '',
          has_expiry: false,
          file_url: ''
        });
        fetchProfile();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to submit certification.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const openCertification = (cert: Certification) => {
    setSelectedCert(cert);
    setIsImageModalOpen(true);
  };

  const deleteCertification = async (certId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/profile/certifications/${certId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Certification deleted successfully!",
        });
        fetchProfile();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete certification.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // Added function to open query in modal
  const openQueryModal = (query: UserQuery) => {
    setSelectedQuery(query);
    setIsQueryModalOpen(true);
    setReplyText('');
  };

  // Added function to submit a reply
  const submitReply = async () => {
    if (!selectedQuery || !replyText.trim()) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      // Reply to query without locking it when user replies from profile
      const response = await fetch(`${apiUrl}/api/hr/queries/${selectedQuery.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reply_text: replyText.trim() })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reply submitted successfully!",
        });
        setIsQueryModalOpen(false);
        setReplyText('');
        // Refresh the profile to show the new reply
        fetchProfile();
        
        // Also refresh query replies in case this page is open in another tab
        try {
          const response = await fetch(`${apiUrl}/api/hr/queries-replies`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            // We don't need to update state here since this is just to trigger a refresh
            // The HR queries page will refresh when the user navigates to it
          }
        } catch (error) {
          // Removed console statement for production
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to submit reply.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const submitQuery = async (subject: string, description: string, query_type: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/profile/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subject, description, query_type })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Query submitted successfully!",
        });
        setIsApprovalModalOpen(false);
        fetchProfile();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to submit query.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Removed console statement for production
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureUpload = (file: File) => {
    setIsUploading(true);
    
    const reader = new FileReader();
    
    // Handle file reading errors
    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: "Error",
        description: "Failed to read the image file.",
        variant: "destructive",
      });
    };
    
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        // Extract base64 data and MIME type from data URL
        const [mimePart, base64Data] = dataUrl.split(',');
        const mimeType = mimePart.split(':')[1].split(';')[0];
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/profile/picture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            picture_data: base64Data,
            file_type: mimeType
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          setProfilePicture(result.profile_picture_url);
          
          // Update the user context with the new avatar
          if (user) {
            const updatedUser = {
              ...user,
              avatar_url: result.profile_picture_url || '',
            };
            // Update the user context using the setUser from the component scope
            setUser(updatedUser);
          }
          
          toast({
            title: "Success",
            description: "Profile picture updated successfully!",
          });
        } else {
          const error = await response.json();
          toast({
            title: "Error",
            description: error.error || "Failed to update profile picture.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  const handleProfilePictureDelete = async () => {
    setIsUploading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/profile/picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setProfilePicture(null);
        
        // Update the user context with empty avatar
        if (user) {
          const updatedUser = {
            ...user,
            avatar_url: '',
          };
          // Update the user context using the setUser from the component scope
          setUser(updatedUser);
        }
        
        toast({
          title: "Success",
          description: "Profile picture removed successfully!",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to remove profile picture.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleProfilePictureFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProfilePictureUpload(e.target.files[0]);
    }
  };
  
  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information and preferences</p>
          </div>
        </div>

        {profile?.queries && profile.queries.length > 0 && profile.queries.length >= profile.max_queries_before_action && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have reached the maximum number of queries.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Add or update your profile picture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2 w-full max-w-xs">
                    <div className="flex space-x-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureFileInput}
                        className="hidden"
                        id="profile-picture-upload"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        disabled={isUploading}
                        onClick={() => document.getElementById('profile-picture-upload')?.click()}
                      >
                        {isUploading ? 'Uploading...' : profilePicture ? 'Change Picture' : 'Upload Picture'}
                      </Button>
                      
                      {profilePicture && (
                        <Button 
                          variant="destructive" 
                          onClick={handleProfilePictureDelete}
                          disabled={isUploading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Supported formats: JPG, PNG, GIF, WebP. Max size: 1MB.
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Recommended size: 400x400 pixels for best quality.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Profile Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your current profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Full Name</span>
                    <span className="text-sm font-medium text-foreground">{profile?.full_name || 'User Name'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm font-medium text-foreground break-all">{profile?.email || 'user@example.com'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="text-sm font-medium text-foreground">{profile?.department || 'No Department'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Role</span>
                    <span className="text-sm font-medium text-foreground">{profile?.role || 'No Role'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Staff Section */}
            <Card>
              <CardHeader>
                <CardTitle>Support Staff</CardTitle>
                <CardDescription>Your assigned support team members</CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.supportStaff ? (
                  profile.supportStaff.length > 0 ? (
                    <div className="space-y-3">
                      {profile.supportStaff.map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                              {(() => {
                                const names = staff.full_name.split(' ');
                                let initials = '';
                                if (names.length >= 2) {
                                  initials = (names[0][0] + names[1][0]).toUpperCase();
                                } else if (names.length === 1) {
                                  initials = names[0][0].toUpperCase();
                                } else {
                                  initials = '?';
                                }
                                return initials;
                              })()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{staff.full_name}</p>
                              <p className="text-xs text-muted-foreground">{staff.email}</p>
                              <p className="text-xs text-muted-foreground">{staff.department}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">You have no assigned support staff.</p>
                  )
                ) : (
                  <p className="text-muted-foreground">Loading support staff information...</p>
                )}
              </CardContent>
            </Card>
            {profile && profile.supportStaff && (
              <div>{/* Debug: Support staff array length: {profile.supportStaff.length} */}</div>
            )}

            {/* Inductions Section */}
            {profile?.inductions && profile.inductions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Scheduled Inductions
                  </CardTitle>
                  <CardDescription>Your upcoming induction sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.inductions.map((induction) => (
                      <div key={induction.id} className="flex flex-col p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{induction.department} Department</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(induction.induction_time).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="secondary">Scheduled</Badge>
                        </div>
                        {induction.attendee_names && induction.attendee_names.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground">Attendees:</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {induction.attendee_names.map((attendee) => (
                                <Badge key={attendee.id} variant="outline" className="text-xs">
                                  {attendee.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications - Full Width */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Certifications</CardTitle>
                  <CardDescription>Your professional certifications</CardDescription>
                </div>
                <Dialog open={isAddCertModalOpen} onOpenChange={setIsAddCertModalOpen}>
                  <DialogTrigger asChild>
                    <div className="relative group">
                      <Button size="sm" className="p-2">
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add</span>
                      </Button>
                      <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none z-50">
                        Add
                        <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-800"></div>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Certification</DialogTitle>
                      <DialogDescription>
                        Enter the details of your certification. It will be sent for approval.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cert-title">Title</Label>
                        <Input
                          id="cert-title"
                          placeholder="e.g., AWS Certified Solutions Architect"
                          value={newCert.title}
                          onChange={(e) => setNewCert({ ...newCert, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cert-issuer">Issuing Organization</Label>
                        <Input
                          id="cert-issuer"
                          placeholder="e.g., Amazon Web Services"
                          value={newCert.issuer}
                          onChange={(e) => setNewCert({ ...newCert, issuer: e.target.value })}
                        />
                      </div>

                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label>Certificate File (Optional)</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                          }`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Drag & drop your certificate file here, or click to browse
                          </p>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileInput}
                            className="hidden"
                            id="file-upload"
                          />
                          <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                            Choose File
                          </Label>
                          {newCert.file_data && (
                            <p className="text-xs text-green-600 mt-2">File uploaded successfully</p>
                          )}
                        </div>
                      </div>

                      {/* Certificate URL */}
                      <div className="space-y-2">
                        <Label htmlFor="cert-url">Certificate Verification URL (Optional)</Label>
                        <Input
                          id="cert-url"
                          placeholder="https://example.com/certificate/verification"
                          value={newCert.file_url}
                          onChange={(e) => setNewCert({ ...newCert, file_url: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Add a URL where this certificate can be verified online
                        </p>
                      </div>

                      {/* Expiry Section */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-expiry"
                            checked={newCert.has_expiry}
                            onCheckedChange={(checked) => setNewCert({ ...newCert, has_expiry: checked as boolean })}
                          />
                          <Label htmlFor="has-expiry" className="text-sm">This certificate has an expiry date</Label>
                        </div>
                        {newCert.has_expiry && (
                          <div className="space-y-2">
                            <Label htmlFor="cert-expiry">Expiry Date</Label>
                            <div className="relative">
                              <Input
                                id="cert-expiry"
                                type="date"
                                value={newCert.expiry_date}
                                onChange={(e) => setNewCert({ ...newCert, expiry_date: e.target.value })}
                                className="pr-10"
                              />
                              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={addCertification}
                      disabled={!newCert.title || !newCert.issuer}
                      className="w-full"
                    >
                      Submit for Approval
                    </Button>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {profile?.certifications && profile.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {profile.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cert.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cert.issuer}</p>
                          {cert.has_expiry && cert.expiry_date && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {/* Display verification URL if available */}
                          {cert.file_url && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(cert.file_url, '_blank')}
                                className="text-xs"
                              >
                                <Link className="h-3 w-3 mr-1" />
                                Verify Certificate
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant={cert.status === 'approved' ? 'default' : cert.status === 'rejected' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {cert.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {cert.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                            </Badge>
                          </div>
                          {cert.status === 'rejected' && cert.rejection_reason && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                              <p className="font-medium text-destructive">Rejection Reason:</p>
                              <p className="text-destructive/80">{cert.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {(cert.file_data || cert.file_url) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCertification(cert)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCertification(cert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-medium">No certifications</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get started by adding your first certification.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Queries Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Queries</CardTitle>
                  <CardDescription>View and manage queries sent by HR</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {profile?.queries && profile.queries.length > 0 ? (
                  <div className="space-y-3">
                    {profile.queries.map((query) => (
                      <div 
                        key={query.id} 
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => openQueryModal(query)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {query.query_type && (
                              <Badge variant="outline" className="text-xs">
                                {query.query_type}
                              </Badge>
                            )}
                            <span className="text-sm font-medium">{query.subject}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(query.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{query.description}</p>
                        {query.replies && query.replies.length > 0 && (
                          <div className="mt-2 flex items-center text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            <span>{query.replies.length} repl{query.replies.length === 1 ? 'y' : 'ies'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-medium">No queries received</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      HR has not sent you any queries yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Query Detail Modal */}
        <Dialog open={isQueryModalOpen} onOpenChange={setIsQueryModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuery?.subject}</DialogTitle>
              <DialogDescription>
                Sent on {selectedQuery?.created_at ? new Date(selectedQuery.created_at).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>
            
            {selectedQuery && (
              <div className="space-y-4">
                {selectedQuery.query_type && (
                  <Badge variant="outline">{selectedQuery.query_type}</Badge>
                )}
                
                <div>
                  <h4 className="font-medium text-sm mb-1">Description:</h4>
                  <p className="text-sm">{selectedQuery.description}</p>
                </div>
                
                {selectedQuery.resolution && (
                  <div className="p-2 bg-muted rounded">
                    <h4 className="font-medium text-sm mb-1">HR Response:</h4>
                    <p className="text-sm">{selectedQuery.resolution}</p>
                    {selectedQuery.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Responded on {new Date(selectedQuery.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Display query replies if any */}
                {selectedQuery.replies && selectedQuery.replies.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Replies:</h4>
                    {selectedQuery.replies.map((reply) => (
                      <div key={reply.id} className="p-2 bg-muted rounded">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{reply.replied_by_name}</span>
                          <span>{new Date(reply.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm mt-1">{reply.reply_text}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Reply form - only show if query is not locked and user hasn't replied yet */}
                {selectedQuery && !selectedQuery.is_locked && !(selectedQuery.current_user_has_replied ?? false) && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="reply-text">Your Reply</Label>
                    <Textarea
                      id="reply-text"
                      placeholder="Enter your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={submitReply}
                      disabled={!replyText.trim()}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                )}
                
                {/* Message when user has already replied */}
                {selectedQuery && !selectedQuery.is_locked && (selectedQuery.current_user_has_replied ?? false) && (
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    You have replied to this query. Please wait for an authorized person to respond in the Query Replies page.
                  </div>
                )}
                
                {selectedQuery && selectedQuery.is_locked && (
                  <div className="pt-2 border-t text-sm text-muted-foreground">
                    This is a locked query and does not accept replies.
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedCert?.title}</DialogTitle>
              <DialogDescription>
                Your certificate
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              {selectedCert?.file_data && selectedCert?.file_type ? (
                <img
                  src={`data:${selectedCert.file_type};base64,${selectedCert.file_data}`}
                  alt={selectedCert.title}
                  className="max-w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    // Removed console statement for production
                    e.currentTarget.style.display = 'none';
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Failed to load image';
                    errorMsg.className = 'text-red-500 text-center';
                    e.currentTarget.parentNode?.appendChild(errorMsg);
                  }}
                />
              ) : selectedCert?.file_url ? (
                <img
                  src={selectedCert.file_url}
                  alt={selectedCert.title}
                  className="max-w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    // Removed console statement for production
                    e.currentTarget.style.display = 'none';
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = 'Failed to load image from URL';
                    errorMsg.className = 'text-red-500 text-center';
                    e.currentTarget.parentNode?.appendChild(errorMsg);
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No image available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Removed QueryForm component as it's no longer needed