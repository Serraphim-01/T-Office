'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Clock, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

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
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
                : showResult && index === question.correct_answer
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
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
          isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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
          {user?.department === 'Admin' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/resources/wiki/create?edit=${lesson.id}`}>
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
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        {lesson.questions && lesson.questions.length > 0 && (
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
