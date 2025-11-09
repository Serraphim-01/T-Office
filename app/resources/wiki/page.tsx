'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, FolderOpen } from 'lucide-react';
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

interface DepartmentTopics {
  [department: string]: string[];
}

export default function WikiPage() {
  const { user, hasFeatureAccess } = useAuth();
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentTopics, setDepartmentTopics] = useState<DepartmentTopics>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWikiData();
  }, []);

  const fetchWikiData = async () => {
    try {
      // Fetch departments
      const deptResponse = await fetch('http://localhost:4000/api/wiki/departments');
      const deptData = await deptResponse.json();
      setDepartments(deptData);

      // Fetch topics for each department
      const topicsData: DepartmentTopics = {};
      for (const dept of deptData) {
        try {
          const topicsResponse = await fetch(`http://localhost:4000/api/wiki/${dept}/topics`);
          if (topicsResponse.ok) {
            const topics = await topicsResponse.json();
            topicsData[dept] = topics.map((t: WikiTopic) => t.topic);
          } else {
            topicsData[dept] = [];
          }
        } catch (error) {
          console.error(`Error fetching topics for ${dept}:`, error);
          topicsData[dept] = [];
        }
      }
      setDepartmentTopics(topicsData);
    } catch (error) {
      console.error('Error fetching wiki data:', error);
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
          <div className="text-lg">Loading wiki...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Wiki</h1>
            <p className="text-muted-foreground">
              Department-specific knowledge base and documentation
            </p>
          </div>
          {user?.department === 'admin' && (
            <Button asChild>
              <Link href="/resources/wiki/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Wiki
              </Link>
            </Button>
          )}
        </div>

        {/* Departments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Card key={department} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{getDepartmentIcon(department)}</span>
                  {getDepartmentDisplayName(department)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentTopics[department]?.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        {departmentTopics[department].length} topics available
                      </div>
                      <div className="space-y-2">
                        {departmentTopics[department].slice(0, 3).map((topic) => (
                          <Link
                            key={`${department}-${topic}`}
                            href={`/resources/wiki/${department}/${topic}`}
                            className="block p-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="font-medium text-sm">{topic.charAt(0).toUpperCase() + topic.slice(1)}</div>
                          </Link>
                        ))}
                        {departmentTopics[department].length > 3 && (
                          <Link
                            href={`/resources/wiki/${department}`}
                            className="block p-2 rounded-lg hover:bg-muted transition-colors text-primary text-sm"
                          >
                            View all {departmentTopics[department].length} topics →
                          </Link>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      No topics yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        {user?.department === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/resources/wiki/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Topic
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
