/**
 * Phase 4 bootstrap tool — uploads a local directory of slide images to R2
 * and sets a lesson's slides asset. Files are uploaded in filename-sorted
 * order; that order becomes slideKeys. No resizing/conversion — SPEC.md §7
 * says slide export/prep happens outside the app.
 *
 * Usage: npx tsx scripts/set-slide-assets.ts --course <slug> --lesson <slug> --images <dir> [--ready]
 */
process.loadEnvFile(".env.local");

import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function main() {
  const courseSlug = getFlag("course");
  const lessonSlug = getFlag("lesson");
  const imagesDir = getFlag("images");
  const ready = process.argv.includes("--ready");

  if (!courseSlug || !lessonSlug || !imagesDir) {
    console.error(
      "Usage: npx tsx scripts/set-slide-assets.ts --course <slug> --lesson <slug> --images <dir> [--ready]",
    );
    process.exit(1);
  }

  const { resolveLessonBySlug } = await import("@/lib/lessons");
  const { uploadObject } = await import("@/lib/r2");
  const { SLIDE_CONTENT_TYPES, upsertSlidesAsset } = await import("@/lib/assets");

  const files = readdirSync(imagesDir)
    .filter((f) => extname(f).toLowerCase() in SLIDE_CONTENT_TYPES)
    .sort();

  if (files.length === 0) {
    console.error(`No image files (webp/png/jpg) found in ${imagesDir}`);
    process.exit(1);
  }

  const lesson = await resolveLessonBySlug(courseSlug, lessonSlug);
  if (!lesson) {
    console.error(`No lesson found for course "${courseSlug}" / lesson "${lessonSlug}".`);
    process.exit(1);
  }

  const slideKeys: { key: string; alt: string }[] = [];
  for (const [index, file] of files.entries()) {
    const ext = extname(file).toLowerCase();
    const key = `slides/${lesson.lessonId}/${String(index).padStart(3, "0")}${ext}`;
    const body = readFileSync(join(imagesDir, file));
    await uploadObject(key, body, SLIDE_CONTENT_TYPES[ext]);
    // No source of real alt text here — this is a bootstrap CLI script, not
    // the admin uploader. Alt text gets entered once that UI exists.
    slideKeys.push({ key, alt: "" });
    console.log(`Uploaded ${file} -> ${key}`);
  }

  await upsertSlidesAsset(lesson.lessonId, slideKeys, ready ? "ready" : "draft");

  console.log(
    `Set slides asset for ${courseSlug}/${lessonSlug}: ${slideKeys.length} slides, status=${ready ? "ready" : "draft"}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
