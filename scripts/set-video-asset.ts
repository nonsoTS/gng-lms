/**
 * Phase 4 bootstrap tool — sets/updates a lesson's video asset. Same
 * CLI-bootstrap pattern as scripts/create-invite.ts; the polished admin
 * Assets UI (SPEC.md §7) is a deferred follow-up, not this phase.
 *
 * Usage: npx tsx scripts/set-video-asset.ts --course <slug> --lesson <slug> --youtube <id> [--ready]
 */
process.loadEnvFile(".env.local");

// See scripts/create-invite.ts for why this is needed.
export {};

function getFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function main() {
  const courseSlug = getFlag("course");
  const lessonSlug = getFlag("lesson");
  const youtubeId = getFlag("youtube");
  const ready = process.argv.includes("--ready");

  if (!courseSlug || !lessonSlug || !youtubeId) {
    console.error(
      "Usage: npx tsx scripts/set-video-asset.ts --course <slug> --lesson <slug> --youtube <id> [--ready]",
    );
    process.exit(1);
  }

  const { resolveLessonBySlug } = await import("@/lib/lessons");
  const { upsertVideoAsset } = await import("@/lib/assets");

  const lesson = await resolveLessonBySlug(courseSlug, lessonSlug);
  if (!lesson) {
    console.error(`No lesson found for course "${courseSlug}" / lesson "${lessonSlug}".`);
    process.exit(1);
  }

  await upsertVideoAsset(lesson.lessonId, youtubeId, ready ? "ready" : "draft");

  console.log(
    `Set video asset for ${courseSlug}/${lessonSlug}: youtube=${youtubeId} status=${ready ? "ready" : "draft"}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
