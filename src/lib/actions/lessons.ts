"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max, ne } from "drizzle-orm";
import { db } from "@/db";
import { lessons, modules } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/slug";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function revalidateCourse(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Lesson slugs are unique per course (not globally) — see Phase 2 plan. */
async function lessonSlugTakenInCourse(
  courseId: string,
  slug: string,
  excludeLessonId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(
        eq(modules.courseId, courseId),
        eq(lessons.slug, slug),
        excludeLessonId ? ne(lessons.id, excludeLessonId) : undefined,
      ),
    );
  return rows.length > 0;
}

export async function createLesson(
  moduleId: string,
  courseId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const slug = slugify(trimmed);
  if (await lessonSlugTakenInCourse(courseId, slug)) {
    return {
      ok: false,
      error: "A lesson with that title (slug) already exists in this course.",
    };
  }

  const [{ maxPosition }] = await db
    .select({ maxPosition: max(lessons.position) })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));

  const [lesson] = await db
    .insert(lessons)
    .values({ moduleId, title: trimmed, slug, position: (maxPosition ?? -1) + 1 })
    .returning({ id: lessons.id });

  await revalidateCourse(courseId);
  return { ok: true, data: { id: lesson.id } };
}

export async function updateLesson(
  id: string,
  courseId: string,
  fields: {
    title: string;
    slug: string;
    summary: string;
    status: "draft" | "published";
  },
): Promise<ActionResult> {
  await requireAdmin();

  const title = fields.title.trim();
  const slug = slugify(fields.slug);
  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  if (await lessonSlugTakenInCourse(courseId, slug, id)) {
    return {
      ok: false,
      error: "A lesson with that slug already exists in this course.",
    };
  }

  await db
    .update(lessons)
    .set({
      title,
      slug,
      summary: fields.summary.trim() || null,
      status: fields.status,
    })
    .where(eq(lessons.id, id));

  await revalidateCourse(courseId);
  return { ok: true, data: undefined };
}

export async function deleteLesson(
  id: string,
  courseId: string,
): Promise<void> {
  await requireAdmin();

  await db.delete(lessons).where(eq(lessons.id, id));

  await revalidateCourse(courseId);
}

export async function reorderLessons(
  moduleId: string,
  courseId: string,
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(lessons).set({ position: index }).where(eq(lessons.id, id));
    }
  });

  await revalidateCourse(courseId);
}
