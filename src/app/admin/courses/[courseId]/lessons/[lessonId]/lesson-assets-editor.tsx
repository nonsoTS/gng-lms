"use client";

import { VideoAssetCard } from "./video-asset-card";
import { SlidesAssetCard } from "./slides-asset-card";
import { TextAssetCard } from "./text-asset-card";

type Status = "draft" | "ready";

export function LessonAssetsEditor({
  courseId,
  lessonId,
  video,
  slides,
  text,
}: {
  courseId: string;
  lessonId: string;
  video: { youtubeId: string; status: Status; updatedAt: string } | null;
  slides: {
    slides: { key: string; url: string; alt: string }[];
    status: Status;
    updatedAt: string;
  } | null;
  text: {
    bodyHtml: string;
    audioUrl: string | null;
    hasAudio: boolean;
    status: Status;
    updatedAt: string;
  } | null;
}) {
  return (
    <div className="mt-6 space-y-4">
      <VideoAssetCard courseId={courseId} lessonId={lessonId} asset={video} />
      <SlidesAssetCard courseId={courseId} lessonId={lessonId} asset={slides} />
      <TextAssetCard courseId={courseId} lessonId={lessonId} asset={text} />
    </div>
  );
}
