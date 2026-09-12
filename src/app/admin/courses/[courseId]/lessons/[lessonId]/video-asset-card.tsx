"use client";

import { useActionState, useState } from "react";
import { saveVideoAsset } from "@/lib/actions/assets";
import { AssetCardHeader } from "./asset-card-header";

type Status = "draft" | "ready";
type SaveState = { error?: string; saved?: boolean };

export function VideoAssetCard({
  courseId,
  lessonId,
  asset,
}: {
  courseId: string;
  lessonId: string;
  asset: { youtubeId: string; status: Status; updatedAt: string } | null;
}) {
  const [input, setInput] = useState(asset?.youtubeId ?? "");

  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    async (_prev, formData) => {
      const value = String(formData.get("youtube") ?? "");
      const result = await saveVideoAsset(courseId, lessonId, value);
      if (!result.ok) return { error: result.error };
      setInput(result.data.youtubeId);
      return { saved: true };
    },
    {},
  );

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <AssetCardHeader
        courseId={courseId}
        lessonId={lessonId}
        format="video"
        title="Watch"
        status={asset?.status ?? null}
        updatedAt={asset?.updatedAt ?? null}
        exists={Boolean(asset)}
      />
      <form action={formAction} className="mt-3 flex items-center gap-2">
        <input
          name="youtube"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="YouTube ID or URL"
          className="flex-1 rounded-control border border-line bg-paper px-3 py-2 text-step-0 text-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-primary px-3 py-2 text-step-0 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.saved && !pending && <span className="text-step-n1 text-success">Saved</span>}
      </form>
      {state.error && <p className="mt-2 text-step-n1 text-red-600">{state.error}</p>}
    </section>
  );
}
