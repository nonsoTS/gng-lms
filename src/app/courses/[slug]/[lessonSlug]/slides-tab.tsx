"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateSlidesProgress } from "@/lib/actions/progress";

export function SlidesTab({
  lessonId,
  slides,
  initialFurthestIndex,
}: {
  lessonId: string;
  slides: { url: string; alt: string }[];
  initialFurthestIndex?: number;
}) {
  const lastIndex = slides.length - 1;
  const startIndex = Math.min(Math.max(initialFurthestIndex ?? 0, 0), lastIndex);

  const [index, setIndex] = useState(startIndex);
  const [furthest, setFurthest] = useState(startIndex);
  const [, startTransition] = useTransition();

  function goTo(next: number) {
    const clamped = Math.min(Math.max(next, 0), lastIndex);
    setIndex(clamped);

    if (clamped > furthest) {
      setFurthest(clamped);
      startTransition(() => {
        void updateSlidesProgress(lessonId, clamped);
      });
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, furthest]);

  // Preload the next two slides so advancing feels instant.
  useEffect(() => {
    for (const slide of slides.slice(index + 1, index + 3)) {
      const img = new Image();
      img.src = slide.url;
    }
  }, [index, slides]);

  const touchStartX = useRef(0);
  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }
  function onTouchEnd(event: React.TouchEvent) {
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) < 40) return;
    goTo(deltaX < 0 ? index + 1 : index - 1);
  }

  return (
    <div>
      <div
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-surface"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static/local asset */}
        <img
          src={slides[index].url}
          alt={slides[index].alt || `Slide ${index + 1} of ${slides.length}`}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="min-h-11 min-w-11 rounded-control border border-line px-3 py-2 text-step-0 font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="text-step-n1 text-muted">
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === lastIndex}
          className="min-h-11 min-w-11 rounded-control border border-line px-3 py-2 text-step-0 font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
