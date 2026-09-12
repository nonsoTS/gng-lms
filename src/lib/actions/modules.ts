"use server";

import { revalidatePath } from "next/cache";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function revalidateCourse(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createModule(
  courseId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  const [{ maxPosition }] = await db
    .select({ maxPosition: max(modules.position) })
    .from(modules)
    .where(eq(modules.courseId, courseId));

  const [module_] = await db
    .insert(modules)
    .values({ courseId, title: trimmed, position: (maxPosition ?? -1) + 1 })
    .returning({ id: modules.id });

  await revalidateCourse(courseId);
  return { ok: true, data: { id: module_.id } };
}

export async function updateModule(
  id: string,
  courseId: string,
  title: string,
): Promise<ActionResult> {
  await requireAdmin();

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title is required." };

  await db.update(modules).set({ title: trimmed }).where(eq(modules.id, id));

  await revalidateCourse(courseId);
  return { ok: true, data: undefined };
}

export async function deleteModule(
  id: string,
  courseId: string,
): Promise<void> {
  await requireAdmin();

  await db.delete(modules).where(eq(modules.id, id));

  await revalidateCourse(courseId);
}

export async function reorderModules(
  courseId: string,
  orderedIds: string[],
): Promise<void> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(modules).set({ position: index }).where(eq(modules.id, id));
    }
  });

  await revalidateCourse(courseId);
}
