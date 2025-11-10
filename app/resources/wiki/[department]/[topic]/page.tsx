'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, Edit, Trash2, CheckCircle, XCircle, Save, X, Plus, Bold, Italic, Underline, Type } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useUI } from '@/lib/ui-context';
import { useToast } from '@/hooks/use-toast';

interface QuestionProps {
  question: {
    id: number;
    question: string;
    options: string[];
    correct_answer: number;
  };
  questionIndex: number;
}

function QuestionCard({ question, questionIndex }: QuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswerSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmit = () => {
    setShowResult(true);
  };

  const isCorrect = selectedAnswer === question.correct_answer;

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">
        Question {questionIndex + 1}: {question.question}
      </h3>

      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedAnswer === index
                ? showResult
                  ? index === question.correct_answer
                    ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100'
                    : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-100'
                  : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-100'
                : showResult && index === question.correct_answer
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
            }`}
            disabled={showResult}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedAnswer === index
                  ? showResult
                    ? index === question.correct_answer
                      ? 'border-green-500 bg-green-500'
                      : 'border-red-500 bg-red-500'
                    : 'border-blue-500 bg-blue-500'
                  : showResult && index === question.correct_answer
                  ? 'border-green-500 bg-green-500'
                  : 'border-gray-300'
              }`}>
                {selectedAnswer === index && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <span>{option}</span>
              {showResult && index === question.correct_answer && (
                <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
              )}
              {showResult && selectedAnswer === index && index !== question.correct_answer && (
                <XCircle className="h-4 w-4 text-red-600 ml-auto" />
              )}
            </div>
          </button>
        ))}
      </div>

      {!showResult && selectedAnswer !== null && (
        <Button onClick={handleSubmit} className="w-full">
          Submit Answer
        </Button>
      )}

      {showResult && (
        <div className={`p-4 rounded-lg ${
          isCorrect ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700' : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${
              isCorrect ? 'text-green-800' : 'text-red-800'
            }`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          {!isCorrect && (
            <p className="text-sm text-gray-600 mt-2">
              The correct answer is: {question.options[question.correct_answer]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface WikiTopic {
  id: number;
  department: string;
  topic: string;
  content: string;
  questions: Array<{
    id: number;
    question: string;
    options: string[];
    correct_answer: number;
  }>;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export default function WikiLessonPage() {
  const params = useParams();
  const department = params.department as string;
  const topic = params.topic as string;
  const { user, hasFeatureAccess } = useAuth();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<WikiTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    topic: '',
    content: '',
    questions: [] as Array<{
      id?: number;
      question: string;
      options: string[];
      correct_answer: number;
    }>
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    fetchLesson();
  }, [department, topic]);

  const fetchLesson = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${department}/${topic}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data);
        // Initialize edit form data
        setEditFormData({
          topic: data.topic,
          content: data.content,
          questions: data.questions || []
        });
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data
    if (lesson) {
      setEditFormData({
        topic: lesson.topic,
        content: lesson.content,
        questions: lesson.questions || []
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.topic || !editFormData.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate questions
    for (let i = 0; i < editFormData.questions.length; i++) {
      const q = editFormData.questions[i];
      if (!q.question.trim() || q.options.length < 2 || q.correct_answer === undefined) {
        toast({
          title: "Validation Error",
          description: `Question ${i + 1} is incomplete. Each question needs text, at least 2 options, and a correct answer.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const response = await fetch(`http://localhost:4000/api/wiki/${department}/${topic}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: editFormData.content,
          questions: editFormData.questions
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Wiki topic updated successfully!",
        });
        setIsEditing(false);
        fetchLesson(); // Refresh the data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update wiki topic.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating wiki topic:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addQuestion = () => {
    setEditFormData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        question: '',
        options: ['', ''],
        correct_answer: 0
      }]
    }));
  };

  const removeQuestion = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const addOption = (questionIndex: number) => {
    setEditFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setEditFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) }
          : q
      )
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setEditFormData(prev => ({
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
    const selectedText = editFormData.content.substring(start, end);

    if (selectedText) {
      const beforeText = editFormData.content.substring(0, start);
      const afterText = editFormData.content.substring(end);
      const formattedText = `<${tag}>${selectedText}</${tag}>`;
      const newContent = beforeText + formattedText + afterText;

      setEditFormData(prev => ({ ...prev, content: newContent }));

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
    const selectedText = editFormData.content.substring(start, end);

    if (selectedText) {
      const beforeText = editFormData.content.substring(0, start);
      const afterText = editFormData.content.substring(end);
      const formattedText = `<span style="font-size: ${size};">${selectedText}</span>`;
      const newContent = beforeText + formattedText + afterText;

      setEditFormData(prev => ({ ...prev, content: newContent }));

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
      }, 0);
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
                <Badge variant="secondary" className="capitalize">
                  {lesson.department}
                </Badge>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(lesson.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          {hasFeatureAccess('Resources', 'wiki', 'edit') && (
            <div className="flex gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
              {hasFeatureAccess('Resources', 'wiki', 'delete') && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* Content Editor */}
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Content *</Label>
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
                      id="edit-content"
                      placeholder="Enter the wiki content..."
                      value={editFormData.content}
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
                    {editFormData.questions.length < 2 && (
                      <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    )}
                  </div>

                  {editFormData.questions.map((question, qIndex) => (
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
              </div>
            ) : (
              <div className="prose prose-slate dark:prose-invert max-w-none overflow-hidden break-words">
                <div dangerouslySetInnerHTML={{
                  __html: lesson.content.replace(/\n/g, '<br>')
                }} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        {lesson.questions && lesson.questions.length > 0 && !isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Knowledge Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {lesson.questions.map((question, qIndex) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  questionIndex={qIndex}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}