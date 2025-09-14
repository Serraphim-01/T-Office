'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function QuizClientPage({ quiz, lessonId }: { quiz: any, lessonId: number }) {
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    let newScore = 0;
    quiz.questions.forEach((q: any) => {
      if (answers[q.id] === q.correctAnswer) {
        newScore++;
      }
    });
    setScore(newScore);
    setSubmitted(true);
  };

  useEffect(() => {
    if (submitted) {
      const progress = JSON.parse(localStorage.getItem('onboarding-progress') || '{}');
      progress[lessonId] = {
        status: 'Completed',
        score: score,
        total: quiz?.questions.length,
      };
      localStorage.setItem('onboarding-progress', JSON.stringify(progress));
    }
  }, [submitted, lessonId, score, quiz?.questions.length]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{`Quiz for Lesson ${lessonId}`}</CardTitle>
            <CardDescription>Test your knowledge from the lesson.</CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <div className="space-y-6">
                {quiz.questions.map((q: any) => (
                  <div key={q.id}>
                    <p className="font-semibold">{q.text}</p>
                    <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, value)} className="mt-2 space-y-1">
                      {q.options.map((option: string) => (
                        <div key={option} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`q${q.id}-${option}`} />
                          <Label htmlFor={`q${q.id}-${option}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
                <Button onClick={handleSubmit}>Submit Quiz</Button>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold">Quiz Complete!</h2>
                <p className="text-lg mt-2">Your score: {score} / {quiz.questions.length}</p>
                <Link href="/onboarding" className="mt-4 inline-block">
                  <Button>Back to Onboarding</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
