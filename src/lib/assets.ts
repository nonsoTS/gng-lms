import { db } from "@/db";
import { assets } from "@/db/schema";

/**
 * Shared by scripts/set-slide-assets.ts and the admin slide-upload actions,
 * so the two never validate a different set of extensions.
 */
export const SLIDE_CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** Shared by scripts/set-text-asset.ts and the admin audio-upload action. */
export const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};

/**
 * The `db.insert(assets)...onConflictDoUpdate(...)` shape shared by every
 * asset-bootstrap script and (now) the admin asset actions — see
 * src/lib/onboard-user.ts for the same "extract the DB write, keep the
 * caller-specific bits at the call site" pattern.
 */
export async function upsertVideoAsset(
  lessonId: string,
  youtubeId: string,
  status: "draft" | "ready",
) {
  await db
    .insert(assets)
    .values({ lessonId, format: "video", youtubeId, status })
    .onConflictDoUpdate({
      target: [assets.lessonId, assets.format],
      set: { youtubeId, status },
    });
}

export async function upsertSlidesAsset(
  lessonId: string,
  slides: { key: string; alt: string }[],
  status: "draft" | "ready",
) {
  await db
    .insert(assets)
    .values({ lessonId, format: "slides", slideKeys: slides, status })
    .onConflictDoUpdate({
      target: [assets.lessonId, assets.format],
      set: { slideKeys: slides, status },
    });
}

export async function upsertTextAsset(
  lessonId: string,
  fields: { bodyHtml: string; audioKey?: string | null },
  status: "draft" | "ready",
) {
  await db
    .insert(assets)
    .values({
      lessonId,
      format: "text",
      bodyHtml: fields.bodyHtml,
      audioKey: fields.audioKey ?? null,
      status,
    })
    .onConflictDoUpdate({
      target: [assets.lessonId, assets.format],
      // Only touch audioKey on update if the caller actually supplied one —
      // a rerun/save that just changes the HTML shouldn't wipe out existing
      // audio (see scripts/set-text-asset.ts, same rule).
      set: {
        bodyHtml: fields.bodyHtml,
        status,
        ...(fields.audioKey !== undefined ? { audioKey: fields.audioKey } : {}),
      },
    });
}
