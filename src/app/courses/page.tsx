import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessons, modules, progress } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { getSignedR2Url } from "@/lib/r2";

export default async function CoursesPage() {
  const session = await requireSession();

  const publishedCourses = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageKey: courses.coverImageKey,
      lessonCount: count(lessons.id),
      completedCount: count(progress.id),
    })
    .from(courses)
    .leftJoin(modules, eq(modules.courseId, courses.id))
    .leftJoin(
      lessons,
      and(eq(lessons.moduleId, modules.id), eq(lessons.status, "published")),
    )
    .leftJoin(
      progress,
      and(
        eq(progress.lessonId, lessons.id),
        eq(progress.userId, session.user.id),
        eq(progress.completed, true),
      ),
    )
    .where(and(eq(courses.status, "published"), isNull(courses.deletedAt)))
    .groupBy(courses.id)
    .orderBy(asc(courses.position));

  // No admin UI or script populates coverImageKey yet — signing only
  // happens for the (currently nonexistent) courses that have one.
  const coursesWithCovers = await Promise.all(
    publishedCourses.map(async (course) => ({
      ...course,
      coverUrl: course.coverImageKey ? await getSignedR2Url(course.coverImageKey) : null,
    })),
  );

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-step-3 font-serif font-semibold text-ink">Courses</h1>
        {session.user.role === "admin" && (
          <Link href="/admin" className="text-step-0 text-primary hover:underline">
            Admin
          </Link>
        )}
      </div>

      {coursesWithCovers.length === 0 && (
        <p className="text-step-0 text-muted">No courses published yet.</p>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {coursesWithCovers.map((course) => {
          const started = course.completedCount > 0;
          const done = course.lessonCount > 0 && course.completedCount === course.lessonCount;
          const fraction = course.lessonCount > 0 ? course.completedCount / course.lessonCount : 0;

          const borderClass = done ? "border-success" : started ? "border-primary" : "border-line";
          const fillClass = done ? "bg-success" : "bg-primary";

          return (
            <li key={course.id}>
              <Link
                href={`/courses/${course.slug}`}
                className={`block rounded-card border bg-paper p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${borderClass}`}
              >
                <div className="flex aspect-[2/1] items-center justify-center overflow-hidden rounded-control bg-surface">
                  {course.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static asset
                    <img
                      src={course.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-step-4 text-primary" aria-hidden>
                      {course.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <h2 className="text-step-1 font-medium text-ink">{course.title}</h2>
                  {done && (
                    <span className="rounded-control bg-success px-1.5 py-0.5 text-step-n1 font-medium text-white">
                      Complete
                    </span>
                  )}
                </div>
                {course.description && (
                  <p className="mt-1 text-step-0 text-muted">{course.description}</p>
                )}

                <p className="mt-3 text-step-n1 text-muted">
                  {course.lessonCount === 0
                    ? "No lessons yet"
                    : `${course.completedCount} of ${course.lessonCount} ${course.lessonCount === 1 ? "lesson" : "lessons"}`}
                </p>
                {started && course.lessonCount > 0 && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${fillClass}`}
                      style={{ width: `${Math.round(fraction * 100)}%` }}
                    />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
