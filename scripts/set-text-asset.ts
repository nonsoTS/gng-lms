/**
 * Phase 5 bootstrap tool — sets/updates a lesson's text asset: body_html read
 * verbatim from a local file (sanitized at render time, not here — see
 * src/lib/sanitize.ts) and an optional audio file uploaded to R2. Same
 * CLI-bootstrap pattern as the Phase 4 asset scripts; the polished admin
 * Assets UI (SPEC.md §7) is a deferred follow-up, not this phase.
 *
 * Usage: npx tsx scripts/set-text-asset.ts --course <slug> --lesson <slug> --html <file> [--audio <file>] [--ready]
 */
process.loadEnvFile(".env.local");

import { readFileSync } from "node:fs";
import { extname } from "node:path";

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function main() {
  const courseSlug = getFlag("course");
  const lessonSlug = getFlag("lesson");
  const htmlFile = getFlag("html");
  const audioFile = getFlag("audio");
  const ready = process.argv.includes("--ready");

  if (!courseSlug || !lessonSlug || !htmlFile) {
    console.error(
      "Usage: npx tsx scripts/set-text-asset.ts --course <slug> --lesson <slug> --html <file> [--audio <file>] [--ready]",
    );
    process.exit(1);
  }

  const bodyHtml = readFileSync(htmlFile, "utf-8");

  const { resolveLessonBySlug } = await import("@/lib/lessons");
  const { uploadObject } = await import("@/lib/r2");
  const { AUDIO_CONTENT_TYPES, upsertTextAsset } = await import("@/lib/assets");

  const lesson = await resolveLessonBySlug(courseSlug, lessonSlug);
  if (!lesson) {
    console.error(`No lesson found for course "${courseSlug}" / lesson "${lessonSlug}".`);
    process.exit(1);
  }

  let audioKey: string | undefined;
  if (audioFile) {
    const ext = extname(audioFile).toLowerCase();
    const contentType = AUDIO_CONTENT_TYPES[ext];
    if (!contentType) {
      console.error(`Unsupported audio extension "${ext}" (expected .mp3, .m4a, or .wav).`);
      process.exit(1);
    }
    audioKey = `text/${lesson.lessonId}/audio${ext}`;
    await uploadObject(audioKey, readFileSync(audioFile), contentType);
    console.log(`Uploaded ${audioFile} -> ${audioKey}`);
  }

  // audioKey stays undefined (leaving any existing audio untouched) unless
  // --audio was actually given this run — see upsertTextAsset's contract.
  await upsertTextAsset(lesson.lessonId, { bodyHtml, audioKey }, ready ? "ready" : "draft");

  console.log(
    `Set text asset for ${courseSlug}/${lessonSlug}: ${audioKey ? "with audio" : "no audio"}, status=${ready ? "ready" : "draft"}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
