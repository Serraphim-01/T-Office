'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Plus, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface WikiTopic {
  id: number;
  department: string;
  topic: string;
  content: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export default function DepartmentWikiPage() {
  const params = useParams();
  const department = params.department as string;
  const { user } = useAuth();
  const [topics, setTopics] = useState<WikiTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, [department]);

  const fetchTopics = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${department}/topics`);
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentDisplayName = (dept: string) => {
    return dept.charAt(0).toUpperCase() + dept.slice(1);
  };

  const getDepartmentIcon = (dept: string) => {
    switch (dept) {
      case 'admin':
        return '⚙️';
      case 'hr':
        return '👥';
      case 'compliance':
        return '📋';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading topics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/resources/wiki">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Wiki
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getDepartmentIcon(department)}</span>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {getDepartmentDisplayName(department)} Wiki
                </h1>
                <p className="text-muted-foreground">
                  Knowledge base and documentation for the {getDepartmentDisplayName(department)} department
                </p>
              </div>
            </div>
          </div>
          {user?.department === 'admin' && (
            <Button asChild>
              <Link href="/resources/wiki/create">
                <Plus className="mr-2 h-4 w-4" />
                Add Topic
              </Link>
            </Button>
          )}
        </div>

        {/* Topics List */}
        {topics.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Card key={topic.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{topic.topic.replace(/-/g, ' ')}</span>
                    <Badge variant="secondary">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Topic
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(topic.updated_at).toLocaleDateString()}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/resources/wiki/${department}/${topic.topic}`}>
                        Read Topic
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Topics Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                This department doesn't have any wiki topics yet.
              </p>
              {user?.department === 'admin' && (
                <Button asChild>
                  <Link href="/resources/wiki/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Topic
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/resources/wiki">
                  Browse All Departments
                </Link>
              </Button>
              {user?.department === 'admin' && (
                <Button variant="outline" asChild>
                  <Link href="/resources/wiki/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Topic
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
