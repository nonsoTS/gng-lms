import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const SIGNED_URL_TTL_SECONDS = 60 * 60; // ~1 hour, per SPEC.md §5.2/§5.3
const UPLOAD_URL_TTL_SECONDS = 5 * 60; // Just long enough for a browser upload.

/** Trusted-context upload only (CLI scripts) — never called from a browser request. */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/**
 * Signed GET URL for one object, server-side, after a session check — R2
 * buckets are private (SPEC.md §5.1). Works transparently with HTTP Range
 * requests (the signature covers the URL/method, not headers), so this is
 * also what makes `<audio>` scrubbing work against a signed audio URL.
 */
export async function getSignedR2Url(key: string): Promise<string> {
  return getS3SignedUrl(s3, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}

/**
 * Generates signed GET URLs for a whole slide deck in one call. Carries the
 * R2 key through alongside each URL — the learner-facing slides tab ignores
 * it, the admin editor needs it to reorder/delete/re-save specific slides.
 */
export async function getSignedSlideUrls(
  slides: { key: string; alt: string }[],
): Promise<{ key: string; url: string; alt: string }[]> {
  return Promise.all(
    slides.map(async (slide) => ({
      key: slide.key,
      url: await getSignedR2Url(slide.key),
      alt: slide.alt,
    })),
  );
}

/**
 * Signed PUT URL for a direct-to-R2 browser upload (SPEC.md §7/§10: never
 * proxy file bytes through the app server). Caller is responsible for
 * validating the key and content type before calling this — see
 * src/lib/actions/assets.ts.
 */
export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  return getS3SignedUrl(
    s3,
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

/** Deletes one object — used when an admin removes a slide or replaces audio. */
export async function deleteR2Object(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
