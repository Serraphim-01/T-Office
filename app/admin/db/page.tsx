'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { ChevronDown, ChevronRight, Database, Trash2 } from 'lucide-react';
import { AccessControlWrapper } from '@/components/access-control-wrapper';

interface Column {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface TableData {
  name: string;
  columns: Column[];
  records: any[];
}

export default function DatabasePage() {
  return (
    <AccessControlWrapper pagePath="admin/db">
      <DatabaseContent />
    </AccessControlWrapper>
  );
}

function DatabaseContent() {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const [deletingUser, setDeletingUser] = useState<number | null>(null);

  useEffect(() => {
    fetchTables();
  }, [user]);

  const fetchTables = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/admin/tables', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      const data = await response.json();
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all database records? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch('http://localhost:4000/api/admin/clear-db', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear database');
      }

      // Refresh the tables data
      await fetchTables();
      alert('Database cleared successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear database');
    } finally {
      setClearing(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setDeletingUser(userId);
    try {
      const response = await fetch(`http://localhost:4000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refresh the tables data
      await fetchTables();
      alert('User deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-lg">Loading database tables...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Tables
            </CardTitle>
            <CardDescription>
              View all database tables, their columns, and sample records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div></div>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearDatabase}
                disabled={clearing}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {clearing ? 'Clearing...' : 'Clear Database'}
              </Button>
            </div>
            <div className="space-y-4">
              {tables.map((table) => (
                <Card key={table.name} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTableExpansion(table.name)}
                      >
                        {expandedTables.has(table.name) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription>
                      {table.columns.length} columns • {table.records.length} sample records
                    </CardDescription>
                  </CardHeader>
                  {expandedTables.has(table.name) && (
                    <CardContent className="space-y-4">
                      {/* Columns */}
                      <div>
                        <h4 className="font-semibold mb-2">Columns</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {table.columns.map((column) => (
                            <div key={column.column_name} className="flex items-center gap-2 p-2 bg-muted rounded">
                              <span className="font-medium">{column.column_name}</span>
                              <Badge variant="secondary">{column.data_type}</Badge>
                              {column.is_nullable === 'YES' && (
                                <Badge variant="outline">Nullable</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Records */}
                      <div>
                        <h4 className="font-semibold mb-2">Sample Records</h4>
                        {table.records.length > 0 ? (
                          <div className="border rounded overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {table.columns.map((column) => (
                                    <TableHead key={column.column_name}>
                                      {column.column_name}
                                    </TableHead>
                                  ))}
                                  {table.name === 'users' && <TableHead>Actions</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {table.records.map((record, index) => (
                                  <TableRow key={index}>
                                    {table.columns.map((column) => (
                                      <TableCell key={column.column_name}>
                                        {record[column.column_name] !== null
                                          ? String(record[column.column_name])
                                          : <span className="text-muted-foreground">NULL</span>
                                        }
                                      </TableCell>
                                    ))}
                                    {table.name === 'users' && (
                                      <TableCell>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => deleteUser(record.id)}
                                          disabled={deletingUser === record.id}
                                          className="flex items-center gap-1"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                          {deletingUser === record.id ? 'Deleting...' : 'Delete'}
                                        </Button>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No records found</p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
