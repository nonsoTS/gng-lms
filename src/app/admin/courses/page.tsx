import { listCourses } from "@/lib/actions/courses";
import { CourseList } from "./course-list";

export default async function CoursesPage() {
  const courses = await listCourses();

  return (
    <div className="space-y-4">
      <h1 className="text-step-2 font-semibold text-ink">Courses</h1>
      <CourseList initialCourses={courses} />
    </div>
  );
}
