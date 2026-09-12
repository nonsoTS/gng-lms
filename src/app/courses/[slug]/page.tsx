import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessons, modules, progress as progressTable } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

const FORMAT_ORDER = ["video", "slides", "text"] as const;
const FORMAT_LETTER: Record<(typeof FORMAT_ORDER)[number], string> = {
  video: "W",
  slides: "S",
  text: "R",
};
const FORMAT_LABEL: Record<(typeof FORMAT_ORDER)[number], string> = {
  video: "Watch",
  slides: "Slides",
  text: "Read & Listen",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;

  const course = await db.query.courses.findFirst({
    where: and(
      eq(courses.slug, slug),
      eq(courses.status, "published"),
      isNull(courses.deletedAt),
    ),
    with: {
      modules: {
        orderBy: (modules) => [asc(modules.position)],
        with: {
          lessons: {
            where: (lessons, { eq }) => eq(lessons.status, "published"),
            orderBy: (lessons) => [asc(lessons.position)],
            with: {
              assets: {
                where: (assets, { eq }) => eq(assets.status, "ready"),
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // All of this user's progress rows for the course, not just completed
  // ones — DESIGN.md §4 needs a distinct "in progress" state (a row exists,
  // completed=false), which a completed-only query can't tell apart from
  // "untouched" (no row at all).
  const progressRows = await db
    .select({ lessonId: progressTable.lessonId, completed: progressTable.completed })
    .from(progressTable)
    .innerJoin(lessons, eq(lessons.id, progressTable.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(
      and(eq(modules.courseId, course.id), eq(progressTable.userId, session.user.id)),
    );
  const progressByLesson = new Map(progressRows.map((r) => [r.lessonId, r.completed]));

  // Only lessons with a ready asset are actually reachable — a lesson with
  // none would deep-link into a 404 (same guard as Phase 5's "next lesson").
  const viewableLessons = course.modules.flatMap((m) => m.lessons).filter((l) => l.assets.length > 0);
  const firstIncomplete = viewableLessons.find((l) => !progressByLesson.get(l.id));
  const startLesson = firstIncomplete ?? viewableLessons[0];
  const startLabel = !viewableLessons.some((l) => progressByLesson.get(l.id))
    ? "Start course"
    : firstIncomplete
      ? "Continue"
      : "Review from start";

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-8">
      <Link href="/courses" className="text-step-n1 text-muted hover:text-ink">
        ← Courses
      </Link>
      <h1 className="mt-2 text-step-3 font-serif font-semibold text-ink">{course.title}</h1>
      {course.description && <p className="mt-1 text-step-0 text-muted">{course.description}</p>}

      {startLesson && (
        <Link
          href={`/courses/${course.slug}/${startLesson.slug}`}
          className="mt-4 inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-step-0 font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {startLabel}
        </Link>
      )}

      <div className="mt-8 space-y-6">
        {course.modules.map((module_) => (
          <div key={module_.id}>
            <h2 className="text-step-n1 font-medium uppercase tracking-wide text-muted">
              {module_.title}
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-card border border-line bg-paper">
              {module_.lessons.map((lesson) => {
                const viewable = lesson.assets.length > 0;
                const completed = progressByLesson.get(lesson.id);
                const status = completed === true ? "complete" : completed === false ? "in-progress" : "untouched";
                const availableFormats = FORMAT_ORDER.filter((format) =>
                  lesson.assets.some((a) => a.format === format),
                );

                return (
                  <li key={lesson.id}>
                    {viewable ? (
                      <Link
                        href={`/courses/${course.slug}/${lesson.slug}`}
                        className="flex min-h-11 items-center gap-3 px-4 py-3 text-step-0 text-ink hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                      >
                        <span className="w-4 shrink-0" aria-hidden>
                          {status === "complete" && <span className="text-success">✓</span>}
                          {status === "in-progress" && (
                            <span className="block h-2 w-2 rounded-full bg-accent" />
                          )}
                        </span>
                        <span className="flex-1">
                          {lesson.title}
                          {status !== "untouched" && (
                            <span className="sr-only">
                              {" "}
                              ({status === "complete" ? "completed" : "in progress"})
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {availableFormats.map((format) => (
                            <span
                              key={format}
                              title={FORMAT_LABEL[format]}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-step-n1 font-medium text-muted"
                            >
                              {FORMAT_LETTER[format]}
                              <span className="sr-only"> {FORMAT_LABEL[format]} available</span>
                            </span>
                          ))}
                        </span>
                      </Link>
                    ) : (
                      <span className="flex min-h-11 items-center px-4 py-3 text-step-0 text-muted">
                        {lesson.title}
                      </span>
                    )}
                  </li>
                );
              })}
              {module_.lessons.length === 0 && (
                <li className="px-4 py-3 text-step-0 text-muted">No lessons yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
