'use client';

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LessonClientPage({ lesson, nextLessonId }: { lesson: any, nextLessonId: number | null }) {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{`Lesson ${lesson.id}: ${lesson.title}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {lesson.content}
            <div className="mt-8 flex justify-between">
              {nextLessonId ? (
                <Link href={`/onboarding/lessons/${nextLessonId}`}>
                  <Button>Next Lesson</Button>
                </Link>
              ) : (
                <div />
              )}
              <Link href={`/onboarding/lessons/${lesson.id}/quiz`}>
                <Button variant="outline">Take Quiz</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
