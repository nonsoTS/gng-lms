"use client";

import { useEffect, useRef, useTransition } from "react";
import { useAudioPlayer } from "@/components/audio-player-context";
import { updateTextProgress } from "@/lib/actions/progress";

const SCROLL_FLUSH_INTERVAL_MS = 10_000;

export function TextTab({
  lessonId,
  courseSlug,
  lessonSlug,
  title,
  courseName,
  bodyHtml,
  audioUrl,
  nextLessonSlug,
  initialScrollPct,
  initialAudioSeconds,
}: {
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  title: string;
  courseName: string;
  bodyHtml: string;
  audioUrl: string | null;
  nextLessonSlug: string | null;
  initialScrollPct: number;
  initialAudioSeconds: number;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const { loadTrack, setInlineSlot } = useAudioPlayer();
  const [, startTransition] = useTransition();

  // Registers/clears this tab's "pinned at the top" slot — the one player
  // instance in AudioPlayerProvider portals into it while mounted, and falls
  // back to its own fixed bottom dock once this effect's cleanup clears it.
  useEffect(() => {
    setInlineSlot(slotRef.current);
    return () => setInlineSlot(null);
  }, [setInlineSlot]);

  useEffect(() => {
    if (!audioUrl) return;
    loadTrack({
      lessonId,
      courseSlug,
      lessonSlug,
      title,
      courseName,
      audioUrl,
      initialSeconds: initialAudioSeconds,
      nextLessonSlug,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, audioUrl]);

  // Resume scroll position — the video/slides tabs seek/reopen at their
  // saved position on load, this closes the same gap for text (was tracked
  // but never restored). Runs once on mount, after the sanitized content
  // (rendered synchronously below) has already laid out the page. Guarded
  // against a zero/invalid viewport height so a bad read can't scroll to a
  // garbage position (fails safe: no scroll, not a wrong one).
  useEffect(() => {
    if (initialScrollPct <= 0) return;
    const innerHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    if (innerHeight <= 0 || scrollHeight <= innerHeight) return;
    window.scrollTo(0, initialScrollPct * scrollHeight - innerHeight);
  }, [initialScrollPct]);

  // Scroll depth: monotonic (never regresses on scrolling back up), flushed
  // on an interval rather than per-scroll-event.
  const maxScrollRef = useRef(initialScrollPct);
  const lastSentRef = useRef(initialScrollPct);

  useEffect(() => {
    function handleScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight : 1;
      maxScrollRef.current = Math.max(maxScrollRef.current, Math.min(pct, 1));
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    const interval = setInterval(() => {
      if (maxScrollRef.current > lastSentRef.current) {
        lastSentRef.current = maxScrollRef.current;
        startTransition(() => {
          void updateTextProgress(lessonId, { scrollPct: maxScrollRef.current });
        });
      }
    }, SCROLL_FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [lessonId]);

  return (
    <div>
      {audioUrl && <div ref={slotRef} className="mb-6" />}
      {/* body_html is sanitized server-side, see src/lib/sanitize.ts.
          max-w-[68ch] + text-step-1 + font-serif is DESIGN.md §5's "set as
          an article" spec; the 1.65 line-height and heading/list/quote
          rules come from the typography plugin's own prose ruleset now
          that it's actually installed (see globals.css). */}
      <div
        className="prose max-w-[68ch] font-serif text-step-1 text-ink"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
