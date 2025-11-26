'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, UserPlus, Users, FileText, MessageSquare, Clock, Plus, XCircle, Trash2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { hasPageAccess } from '@/lib/page-access';
import { fetchDepartments } from '@/lib/departments';
import { useToast } from '@/hooks/use-toast';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  certifications?: any[];
  cv?: string;
  portfolio?: string;
  job_description?: string;
  contract?: string;
  query_count?: number;
  attendance?: any[];
  other_details?: any;
}

interface Query {
  id: number;
  user_id: number;
  subject: string;
  description: string;
  resolution?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function HRQueriesPage() {
  return (
    <AccessControlWrapper pagePath="hr/queries">
      <HRQueriesContent />
    </AccessControlWrapper>
  );
}

function HRQueriesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [canSendQuery, setCanSendQuery] = useState(false);

  // Form states
  const [newQuery, setNewQuery] = useState({ user_id: '', subject: '', description: '' });

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
    }
  }, [user]);

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to HR queries page
    const queriesAccess = await hasPageAccess(user, 'hr/queries');
    
    if (!queriesAccess) {
      // If no access to HR queries page, disable all features
      setCanSendQuery(false);
      return;
    }
    
    // Check access to specific HR queries features
    const sendQueryAccess = await hasPageAccess(user, 'hr/queries/send-query');
    
    setCanSendQuery(sendQueryAccess);
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/hr/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users - Status:', response.status, 'Response:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const sendQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/hr/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newQuery),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Query sent successfully!",
        });
        setNewQuery({ user_id: '', subject: '', description: '' });
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to send query",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending query:', error);
      toast({
        title: "Error",
        description: "Error sending query",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const fetchUserQueries = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/queries/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueries(data);
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error);
    }
  };

  const updateQueryResolution = async (queryId: number, resolution: string, status: string) => {
    try {
      const updateResponse = await fetch(`http://localhost:4000/api/hr/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ resolution, status }),
      });

      if (updateResponse.ok) {
        toast({
          title: "Success",
          description: "Query resolution updated successfully!",
        });
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update query resolution",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating query resolution:', error);
      toast({
        title: "Error",
        description: "Error updating query resolution",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Please Log In</h1>
          <p>You need to be logged in to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">HR Queries</h1>
          <div className="text-sm text-muted-foreground">{user?.department}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Send Query - Only show if user has send query access */}
          {canSendQuery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Send Query
                </CardTitle>
                <CardDescription>Send a query to a user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query-user">Select User</Label>
                  <Select value={newQuery.user_id} onValueChange={(value) => setNewQuery({ ...newQuery, user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query-subject">Query Subject</Label>
                  <Input
                    id="query-subject"
                    value={newQuery.subject}
                    onChange={(e) => setNewQuery({ ...newQuery, subject: e.target.value })}
                    placeholder="Enter query subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query-description">Query Description</Label>
                  <Textarea
                    id="query-description"
                    value={newQuery.description}
                    onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                    placeholder="Enter query description..."
                  />
                </div>
                <Button onClick={sendQuery} disabled={loading} className="w-full">
                  {loading ? 'Sending...' : 'Send Query'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Query History - Always show if user has access to queries page */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Query History
              </CardTitle>
              <CardDescription>View queries for selected user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Select User to View Queries</Label>
                <Select onValueChange={(value) => {
                  const userId = parseInt(value);
                  setSelectedUser(users.find(u => u.id === userId) || null);
                  fetchUserQueries(userId);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Queries for {selectedUser.full_name}</h4>
                  {queries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No queries found</p>
                  ) : (
                    queries.map((query) => (
                      <div key={query.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={query.status === 'pending' ? 'secondary' : 'default'}>
                            {query.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(query.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm"><strong>Subject:</strong> {query.subject}</p>
                        <p className="text-sm"><strong>Description:</strong> {query.description}</p>
                        {query.resolution && (
                          <p className="text-sm"><strong>Resolution:</strong> {query.resolution}</p>
                        )}
                        {query.status === 'pending' && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Enter response..."
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  updateQueryResolution(query.id, e.target.value.trim(), 'responded');
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}