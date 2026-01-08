'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, Edit, Trash2, CheckCircle, XCircle, Save, X, Plus, Bold, Italic, Underline, Type, ChevronRight } from 'lucide-react';
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

function QuestionCard({ question, questionIndex, onAllCorrect }: QuestionProps & { onAllCorrect?: () => void }) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswerSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmit = () => {
    setShowResult(true);
    if (selectedAnswer === question.correct_answer && onAllCorrect) {
      onAllCorrect();
    }
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
  video_url: string | null;
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

interface CompletionStatus {
  completed: boolean;
  completed_at: string | null;
}

interface NextLesson {
  department: string;
  topic: string;
  id: number;
}

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  user_name: string;
}

const getYouTubeVideoId = (url: string) => {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^"&?\/\s]{11})/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^"&?\/\s]{11})/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

const getVimeoVideoId = (url: string) => {
  const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

export default function WikiLessonPage() {
  const params = useParams();
  const department = params.department as string;
  const topic = params.topic as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<WikiTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [nextLesson, setNextLesson] = useState<NextLesson | null>(null);
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
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    fetchLesson();
    fetchCompletionStatus();
    fetchNextLesson();
    fetchComments();
  }, [department, topic]);

  const fetchLesson = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}`);
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

  const fetchCompletionStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}/completion`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompletionStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch completion status:', err);
    }
  };

  const fetchNextLesson = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}/next`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNextLesson(data.next_lesson);
      }
    } catch (err) {
      console.error('Failed to fetch next lesson:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error('Failed to fetch comments:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (response.ok) {
        const newComment = await response.json();
        // Ensure the new comment includes user_name for display
        const commentWithUser = {
          ...newComment,
          user_name: user?.full_name || 'Anonymous User'
        };
        setComments(prev => [commentWithUser, ...prev]);
        setComment('');
        toast({
          title: "Success",
          description: "Comment added successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add comment.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const markLessonCompleted = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}/completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompletionStatus({
          completed: data.completed,
          completed_at: data.completed_at
        });
        // Refresh next lesson in case completion affects it
        fetchNextLesson();
      }
    } catch (err) {
      console.error('Failed to mark lesson as completed:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}`, {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wiki/${department}/${topic}`, {
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

  const handleLinkClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        // Check if it's a lesson link
        if (href.startsWith('/resources/wiki/')) {
          const pathParts = href.split('/');
          if (pathParts.length >= 5) {
            const linkDepartment = pathParts[3];
            const linkTopic = pathParts[4];

            // Check if the linked lesson is completed
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
              const response = await fetch(`${apiUrl}/api/wiki/${linkDepartment}/${linkTopic}/completion`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
              });
              if (response.ok) {
                const data = await response.json();
                if (data.completed) {
                  // Allow navigation to completed lesson
                  window.location.href = href;
                } else {
                  // Show message that lesson must be completed first
                  toast({
                    title: "Lesson Locked",
                    description: "You must complete this lesson before accessing the linked content.",
                    variant: "destructive",
                  });
                }
              } else {
                // If we can't check completion, allow navigation
                window.location.href = href;
              }
            } catch (error) {
              console.error('Error checking lesson completion:', error);
              // Allow navigation on error
              window.location.href = href;
            }
          } else {
            // Not a valid lesson path, treat as external link
            window.open(href, '_blank');
          }
        } else {
          // External link
          window.open(href, '_blank');
        }
      }
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
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            {/* Video Content */}
            {lesson.video_url && !isEditing && (
              <div className="space-y-4 mb-6">
                <Label className="text-lg font-semibold">Video Content</Label>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
                  {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(lesson.video_url)}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Video Content"
                    />
                  ) : lesson.video_url.includes('vimeo.com') ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${getVimeoVideoId(lesson.video_url)}`}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Video Content"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <a
                          href={lesson.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                          </svg>
                          Watch Video
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <style jsx>{`
                  .wiki-link {
                    text-decoration: underline;
                    text-decoration-color: currentColor;
                    text-underline-offset: 2px;
                    animation: fadeUnderline 3s ease-in-out infinite;
                  }

                  @keyframes fadeUnderline {
                    0%, 100% {
                      text-decoration-color: currentColor;
                      opacity: 1;
                    }
                    50% {
                      text-decoration-color: transparent;
                      opacity: 0.6;
                    }
                  }

                  .wiki-link:hover {
                    text-decoration-color: currentColor;
                    opacity: 1;
                    animation-play-state: paused;
                  }
                `}</style>
                <div
                  dangerouslySetInnerHTML={{
                    __html: lesson.content.replace(/\n/g, '<br>').replace(
                      /<a /g,
                      '<a class="wiki-link" '
                    )
                  }}
                  onClick={(e) => handleLinkClick(e)}
                />
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
                  onAllCorrect={() => {
                    // For simplicity, mark lesson as completed when user answers a question correctly
                    // In a more complex implementation, you could track all answers and require all correct
                    if (!completionStatus?.completed) {
                      markLessonCompleted();
                    }
                  }}
                />
              ))}

              {/* Completion Status and Next Lesson */}
              {completionStatus && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {completionStatus.completed ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            Lesson Completed!
                          </span>
                          {completionStatus.completed_at && (
                            <span className="text-sm text-muted-foreground">
                              on {new Date(completionStatus.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-orange-800 dark:text-orange-200">
                            Complete the questions to finish this lesson
                          </span>
                        </>
                      )}
                    </div>

                    {completionStatus.completed && nextLesson && (
                      <Button asChild>
                        <Link href={`/resources/wiki/${nextLesson.department}/${nextLesson.topic}`}>
                          Next Lesson: {nextLesson.topic.replace(/-/g, ' ').charAt(0).toUpperCase() + nextLesson.topic.replace(/-/g, ' ').slice(1)}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion Section for Lessons without Questions */}
        {(!lesson.questions || lesson.questions.length === 0) && !isEditing && completionStatus && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {completionStatus.completed ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">
                        Lesson Completed!
                      </span>
                      {completionStatus.completed_at && (
                        <span className="text-sm text-muted-foreground">
                          on {new Date(completionStatus.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">
                        Ready to complete this lesson?
                      </span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {!completionStatus.completed && (
                    <Button onClick={markLessonCompleted} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Lesson
                    </Button>
                  )}

                  {completionStatus.completed && nextLesson && (
                    <Button asChild>
                      <Link href={`/resources/wiki/${nextLesson.department}/${nextLesson.topic}`}>
                        Next Lesson: {nextLesson.topic.replace(/-/g, ' ').charAt(0).toUpperCase() + nextLesson.topic.replace(/-/g, ' ').slice(1)}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section - Only show input box and button, not the comments themselves */}
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>Share your thoughts about this lesson</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <Textarea
                placeholder="Impression about this lesson and whether they would like to have physical inductions regarding this topic."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!comment.trim()}>
                  Add Comment
                </Button>
              </div>
            </form>

            {/* Hide all comments - don't display them */}
            {/*
            {comments.length > 0 ? (
              <div className="space-y-4 mt-6">
                {comments.map((c) => (
                  <div key={c.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{c.user_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="mt-2 text-muted-foreground">{c.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
            */}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
