"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/slug";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function pgErrorCode(error: unknown): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if ("code" in error) return (error as { code?: unknown }).code;
  // drizzle-orm wraps driver errors in DrizzleQueryError, with the real
  // PostgresError (and its .code) nested at .cause, not top-level.
  if ("cause" in error) return pgErrorCode((error as { cause?: unknown }).cause);
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

export async function createCourse(
  title: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const [{ maxPosition }] = await db
    .select({ maxPosition: max(courses.position) })
    .from(courses);

  try {
    const [course] = await db
      .insert(courses)
      .values({
        title: trimmed,
        slug: slugify(trimmed),
        position: (maxPosition ?? -1) + 1,
      })
      .returning({ id: courses.id });

    revalidatePath("/admin/courses");
    return { ok: true, data: { id: course.id } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "A course with that title (slug) already exists.",
      };
    }
    throw error;
  }
}

export async function updateCourse(
  id: string,
  fields: {
    title: string;
    slug: string;
    description: string;
    status: "draft" | "published";
  },
): Promise<ActionResult> {
  await requireAdmin();

  const title = fields.title.trim();
  const slug = slugify(fields.slug);
  if (!title) return { ok: false, error: "Title is required." };
  if (!slug) return { ok: false, error: "Slug is required." };

  try {
    await db
      .update(courses)
      .set({
        title,
        slug,
        description: fields.description.trim() || null,
        status: fields.status,
      })
      .where(eq(courses.id, id));

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "A course with that slug already exists." };
    }
    throw error;
  }
}

export async function softDeleteCourse(id: string): Promise<void> {
  await requireAdmin();

  await db
    .update(courses)
    .set({ deletedAt: new Date() })
    .where(eq(courses.id, id));

  revalidatePath("/admin/courses");
}

export async function reorderCourses(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(courses).set({ position: index }).where(eq(courses.id, id));
    }
  });

  revalidatePath("/admin/courses");
}

export async function listCourses() {
  return db
    .select()
    .from(courses)
    .where(isNull(courses.deletedAt))
    .orderBy(asc(courses.position));
}
