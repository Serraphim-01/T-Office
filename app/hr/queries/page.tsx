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
import { Checkbox } from '@/components/ui/checkbox'; // Added missing import
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
  query_type?: string;
  replies?: QueryReply[];
  user_name?: string; // For query replies section
}

interface QueryReply {
  id: number;
  query_id: number;
  reply_text: string;
  replied_by: number;
  replied_by_name: string;
  created_at: string;
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
  const [queryReplies, setQueryReplies] = useState<Query[]>([]); // New state for query replies
  const [canSendQuery, setCanSendQuery] = useState(false);
  const [queryTypes, setQueryTypes] = useState<string[]>([]); // Added for query types

  // Form states
  const [newQuery, setNewQuery] = useState({ 
    user_id: '', 
    subject: '', 
    description: '', 
    query_type: '',
    is_locked: false // Added for locked queries
  }); // Added query_type
  const [replyText, setReplyText] = useState(''); // For reply input
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null); // For tracking which query is being replied to
  const [isLockedReply, setIsLockedReply] = useState(false); // For locking reply

  // Check feature access when user loads
  useEffect(() => {
    if (user) {
      checkFeatureAccess();
      fetchQueryTypes(); // Fetch query types on component mount
    }
  }, [user]);

  // Added function to fetch query types
  const fetchQueryTypes = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/profile/query-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueryTypes(data);
      }
    } catch (error) {
      console.error('Failed to fetch query types:', error);
    }
  };

  const checkFeatureAccess = async () => {
    if (!user) return;
    
    // Check access to HR queries page
    const queriesAccess = await hasPageAccess(user.id, 'hr/queries');
    
    if (!queriesAccess) {
      // If no access to HR queries page, disable all features
      setCanSendQuery(false);
      return;
    }
    
    // Check access to specific HR queries features
    const sendQueryAccess = await hasPageAccess(user.id, 'hr/queries/send-query');
    
    setCanSendQuery(sendQueryAccess);
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchQueryReplies(); // Fetch query replies on component mount
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
        setNewQuery({ 
          user_id: '', 
          subject: '', 
          description: '', 
          query_type: '',
          is_locked: false
        }); // Reset form
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

  // Fetch all query replies (for the new Query Replies tab)
  const fetchQueryReplies = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/hr/queries-replies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueryReplies(data);
      }
    } catch (error) {
      console.error('Failed to fetch query replies:', error);
    }
  };

  // Reply to a query
  const replyToQuery = async (queryId: number, replyText: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/hr/queries/${queryId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reply_text: replyText, is_locked: isLockedReply }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Reply sent successfully!",
        });
        setReplyText('');
        setSelectedQueryId(null);
        setIsLockedReply(false); // Reset locked state
        // Refresh the queries and replies
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
        fetchQueryReplies();
      } else {
        toast({
          title: "Error",
          description: "Failed to send reply",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Error sending reply",
        variant: "destructive",
      });
    }
  };

  // Delete a query
  const deleteQuery = async (queryId: number) => {
    if (!confirm('Are you sure you want to delete this query?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/hr/queries/${queryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Query deleted successfully!",
        });
        // Refresh the queries and replies
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
        fetchQueryReplies();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete query",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting query:', error);
      toast({
        title: "Error",
        description: "Error deleting query",
        variant: "destructive",
      });
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

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send">Send Query</TabsTrigger>
            <TabsTrigger value="history">Query History</TabsTrigger>
            <TabsTrigger value="replies">Query Replies</TabsTrigger>
          </TabsList>
          
          {/* Send Query Tab */}
          <TabsContent value="send">
            <div className="grid grid-cols-1 gap-6">
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
                      <Label htmlFor="query-type">Query Type</Label>
                      <Select value={newQuery.query_type} onValueChange={(value) => setNewQuery({ ...newQuery, query_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select query type" />
                        </SelectTrigger>
                        <SelectContent>
                          {queryTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="query-locked"
                        checked={newQuery.is_locked}
                        onCheckedChange={(checked: boolean) => setNewQuery({ ...newQuery, is_locked: checked })}
                      />
                      <Label htmlFor="query-locked">Locked Query (No Replies)</Label>
                    </div>
                    <Button onClick={sendQuery} disabled={loading} className="w-full">
                      {loading ? 'Sending...' : 'Send Query'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* Query History Tab */}
          <TabsContent value="history">
            <div className="grid grid-cols-1 gap-6">
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
                            {query.query_type && (
                              <Badge variant="outline" className="text-xs">
                                {query.query_type}
                              </Badge>
                            )}
                            <p className="text-sm"><strong>Subject:</strong> {query.subject}</p>
                            <p className="text-sm"><strong>Description:</strong> {query.description}</p>
                            {query.resolution && (
                              <p className="text-sm"><strong>Resolution:</strong> {query.resolution}</p>
                            )}
                            
                            {/* Display query replies if any */}
                            {query.replies && query.replies.length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded">
                                <h4 className="font-medium text-sm mb-2">Replies:</h4>
                                {query.replies.map((reply) => (
                                  <div key={reply.id} className="mb-2 last:mb-0">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium">{reply.replied_by_name}</span>
                                      <span>{new Date(reply.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm mt-1">{reply.reply_text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Reply form for pending queries */}
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
                            
                            {/* Reply form for replied queries */}
                            {query.status === 'replied' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      setSelectedQueryId(query.id);
                                    }}
                                  >
                                    Respond to Reply
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => deleteQuery(query.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {selectedQueryId === query.id && (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      placeholder="Enter your response..."
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                    />
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="reply-locked-history"
                                        checked={isLockedReply}
                                        onCheckedChange={(checked: boolean) => setIsLockedReply(checked)}
                                      />
                                      <Label htmlFor="reply-locked-history">Lock Query (No Further Replies)</Label>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => replyToQuery(query.id, replyText)}
                                        disabled={!replyText.trim()}
                                      >
                                        Send Reply
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedQueryId(null);
                                          setReplyText('');
                                          setIsLockedReply(false);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
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
          </TabsContent>
          
          {/* Query Replies Tab */}
          <TabsContent value="replies">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Query Replies
                  </CardTitle>
                  <CardDescription>All queries that have received replies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {queryReplies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No query replies found</p>
                    ) : (
                      queryReplies.map((query) => (
                        <div key={query.id} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant={query.status === 'pending' ? 'secondary' : 'default'}>
                                {query.status}
                              </Badge>
                              <span className="ml-2 text-sm font-medium">{query.user_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(query.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {query.query_type && (
                            <Badge variant="outline" className="text-xs">
                              {query.query_type}
                            </Badge>
                          )}
                          <p className="text-sm"><strong>Subject:</strong> {query.subject}</p>
                          <p className="text-sm"><strong>Description:</strong> {query.description}</p>
                          
                          {/* Display query replies */}
                          {query.replies && query.replies.length > 0 && (
                            <div className="mt-2 p-2 bg-muted rounded">
                              <h4 className="font-medium text-sm mb-2">Replies:</h4>
                              {query.replies.map((reply) => (
                                <div key={reply.id} className="mb-2 last:mb-0">
                                  <div className="flex justify-between text-xs">
                                    <span className="font-medium">{reply.replied_by_name}</span>
                                    <span>{new Date(reply.created_at).toLocaleString()}</span>
                                  </div>
                                  <p className="text-sm mt-1">{reply.reply_text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedQueryId(query.id);
                              }}
                            >
                              Respond
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteQuery(query.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {selectedQueryId === query.id && (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                placeholder="Enter your response..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="reply-locked"
                                  checked={isLockedReply}
                                  onCheckedChange={(checked: boolean) => setIsLockedReply(checked)}
                                />
                                <Label htmlFor="reply-locked">Lock Query (No Further Replies)</Label>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => replyToQuery(query.id, replyText)}
                                  disabled={!replyText.trim()}
                                >
                                  Send Reply
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedQueryId(null);
                                    setReplyText('');
                                    setIsLockedReply(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
