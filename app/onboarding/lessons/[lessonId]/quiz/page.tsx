import { notFound } from 'next/navigation';
import QuizClientPage from './quiz-client-page';

const quizData = [
  {
    lessonId: 1,
    questions: [
      { id: 1, text: 'Who is at the top of the company organogram?', options: ['Head of HR', 'CEO', 'Team Lead'], correctAnswer: 'CEO' },
      { id: 2, text: 'Which department does a Senior Developer belong to?', options: ['Sales', 'Engineering', 'HR'], correctAnswer: 'Engineering' },
    ],
  },
  {
    lessonId: 2,
    questions: [
      { id: 1, text: 'What is the first step in the project workflow?', options: ['Development', 'Deployment', 'Project Kick-off'], correctAnswer: 'Project Kick-off' },
      { id: 2, text: 'Which step comes after Development?', options: ['Quality Assurance', 'Design', 'Maintenance'], correctAnswer: 'Quality Assurance' },
    ],
  },
  {
    lessonId: 3,
    questions: [
      { id: 1, text: 'Which department is responsible for selling products?', options: ['Engineering', 'Sales', 'HR'], correctAnswer: 'Sales' },
      { id: 2, text: 'Which department manages employee relations?', options: ['HR', 'Sales', 'Engineering'], correctAnswer: 'HR' },
    ],
  },
];

export async function generateStaticParams() {
  return quizData.map((quiz) => ({
    lessonId: quiz.lessonId.toString(),
  }));
}

export default function QuizPage({ params }: { params: { lessonId: string } }) {
  const lessonId = parseInt(params.lessonId, 10);
  const quiz = quizData.find(q => q.lessonId === lessonId);

  if (!quiz) {
    notFound();
  }

  return <QuizClientPage quiz={quiz} lessonId={lessonId} />;
}
