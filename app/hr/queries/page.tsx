'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

interface User {
  id: number;
  full_name: string;
  email: string;
  department: string;
}

interface Query {
  id: number;
  user_id: number;
  query_text: string;
  response?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function HRQueriesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newQuery, setNewQuery] = useState({ user_id: '', query_text: '' });

  useEffect(() => {
    if (user && (user.department === 'Admin' || user.department === 'HR')) {
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
        alert('Query sent successfully!');
        setNewQuery({ user_id: '', query_text: '' });
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        alert('Failed to send query');
      }
    } catch (error) {
      console.error('Error sending query:', error);
      alert('Error sending query');
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

  const updateQueryResponse = async (queryId: number, response: string, status: string) => {
    try {
      const updateResponse = await fetch(`http://localhost:4000/api/hr/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ response, status }),
      });

      if (updateResponse.ok) {
        alert('Query response updated successfully!');
        if (selectedUser) {
          fetchUserQueries(selectedUser.id);
        }
      } else {
        alert('Failed to update query response');
      }
    } catch (error) {
      console.error('Error updating query response:', error);
      alert('Error updating query response');
    }
  };

  if (!user || (user.department !== 'Admin' && user.department !== 'HR')) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">HR Queries</h1>
          <div className="text-sm text-muted-foreground">{user.department}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Send Query */}
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
                <Label htmlFor="query-text">Query Text</Label>
                <Textarea
                  id="query-text"
                  value={newQuery.query_text}
                  onChange={(e) => setNewQuery({ ...newQuery, query_text: e.target.value })}
                  placeholder="Enter your query..."
                />
              </div>
              <Button onClick={sendQuery} disabled={loading} className="w-full">
                {loading ? 'Sending...' : 'Send Query'}
              </Button>
            </CardContent>
          </Card>

          {/* Query History */}
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
                        <p className="text-sm"><strong>Query:</strong> {query.query_text}</p>
                        {query.response && (
                          <p className="text-sm"><strong>Response:</strong> {query.response}</p>
                        )}
                        {query.status === 'pending' && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Enter response..."
                              onBlur={(e) => {
                                if (e.target.value.trim()) {
                                  updateQueryResponse(query.id, e.target.value.trim(), 'responded');
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
