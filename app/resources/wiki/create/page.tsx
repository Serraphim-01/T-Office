'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../../components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Bold, Italic, Underline, Type } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useUI } from '@/lib/ui-context';
import { useToast } from '@/hooks/use-toast';

export default function CreateWikiPage() {
  const { user, hasFeatureAccess } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    department: '',
    topic: '',
    content: '',
    questions: [] as Array<{
      question: string;
      options: string[];
      correct_answer: number;
    }>
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check if user has create access
    if (user && !hasFeatureAccess('Resources', 'wiki', 'create')) {
      router.push('/resources/wiki');
      return;
    }

    // Fetch available departments
    fetchDepartments();
  }, [user, router, hasFeatureAccess]);

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

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim() || q.options.length < 2 || q.correct_answer === undefined) {
        toast({
          title: "Validation Error",
          description: `Question ${i + 1} is incomplete. Each question needs text, at least 2 options, and a correct answer.`,
          variant: "destructive",
        });
        return;
      }
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
          content: formData.content,
          questions: formData.questions
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

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        question: '',
        options: ['', ''],
        correct_answer: 0
      }]
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) }
          : q
      )
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, j) => j === optionIndex ? value : opt)
            }
          : q
      )
    }));
  };

  const applyFormatting = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);

    if (selectedText) {
      const beforeText = formData.content.substring(0, start);
      const afterText = formData.content.substring(end);
      const formattedText = `<${tag}>${selectedText}</${tag}>`;
      const newContent = beforeText + formattedText + afterText;

      setFormData(prev => ({ ...prev, content: newContent }));

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
      }, 0);
    }
  };

  const applyFontSize = (size: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);

    if (selectedText) {
      const beforeText = formData.content.substring(0, start);
      const afterText = formData.content.substring(end);
      const formattedText = `<span style="font-size: ${size};">${selectedText}</span>`;
      const newContent = beforeText + formattedText + afterText;

      setFormData(prev => ({ ...prev, content: newContent }));

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
      }, 0);
    }
  };



  if (!hasFeatureAccess('Resources', 'wiki', 'create')) {
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
                  onChange={(e) => handleInputChange('topic', e.target.value.replace(/\s+/g, '-'))}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use letters (upper or lowercase), numbers, and hyphens only. Spaces will be converted to hyphens.
                </p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <div className="border rounded-md">
                  <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFormatting('b')}
                      className="h-8 w-8 p-0"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFormatting('i')}
                      className="h-8 w-8 p-0"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyFormatting('u')}
                      className="h-8 w-8 p-0"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <Select onValueChange={applyFontSize}>
                      <SelectTrigger className="h-8 w-24">
                        <Type className="h-4 w-4 mr-1" />
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12px">Small</SelectItem>
                        <SelectItem value="16px">Normal</SelectItem>
                        <SelectItem value="20px">Large</SelectItem>
                        <SelectItem value="24px">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>

                  </div>
                  <Textarea
                    ref={textareaRef}
                    id="content"
                    placeholder="Enter the wiki content..."
                    value={formData.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('content', e.target.value)}
                    rows={20}
                    className="border-0 rounded-none focus-visible:ring-0"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  You can use HTML tags for formatting (e.g., &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;).
                </p>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Multiple Choice Questions (Max 2)</Label>
                  {formData.questions.length < 2 && (
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  )}
                </div>

                {formData.questions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Question {qIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Enter your question..."
                        value={question.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        rows={2}
                      />

                      <div className="space-y-2">
                        <Label>Options</Label>
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correct_answer === oIndex}
                              onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                            />
                            <Input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              className="flex-1"
                            />
                            {question.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(qIndex, oIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {question.options.length < 4 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
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
                dangerouslySetInnerHTML={{
                  __html: formData.content.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}