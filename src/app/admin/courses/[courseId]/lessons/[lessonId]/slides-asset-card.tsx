"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createSlideUploadUrl, saveSlides, deleteSlide } from "@/lib/actions/assets";
import { putWithProgress } from "@/lib/upload-with-progress";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { AssetCardHeader } from "./asset-card-header";

type Status = "draft" | "ready";
type Slide = { key: string; url: string; alt: string };

export function SlidesAssetCard({
  courseId,
  lessonId,
  asset,
}: {
  courseId: string;
  lessonId: string;
  asset: { slides: Slide[]; status: Status; updatedAt: string } | null;
}) {
  const [items, setItems] = useState<Slide[]>(asset?.slides ?? []);
  // Mirrors `items` for use inside the upload loop, which spans multiple
  // awaits — reading React state directly there would risk a stale value if
  // a second file's upload resolves before the first one's setState commits.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const prefersReducedMotion = usePrefersReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function persist(next: Slide[]) {
    setItems(next);
    itemsRef.current = next;
    setSaving(true);
    setSaved(false);
    const result = await saveSlides(
      courseId,
      lessonId,
      next.map(({ key, alt }) => ({ key, alt })),
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Compute + persist here, not inside a setState updater — see
    // course-list.tsx's identical comment for why.
    const oldIndex = items.findIndex((s) => s.key === active.id);
    const newIndex = items.findIndex((s) => s.key === over.id);
    void persist(arrayMove(items, oldIndex, newIndex));
  }

  async function handleFiles(fileList: FileList) {
    setError(undefined);
    for (const file of Array.from(fileList)) {
      setUploads((current) => [...current, { name: file.name, progress: 0 }]);

      const created = await createSlideUploadUrl(courseId, lessonId, file.name);
      if (!created.ok) {
        setError(created.error);
        setUploads((current) => current.filter((u) => u.name !== file.name));
        continue;
      }

      try {
        await putWithProgress(created.data.uploadUrl, file, (percent) =>
          setUploads((current) =>
            current.map((u) => (u.name === file.name ? { ...u, progress: percent } : u)),
          ),
        );
      } catch {
        setError(`Upload failed: ${file.name}`);
        setUploads((current) => current.filter((u) => u.name !== file.name));
        continue;
      }

      await persist([
        ...itemsRef.current,
        { key: created.data.key, url: URL.createObjectURL(file), alt: "" },
      ]);
      setUploads((current) => current.filter((u) => u.name !== file.name));
    }
  }

  function updateAlt(key: string, alt: string) {
    setItems((current) => current.map((s) => (s.key === key ? { ...s, alt } : s)));
  }

  async function handleDelete(key: string) {
    if (!confirm("Delete this slide? This can't be undone.")) return;
    const next = items.filter((s) => s.key !== key);
    setItems(next);
    itemsRef.current = next;
    const result = await deleteSlide(courseId, lessonId, key);
    if (!result.ok) setError(result.error);
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <AssetCardHeader
        courseId={courseId}
        lessonId={lessonId}
        format="slides"
        title="Slides"
        status={asset?.status ?? null}
        updatedAt={asset?.updatedAt ?? null}
        exists={Boolean(asset)}
      />

      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-control border border-dashed border-line bg-paper p-4 text-center text-step-n1 text-muted">
        Drop images here or click to choose (webp, png, jpg)
        <input
          type="file"
          accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="mt-2 space-y-1">
          {uploads.map((u) => (
            <li key={u.name} className="text-step-n1 text-muted">
              Uploading {u.name}… {u.progress}%
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <DndContext
          id={`admin-slides-${lessonId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((s) => s.key)} strategy={rectSortingStrategy}>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {items.map((slide, index) => (
                <SlideThumb
                  key={slide.key}
                  slide={slide}
                  index={index}
                  total={items.length}
                  prefersReducedMotion={prefersReducedMotion}
                  onAltChange={(alt) => updateAlt(slide.key, alt)}
                  onAltBlur={() => void persist(itemsRef.current)}
                  onDelete={() => void handleDelete(slide.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {saving && <p className="mt-2 text-step-n1 text-muted">Saving…</p>}
      {saved && !saving && <p className="mt-2 text-step-n1 text-success">Saved</p>}
      {error && <p className="mt-2 text-step-n1 text-red-600">{error}</p>}
    </section>
  );
}

function SlideThumb({
  slide,
  index,
  total,
  prefersReducedMotion,
  onAltChange,
  onAltBlur,
  onDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  prefersReducedMotion: boolean;
  onAltChange: (alt: string) => void;
  onAltBlur: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: slide.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
      }}
      className="rounded-control border border-line bg-paper p-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL / local blob preview, not a static asset */}
        <img
          src={slide.url}
          alt={slide.alt || `Slide ${index + 1} of ${total}`}
          className="aspect-video w-full rounded object-cover"
        />
      </div>
      <input
        value={slide.alt}
        onChange={(event) => onAltChange(event.target.value)}
        onBlur={onAltBlur}
        placeholder="Alt text"
        className="mt-1 w-full rounded border border-line bg-paper px-1.5 py-1 text-step-n1"
      />
      <button
        type="button"
        onClick={onDelete}
        className="mt-1 text-step-n1 text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}
