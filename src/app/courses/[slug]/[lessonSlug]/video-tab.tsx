"use client";

import { useEffect, useRef, useTransition } from "react";
import { updateVideoProgress } from "@/lib/actions/progress";

const POLL_INTERVAL_MS = 10_000;

// Minimal shape of the bits of the YouTube IFrame Player API this component
// uses — not pulling in a whole types package for one file.
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width: string;
          height: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function VideoTab({
  lessonId,
  youtubeId,
  initialSeconds,
}: {
  lessonId: string;
  youtubeId: string;
  initialSeconds?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    function createPlayer() {
      if (cancelled || !containerRef.current || !window.YT) return;

      // The IFrame API replaces whatever element it's given with its own
      // <iframe> — if that were containerRef.current itself, React would
      // later try to remove a node that's no longer there when this
      // component unmounts (e.g. switching tabs), throwing a NotFoundError.
      // Giving it an imperatively-created child instead means React only
      // ever needs to unmount the stable outer div it actually rendered.
      const mountEl = document.createElement("div");
      containerRef.current.appendChild(mountEl);

      playerRef.current = new window.YT.Player(mountEl, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { modestbranding: 1, rel: 0 },
        events: {
          onReady: (event) => {
            if (initialSeconds) {
              event.target.seekTo(initialSeconds, true);
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        createPlayer();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    }

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player || player.getPlayerState() !== window.YT?.PlayerState.PLAYING) return;

      const seconds = Math.floor(player.getCurrentTime());
      const duration = Math.floor(player.getDuration());
      if (duration > 0) {
        startTransition(() => {
          void updateVideoProgress(lessonId, seconds, duration);
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, youtubeId]);

  return (
    <div className="overflow-hidden rounded-card bg-ink">
      <div className="aspect-video" ref={containerRef} />
    </div>
  );
}
