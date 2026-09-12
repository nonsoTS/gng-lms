"use client";

import { useRef, useState, useTransition } from "react";
import { updatePreferredFormat } from "@/lib/actions/progress";
import { VideoTab } from "./video-tab";
import { SlidesTab } from "./slides-tab";
import { TextTab } from "./text-tab";

type Tab = "video" | "slides" | "text";

const TAB_LABELS: Record<Tab, string> = {
  video: "Watch",
  slides: "Slides",
  text: "Read & Listen",
};

export function LessonTabs({
  lessonId,
  courseSlug,
  lessonSlug,
  courseName,
  lessonTitle,
  availableTabs,
  initialTab,
  video,
  slides,
  text,
  initialPositions,
}: {
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  courseName: string;
  lessonTitle: string;
  availableTabs: readonly Tab[];
  initialTab: Tab;
  video?: { youtubeId: string };
  slides?: { slides: { url: string; alt: string }[] };
  text?: { bodyHtml: string; audioUrl: string | null; nextLessonSlug: string | null };
  initialPositions: {
    video?: { seconds: number };
    slides?: { furthestIndex: number };
    text?: { scrollPct: number; audioSeconds: number };
  };
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [, startTransition] = useTransition();
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  function selectTab(tab: Tab) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    startTransition(() => {
      void updatePreferredFormat(tab);
    });
  }

  // Roving-tabindex tablist: arrow keys move focus and activate the newly
  // focused tab (automatic activation — standard for a lightweight tablist
  // like this one, per the WAI-ARIA APG tabs pattern).
  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % availableTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + availableTabs.length) % availableTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = availableTabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = availableTabs[nextIndex];
    tabRefs.current[nextTab]?.focus();
    selectTab(nextTab);
  }

  return (
    <div className="mt-6 mx-auto w-full lg:w-3/4">
      {availableTabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Lesson format"
          className="flex w-full gap-1 rounded-card bg-surface p-1"
        >
          {availableTabs.map((tab, index) => (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => selectTab(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`min-h-11 flex-1 rounded-control px-3 py-2 text-step-0 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                activeTab === tab ? "bg-primary text-white" : "text-ink hover:bg-line/50"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="mt-4 rounded-card border border-line bg-paper p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
      >
        {activeTab === "video" && video && (
          <VideoTab lessonId={lessonId} youtubeId={video.youtubeId} initialSeconds={initialPositions.video?.seconds} />
        )}
        {activeTab === "slides" && slides && (
          <SlidesTab
            lessonId={lessonId}
            slides={slides.slides}
            initialFurthestIndex={initialPositions.slides?.furthestIndex}
          />
        )}
        {activeTab === "text" && text && (
          <TextTab
            lessonId={lessonId}
            courseSlug={courseSlug}
            lessonSlug={lessonSlug}
            title={lessonTitle}
            courseName={courseName}
            bodyHtml={text.bodyHtml}
            audioUrl={text.audioUrl}
            nextLessonSlug={text.nextLessonSlug}
            initialScrollPct={initialPositions.text?.scrollPct ?? 0}
            initialAudioSeconds={initialPositions.text?.audioSeconds ?? 0}
          />
        )}
      </div>
    </div>
  );
}
