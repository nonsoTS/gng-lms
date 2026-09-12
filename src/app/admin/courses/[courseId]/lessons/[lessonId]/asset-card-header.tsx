"use client";

import { useTransition } from "react";
import { setAssetStatus } from "@/lib/actions/assets";

type Status = "draft" | "ready";
type Format = "video" | "slides" | "text";

/**
 * Shared by all three format cards — DESIGN.md §7: "asset status is the
 * primary information on the lesson editor," and the draft/ready toggle is
 * its own action, separate from saving content.
 */
export function AssetCardHeader({
  courseId,
  lessonId,
  format,
  title,
  status,
  updatedAt,
  exists,
}: {
  courseId: string;
  lessonId: string;
  format: Format;
  title: string;
  status: Status | null;
  updatedAt: string | null;
  exists: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!status) return;
    const next: Status = status === "ready" ? "draft" : "ready";
    startTransition(() => {
      void setAssetStatus(courseId, lessonId, format, next);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
      <div>
        <h2 className="text-step-1 font-semibold text-ink">{title}</h2>
        {exists && updatedAt && <p className="text-step-n1 text-muted">Updated {updatedAt}</p>}
      </div>
      {exists && status && (
        <div className="flex items-center gap-2">
          <span
            className={`rounded-control px-2 py-0.5 text-step-n1 font-medium ${
              status === "ready" ? "bg-success text-white" : "bg-accent text-ink"
            }`}
          >
            {status === "ready" ? "Ready" : "Draft"}
          </span>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="rounded-control border border-line px-2 py-0.5 text-step-n1 disabled:opacity-50"
          >
            {pending ? "Saving…" : status === "ready" ? "Revert to draft" : "Mark ready"}
          </button>
        </div>
      )}
    </div>
  );
}
