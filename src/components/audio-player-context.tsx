"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { completeTextLesson, updateTextProgress } from "@/lib/actions/progress";

const POLL_INTERVAL_MS = 10_000;

export type Track = {
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  title: string;
  courseName: string;
  audioUrl: string;
  initialSeconds: number;
  nextLessonSlug: string | null;
};

type AudioPlayerContextValue = {
  track: Track | null;
  loadTrack: (track: Track) => void;
  setInlineSlot: (el: HTMLDivElement | null) => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = use(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [inlineSlot, setInlineSlot] = useState<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [, startTransition] = useTransition();

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAutoplayRef = useRef(false);
  const router = useRouter();

  const loadTrack = useCallback((next: Track) => {
    setTrack((current) => {
      if (current?.lessonId === next.lessonId) return current;
      return next;
    });
  }, []);

  // Swap the <audio> element's source whenever the track actually changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    audio.src = track.audioUrl;

    function onLoadedMetadata() {
      if (audio) audio.currentTime = track!.initialSeconds;
      if (pendingAutoplayRef.current) {
        pendingAutoplayRef.current = false;
        void audio?.play();
      }
    }
    audio.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    return () => audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.lessonId]);

  const goToNextLesson = useCallback(() => {
    if (!track?.nextLessonSlug) return;
    pendingAutoplayRef.current = true;
    router.push(`/courses/${track.courseSlug}/${track.nextLessonSlug}`);
  }, [track, router]);

  function handleEnded() {
    if (!track) return;
    startTransition(() => {
      void completeTextLesson(track.lessonId);
    });
    if (autoplayNext && track.nextLessonSlug) {
      goToNextLesson();
    }
  }

  // MediaSession: lock-screen / headphone-button controls.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.courseName,
      // Empty for now — courses.coverImageKey isn't populated by anything yet.
      artwork: [],
    });
    navigator.mediaSession.setActionHandler("play", () => void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (audioRef.current && details.seekTime != null) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      track.nextLessonSlug ? goToNextLesson : null,
    );

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, [track, goToNextLesson]);

  // Throttled position writes while playing.
  useEffect(() => {
    if (!track) return;
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      startTransition(() => {
        void updateTextProgress(track.lessonId, {
          audioSeconds: Math.floor(audio.currentTime),
        });
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.lessonId]);

  // Content only — no background/border/radius/shadow of its own, since
  // the container chrome differs by where this renders (see below): a
  // plain bordered strip pinned inline in the text tab, vs. a floating
  // bottom-docked bar elsewhere.
  const playerControls = track && (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => (isPlaying ? audioRef.current?.pause() : void audioRef.current?.play())}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary px-4 text-step-n1 font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-step-0 font-medium text-ink">{track.title}</p>
        <p className="truncate text-step-n1 text-muted">{track.courseName}</p>
      </div>
      <label className="flex items-center gap-1.5 text-step-n1 text-muted">
        <input
          type="checkbox"
          checked={autoplayNext}
          onChange={(e) => setAutoplayNext(e.target.checked)}
          className="accent-primary"
        />
        Autoplay next
      </label>
      {track.nextLessonSlug && (
        <button
          type="button"
          onClick={goToNextLesson}
          className="min-h-11 rounded-control border border-line px-3 text-step-n1 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Next →
        </button>
      )}
    </div>
  );

  return (
    <AudioPlayerContext value={{ track, loadTrack, setInlineSlot }}>
      {/* DESIGN.md §6: content reserves space for the docked bar. Only
          helps once the page is scrolled toward its bottom — doesn't
          retroactively clear the bar for a short, unscrolled page. See
          NOTES.md Phase 12 for why, and why that's not fixed here. */}
      <div className={track ? "pb-24" : undefined}>{children}</div>
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        controlsList="nodownload"
        className="hidden"
      />
      {playerControls &&
        (inlineSlot
          ? createPortal(
              <div className="rounded-card border border-line bg-paper p-3">{playerControls}</div>,
              inlineSlot,
            )
          : <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-surface border-t border-line bg-paper p-3 shadow-float sm:p-4">
              {playerControls}
            </div>)}
    </AudioPlayerContext>
  );
}
