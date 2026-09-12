"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, progress, user } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

const VIDEO_COMPLETE_THRESHOLD = 0.9;
const TEXT_SCROLL_COMPLETE_THRESHOLD = 0.9;

/**
 * Upserts one format's position into the shared `positions` jsonb, merging
 * rather than overwriting so writing a video position doesn't clobber a
 * slides position already on the same row. `completed` is monotonic — it
 * only ever flips false -> true, per SPEC.md §4 ("completion is per lesson,
 * not per format" — a later call on a different format must not un-complete
 * a lesson finished earlier on another format).
 */
async function upsertProgress(
  lessonId: string,
  userId: string,
  positionsPatch: Record<string, unknown>,
  justCompleted: boolean,
) {
  await db
    .insert(progress)
    .values({
      userId,
      lessonId,
      positions: positionsPatch,
      completed: justCompleted,
      completedAt: justCompleted ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [progress.userId, progress.lessonId],
      set: {
        positions: sql`${progress.positions} || ${JSON.stringify(positionsPatch)}::jsonb`,
        completed: sql`${progress.completed} OR ${justCompleted}`,
        completedAt: justCompleted
          ? sql`coalesce(${progress.completedAt}, now())`
          : sql`${progress.completedAt}`,
      },
    });
}

export async function updateVideoProgress(
  lessonId: string,
  seconds: number,
  durationSeconds: number,
) {
  const session = await requireSession();

  const justCompleted =
    durationSeconds > 0 && seconds / durationSeconds >= VIDEO_COMPLETE_THRESHOLD;

  await upsertProgress(lessonId, session.user.id, { video: { seconds } }, justCompleted);
}

export async function updateSlidesProgress(lessonId: string, furthestIndex: number) {
  const session = await requireSession();

  const [slidesAsset] = await db
    .select({ slideKeys: assets.slideKeys })
    .from(assets)
    .where(
      and(
        eq(assets.lessonId, lessonId),
        eq(assets.format, "slides"),
        eq(assets.status, "ready"),
      ),
    );

  const totalSlides = slidesAsset?.slideKeys?.length ?? 0;
  const justCompleted = totalSlides > 0 && furthestIndex >= totalSlides - 1;

  await upsertProgress(lessonId, session.user.id, { slides: { furthestIndex } }, justCompleted);
}

export async function updateTextProgress(
  lessonId: string,
  patch: { scrollPct?: number; audioSeconds?: number },
) {
  const session = await requireSession();

  // upsertProgress's jsonb `||` merge is shallow — it would replace the whole
  // `text` object, not merge into it. video/slides only ever have one
  // sub-field each so that's fine for them, but text has two (scrollPct,
  // audioSeconds) written independently by scroll-tracking vs audio polling.
  // Merge them here first so a write to one never clobbers the other.
  const [existing] = await db
    .select({ positions: progress.positions })
    .from(progress)
    .where(and(eq(progress.userId, session.user.id), eq(progress.lessonId, lessonId)));

  const mergedText = { ...existing?.positions?.text, ...patch };
  const justCompleted = (mergedText.scrollPct ?? 0) >= TEXT_SCROLL_COMPLETE_THRESHOLD;

  await upsertProgress(lessonId, session.user.id, { text: mergedText }, justCompleted);
}

/** Called on the <audio> element's `ended` event — completion via audio finishing, independent of scroll depth. */
export async function completeTextLesson(lessonId: string) {
  const session = await requireSession();

  await upsertProgress(lessonId, session.user.id, {}, true);
}

/**
 * Direct write, not Better Auth's updateUser — preferredFormat is configured
 * `input: false` in src/lib/auth.ts (internal app state, not user-supplied).
 */
export async function updatePreferredFormat(format: "video" | "slides" | "text") {
  const session = await requireSession();

  await db.update(user).set({ preferredFormat: format }).where(eq(user.id, session.user.id));
}
