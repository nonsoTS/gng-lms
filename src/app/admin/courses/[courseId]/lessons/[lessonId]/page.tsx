import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getSignedR2Url, getSignedSlideUrls } from "@/lib/r2";
import { formatDateTime as formatUpdatedAt } from "@/lib/format-date";
import { LessonAssetsEditor } from "./lesson-assets-editor";

export default async function LessonAssetsPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { assets: true },
  });

  if (!lesson) {
    notFound();
  }

  const videoAsset = lesson.assets.find((a) => a.format === "video");
  const slidesAsset = lesson.assets.find((a) => a.format === "slides");
  const textAsset = lesson.assets.find((a) => a.format === "text");

  const slides = slidesAsset?.slideKeys ? await getSignedSlideUrls(slidesAsset.slideKeys) : [];
  const audioUrl = textAsset?.audioKey ? await getSignedR2Url(textAsset.audioKey) : null;

  return (
    <div>
      <Link
        href={`/admin/courses/${courseId}`}
        className="text-step-n1 text-muted hover:text-ink"
      >
        ← {lesson.title}
      </Link>
      <h1 className="mt-2 text-step-2 font-semibold text-ink">{lesson.title}</h1>
      <p className="mt-1 text-step-0 text-muted">Manage this lesson&apos;s three formats.</p>

      <LessonAssetsEditor
        courseId={courseId}
        lessonId={lessonId}
        video={
          videoAsset
            ? {
                youtubeId: videoAsset.youtubeId ?? "",
                status: videoAsset.status,
                updatedAt: formatUpdatedAt(videoAsset.updatedAt),
              }
            : null
        }
        slides={
          slidesAsset
            ? { slides, status: slidesAsset.status, updatedAt: formatUpdatedAt(slidesAsset.updatedAt) }
            : null
        }
        text={
          textAsset
            ? {
                bodyHtml: textAsset.bodyHtml ?? "",
                audioUrl,
                hasAudio: Boolean(textAsset.audioKey),
                status: textAsset.status,
                updatedAt: formatUpdatedAt(textAsset.updatedAt),
              }
            : null
        }
      />
    </div>
  );
}
