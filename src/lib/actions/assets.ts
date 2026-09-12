"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import {
  SLIDE_CONTENT_TYPES,
  AUDIO_CONTENT_TYPES,
  upsertVideoAsset,
  upsertSlidesAsset,
  upsertTextAsset,
} from "@/lib/assets";
import { getSignedUploadUrl, deleteR2Object } from "@/lib/r2";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type Format = "video" | "slides" | "text";

function revalidateLesson(courseId: string, lessonId: string) {
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

/** Current status for a lesson's asset row, or "draft" if it doesn't exist yet. */
async function currentStatus(lessonId: string, format: Format): Promise<"draft" | "ready"> {
  const [row] = await db
    .select({ status: assets.status })
    .from(assets)
    .where(and(eq(assets.lessonId, lessonId), eq(assets.format, format)));
  return row?.status ?? "draft";
}

// Bare 11-char YouTube ID, or a watch/share/embed URL carrying one.
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;
  const match = trimmed.match(YOUTUBE_URL_PATTERN);
  return match ? match[1] : null;
}

export async function saveVideoAsset(
  courseId: string,
  lessonId: string,
  youtubeInput: string,
): Promise<ActionResult<{ youtubeId: string }>> {
  await requireAdmin();

  const youtubeId = extractYoutubeId(youtubeInput);
  if (!youtubeId) {
    return { ok: false, error: "Paste a YouTube video ID or URL." };
  }

  const status = await currentStatus(lessonId, "video");
  await upsertVideoAsset(lessonId, youtubeId, status);

  revalidateLesson(courseId, lessonId);
  return { ok: true, data: { youtubeId } };
}

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

export async function createSlideUploadUrl(
  courseId: string,
  lessonId: string,
  filename: string,
): Promise<ActionResult<{ key: string; uploadUrl: string }>> {
  await requireAdmin();

  const ext = extensionOf(filename);
  const contentType = SLIDE_CONTENT_TYPES[ext];
  if (!contentType) {
    return { ok: false, error: `Unsupported image type "${ext}".` };
  }

  const key = `slides/${lessonId}/${crypto.randomUUID()}${ext}`;
  const uploadUrl = await getSignedUploadUrl(key, contentType);
  return { ok: true, data: { key, uploadUrl } };
}

export async function saveSlides(
  courseId: string,
  lessonId: string,
  slides: { key: string; alt: string }[],
): Promise<ActionResult> {
  await requireAdmin();

  const status = await currentStatus(lessonId, "slides");
  await upsertSlidesAsset(lessonId, slides, status);

  revalidateLesson(courseId, lessonId);
  return { ok: true, data: undefined };
}

export async function deleteSlide(
  courseId: string,
  lessonId: string,
  key: string,
): Promise<ActionResult> {
  await requireAdmin();

  const [row] = await db
    .select({ slideKeys: assets.slideKeys, status: assets.status })
    .from(assets)
    .where(and(eq(assets.lessonId, lessonId), eq(assets.format, "slides")));

  const remaining = (row?.slideKeys ?? []).filter((slide) => slide.key !== key);
  await upsertSlidesAsset(lessonId, remaining, row?.status ?? "draft");
  await deleteR2Object(key);

  revalidateLesson(courseId, lessonId);
  return { ok: true, data: undefined };
}

export async function createAudioUploadUrl(
  courseId: string,
  lessonId: string,
  filename: string,
): Promise<ActionResult<{ key: string; uploadUrl: string }>> {
  await requireAdmin();

  const ext = extensionOf(filename);
  const contentType = AUDIO_CONTENT_TYPES[ext];
  if (!contentType) {
    return { ok: false, error: `Unsupported audio type "${ext}".` };
  }

  // Deterministic key (matches scripts/set-text-asset.ts) — a re-upload of
  // the same extension naturally overwrites the previous file in R2.
  const key = `text/${lessonId}/audio${ext}`;
  const uploadUrl = await getSignedUploadUrl(key, contentType);
  return { ok: true, data: { key, uploadUrl } };
}

export async function saveTextAsset(
  courseId: string,
  lessonId: string,
  fields: { bodyHtml: string; audioKey?: string | null },
): Promise<ActionResult> {
  await requireAdmin();

  const status = await currentStatus(lessonId, "text");
  await upsertTextAsset(lessonId, fields, status);

  revalidateLesson(courseId, lessonId);
  return { ok: true, data: undefined };
}

export async function setAssetStatus(
  courseId: string,
  lessonId: string,
  format: Format,
  status: "draft" | "ready",
): Promise<ActionResult> {
  await requireAdmin();

  await db
    .update(assets)
    .set({ status })
    .where(and(eq(assets.lessonId, lessonId), eq(assets.format, format)));

  revalidateLesson(courseId, lessonId);
  return { ok: true, data: undefined };
}
