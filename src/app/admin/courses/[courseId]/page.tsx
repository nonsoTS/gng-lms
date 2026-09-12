import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { CourseEditor } from "./course-editor";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        orderBy: (modules) => [asc(modules.position)],
        with: {
          lessons: {
            orderBy: (lessons) => [asc(lessons.position)],
            with: {
              // Unfiltered — admins need to see draft assets too, unlike
              // the learner-facing query which only shows ready ones.
              assets: true,
            },
          },
        },
      },
    },
  });

  if (!course || course.deletedAt) {
    notFound();
  }

  return (
    <div>
      <Link href="/admin/courses" className="text-step-n1 text-muted hover:text-ink">
        ← Courses
      </Link>
      <div className="mt-2">
        <CourseEditor course={course} />
      </div>
    </div>
  );
}
