import { notFound } from 'next/navigation';
import LessonClientPage from './lesson-client-page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const lessonData = [
  {
    id: 1,
    title: 'The Company Organogram',
    content: (
      <div>
        <p>The company organogram shows the structure of our organization and the relationships and relative ranks of its parts and positions/jobs.</p>
        <div className="mt-4 p-4 border rounded-lg">
          <h4 className="font-semibold text-center">CEO</h4>
          <div className="flex justify-around mt-4">
            <div className="text-center">
              <p className="font-semibold">Head of Engineering</p>
              <div className="mt-2 border-t pt-2">
                <p>Team Lead</p>
                <p>Senior Developer</p>
                <p>Junior Developer</p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">Head of Sales</p>
              <div className="mt-2 border-t pt-2">
                <p>Sales Manager</p>
                <p>Sales Representative</p>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold">Head of HR</p>
              <div className="mt-2 border-t pt-2">
                <p>HR Manager</p>
                <p>HR Specialist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'Organization Workflow',
    content: (
      <div>
        <p>Our organization follows a standard workflow for all projects.</p>
        <ol className="list-decimal list-inside mt-4 space-y-2">
          <li>Project Kick-off</li>
          <li>Requirement Gathering</li>
          <li>Design and Prototyping</li>
          <li>Development</li>
          <li>Quality Assurance</li>
          <li>Deployment</li>
          <li>Maintenance</li>
        </ol>
      </div>
    )
  },
  {
    id: 3,
    title: 'Departments and their Responsibilities',
    content: (
      <div>
        <p>Here is a breakdown of our departments and their core responsibilities.</p>
        <Accordion type="single" collapsible className="w-full mt-4">
          <AccordionItem value="item-1">
            <AccordionTrigger>Engineering</AccordionTrigger>
            <AccordionContent>
              The Engineering department is responsible for designing, building, and maintaining our software products.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Sales</AccordionTrigger>
            <AccordionContent>
              The Sales department is responsible for selling our products and services to customers.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Human Resources</AccordionTrigger>
            <AccordionContent>
              The Human Resources department is responsible for managing employee relations, recruitment, and benefits.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    )
  },
];

export async function generateStaticParams() {
  return lessonData.map((lesson) => ({
    lessonId: lesson.id.toString(),
  }));
}

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const lessonId = parseInt(params.lessonId, 10);
  const lesson = lessonData.find(l => l.id === lessonId);

  if (!lesson) {
    notFound();
  }

  const nextLessonId = lessonId < lessonData.length ? lessonId + 1 : null;

  return <LessonClientPage lesson={lesson} nextLessonId={nextLessonId} />;
}
