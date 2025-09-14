'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, PlayCircle } from "lucide-react";
import Link from "next/link";

const initialLessons = [
  { id: 1, title: 'The Company Organogram', status: 'Not Started', score: null, total: null },
  { id: 2, title: 'Organization Workflow', status: 'Not Started', score: null, total: null },
  { id: 3, title: 'Departments and their Responsibilities', status: 'Not Started', score: null, total: null },
];

export default function OnboardingPage() {
  const [lessons, setLessons] = useState(initialLessons);

  useEffect(() => {
    const progress = JSON.parse(localStorage.getItem('onboarding-progress') || '{}');
    const updatedLessons = initialLessons.map(lesson => {
      if (progress[lesson.id]) {
        return { ...lesson, ...progress[lesson.id] };
      }
      return lesson;
    });
    setLessons(updatedLessons);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-muted-foreground">Welcome! Here are your onboarding lessons.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Onboarding Progress</CardTitle>
            <CardDescription>Complete all the lessons to finish your onboarding.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lessons.map(lesson => (
                <Card key={lesson.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {lesson.status === 'Completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-500 mr-4" />
                      ) : lesson.status === 'In Progress' ? (
                        <PlayCircle className="h-6 w-6 text-blue-500 mr-4" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 mr-4" />
                      )}
                      <div>
                        <h3 className="font-semibold">{`Lesson ${lesson.id}: ${lesson.title}`}</h3>
                        <p className="text-sm text-muted-foreground">
                          {lesson.status}
                          {lesson.status === 'Completed' && ` - Score: ${lesson.score}/${lesson.total}`}
                        </p>
                      </div>
                    </div>
                    <Link href={`/onboarding/lessons/${lesson.id}`}>
                      <Button variant="outline">
                        {lesson.status === 'Completed' ? 'Review' : lesson.status === 'In Progress' ? 'Continue' : 'Start'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
