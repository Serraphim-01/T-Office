'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export default function CreateWikiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    department: '',
    topic: '',
    content: ''
  });

  useEffect(() => {
    // Check if user is admin
    if (user && user.department !== 'Admin') {
      router.push('/resources/wiki');
      return;
    }

    // Fetch available departments
    fetchDepartments();
  }, [user, router]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/wiki/departments');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.department || !formData.topic || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${formData.department}/${formData.topic}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: formData.content
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Wiki topic created successfully!",
        });
        router.push(`/resources/wiki/${formData.department}/${formData.topic}`);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create wiki topic.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating wiki topic:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (user?.department !== 'Admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/resources/wiki">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Wiki
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Wiki Topic</h1>
            <p className="text-muted-foreground">
              Add new knowledge base content for a department
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Department Selection */}
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleInputChange('department', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept.charAt(0).toUpperCase() + dept.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Name */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic Name *</Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., introduction, onboarding, features"
                  value={formData.topic}
                  onChange={(e) => handleInputChange('topic', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use lowercase letters, numbers, and hyphens only. Spaces will be converted to hyphens.
                </p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Enter the wiki content as plain text..."
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  rows={20}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter your content as normal text. You can paste images directly into the text box.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Topic
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/resources/wiki">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        {formData.content && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}