import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { courses, lessons, modules } from "@/db/schema";

/** Shared by the asset-bootstrap scripts — resolves a lesson via its course + lesson slugs. */
export async function resolveLessonBySlug(courseSlug: string, lessonSlug: string) {
  const [row] = await db
    .select({ lessonId: lessons.id, courseId: courses.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(and(eq(courses.slug, courseSlug), eq(lessons.slug, lessonSlug)));

  return row ?? null;
}
