import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { courses, progress as progressTable } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { getSignedSlideUrls, getSignedR2Url } from "@/lib/r2";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { LessonTabs } from "./lesson-tabs";

// Tab order per SPEC.md §6: video -> slides -> text.
const TAB_ORDER = ["video", "slides", "text"] as const;

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const session = await requireSession();
  const { slug, lessonSlug } = await params;

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

  // Flattened in course order (modules and lessons are both orderBy position
  // above) — used to locate the current lesson, and to find the previous/
  // next ones. Each lesson carries its module's title/position for the
  // breadcrumb, since that's otherwise lost once flattened.
  const allLessons = course.modules.flatMap((m, moduleIndex) =>
    m.lessons.map((lesson) => ({ ...lesson, moduleTitle: m.title, moduleIndex })),
  );
  const lessonIndex = allLessons.findIndex((l) => l.slug === lessonSlug);
  const lesson = lessonIndex === -1 ? undefined : allLessons[lessonIndex];

  if (!lesson) {
    notFound();
  }

  const videoAsset = lesson.assets.find((a) => a.format === "video");
  const slidesAsset = lesson.assets.find((a) => a.format === "slides");
  const textAsset = lesson.assets.find((a) => a.format === "text");

  const availableTabs = TAB_ORDER.filter(
    (tab) =>
      (tab === "video" && videoAsset) ||
      (tab === "slides" && slidesAsset) ||
      (tab === "text" && textAsset),
  );

  if (availableTabs.length === 0) {
    notFound();
  }

  const preferred = session.user.preferredFormat;
  const initialTab =
    preferred && availableTabs.includes(preferred as (typeof availableTabs)[number])
      ? (preferred as (typeof availableTabs)[number])
      : availableTabs[0];

  const [progressRow] = await db
    .select()
    .from(progressTable)
    .where(
      and(eq(progressTable.userId, session.user.id), eq(progressTable.lessonId, lesson.id)),
    );

  const slideUrls = slidesAsset?.slideKeys
    ? await getSignedSlideUrls(slidesAsset.slideKeys)
    : [];

  const audioUrl = textAsset?.audioKey ? await getSignedR2Url(textAsset.audioKey) : null;

  // Previous/next published lesson, in course order, with at least one
  // ready asset — so neither link (nor autoplay-next) ever lands on a 404.
  const previousLessonSlug =
    [...allLessons.slice(0, lessonIndex)].reverse().find((l) => l.assets.length > 0)?.slug ?? null;
  const nextLessonSlug =
    allLessons.slice(lessonIndex + 1).find((l) => l.assets.length > 0)?.slug ?? null;

  return (
    <main className="mx-auto p-6 pb-24 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <Link
          href={`/courses/${course.slug}`}
          className="text-step-n1 text-muted hover:text-ink"
        >
          ← {course.title}
        </Link>
        <span className="text-step-n1 text-muted">
          Module {lesson.moduleIndex + 1}
        </span>
      </div>
      <h1 className="mt-2 text-step-3 font-serif font-semibold text-ink">{lesson.title}</h1>
      {lesson.summary && <p className="mt-1 text-step-0 text-muted">{lesson.summary}</p>}

      <LessonTabs
        lessonId={lesson.id}
        courseSlug={course.slug}
        lessonSlug={lesson.slug}
        courseName={course.title}
        lessonTitle={lesson.title}
        availableTabs={availableTabs}
        initialTab={initialTab}
        video={videoAsset ? { youtubeId: videoAsset.youtubeId! } : undefined}
        slides={slidesAsset ? { slides: slideUrls } : undefined}
        text={
          textAsset
            ? {
                bodyHtml: sanitizeLessonHtml(textAsset.bodyHtml ?? ""),
                audioUrl,
                nextLessonSlug,
              }
            : undefined
        }
        initialPositions={progressRow?.positions ?? {}}
      />

      {(previousLessonSlug || nextLessonSlug) && (
        <div className="mt-6 flex items-center justify-between text-step-0">
          {previousLessonSlug ? (
            <Link
              href={`/courses/${course.slug}/${previousLessonSlug}`}
              className="text-primary hover:underline"
            >
              ← Previous lesson
            </Link>
          ) : (
            <span />
          )}
          {nextLessonSlug && (
            <Link
              href={`/courses/${course.slug}/${nextLessonSlug}`}
              className="text-primary hover:underline"
            >
              Next lesson →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
