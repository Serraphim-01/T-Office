'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
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

export default function WikiLessonPage() {
  const params = useParams();
  const department = params.department as string;
  const topic = params.topic as string;
  const { user } = useAuth();

  const [lesson, setLesson] = useState<WikiTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLesson();
  }, [department, topic]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${department}/${topic}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
      } else {
        setError('Topic not found');
      }
    } catch (err) {
      setError('Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${department}/${topic}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        // Redirect to wiki index
        window.location.href = '/resources/wiki';
      } else {
        alert('Failed to delete topic');
      }
    } catch (err) {
      alert('Error deleting topic');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !lesson) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/resources/wiki">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Wiki
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                {error || 'Topic not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/resources/wiki">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Wiki
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {lesson.topic.charAt(0).toUpperCase() + lesson.topic.slice(1).replace(/-/g, ' ')}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {department.charAt(0).toUpperCase() + department.slice(1)} Department
                </div>
                <div>
                  Last updated: {new Date(lesson.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {user?.department === 'Admin' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/resources/wiki/${department}/${topic}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            <div
              className="prose prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check out other topics in the {department.charAt(0).toUpperCase() + department.slice(1)} department or explore other departments.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" asChild>
                <Link href={`/resources/wiki/${department}`}>
                  Browse {department.charAt(0).toUpperCase() + department.slice(1)} Topics
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/resources/wiki">
                  All Departments
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
// Note: generateStaticParams removed since we're now using dynamic data from the database
