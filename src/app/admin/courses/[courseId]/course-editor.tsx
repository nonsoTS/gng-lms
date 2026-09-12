"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateCourse } from "@/lib/actions/courses";
import {
  createModule,
  deleteModule,
  reorderModules,
  updateModule,
} from "@/lib/actions/modules";
import {
  createLesson,
  deleteLesson,
  reorderLessons,
  updateLesson,
} from "@/lib/actions/lessons";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { TypedConfirmDialog } from "@/components/typed-confirm-dialog";
import type { assets, courses, lessons, modules } from "@/db/schema";

type Asset = typeof assets.$inferSelect;
type Lesson = typeof lessons.$inferSelect & { assets: Asset[] };
type Module = typeof modules.$inferSelect & { lessons: Lesson[] };
type CourseWithTree = typeof courses.$inferSelect & { modules: Module[] };

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function CourseEditor({ course }: { course: CourseWithTree }) {
  return (
    <div className="space-y-6">
      <CourseFieldsForm course={course} />
      <ModulesSection courseId={course.id} initialModules={course.modules} />
    </div>
  );
}

// --- Course fields ---

type FieldsState = { error?: string };

function CourseFieldsForm({ course }: { course: CourseWithTree }) {
  const [state, formAction, pending] = useActionState<FieldsState, FormData>(
    async (_prev, formData) => {
      console.log('publish formData===', formData)
      const result = await updateCourse(course.id, {
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        status: formData.get("status") === "published" ? "published" : "draft",
      });
      console.log('publish error===', result)
      return result.ok ? {} : { error: result.error };
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-3 rounded-card border border-line bg-surface p-4">
      <h1 className="text-step-2 font-semibold text-ink">Course details</h1>
      <label className="block text-step-0 text-ink">
        Title
        <input
          name="title"
          defaultValue={course.title}
          required
          className="mt-1 w-full min-h-11 rounded-control border border-line bg-paper px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>
      <label className="block text-step-0 text-ink">
        Slug
        <input
          name="slug"
          defaultValue={course.slug}
          required
          className="mt-1 w-full min-h-11 rounded-control border border-line bg-paper px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>
      <label className="block text-step-0 text-ink">
        Description
        <textarea
          name="description"
          defaultValue={course.description ?? ""}
          rows={3}
          className="mt-1 w-full rounded-control border border-line bg-paper px-3 py-2 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </label>
      <label className="block text-step-0 text-ink">
        Status
        <select
          name="status"
          defaultValue={course.status}
          className="mt-1 w-full min-h-11 rounded-control border border-line bg-paper px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-control bg-primary px-3 text-step-0 font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="text-step-n1 text-red-600">{state.error}</p>}
    </form>
  );
}

// --- Modules ---

function ModulesSection({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: Module[];
}) {
  const [items, setItems] = useState(initialModules);
  // See CourseList's identical comment in ../course-list.tsx.
  const [prevInitialModules, setPrevInitialModules] = useState(initialModules);
  if (initialModules !== prevInitialModules) {
    setPrevInitialModules(initialModules);
    setItems(initialModules);
  }

  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useDndSensors();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [deleting, setDeleting] = useState<Module | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // See CourseList's identical comment in ../course-list.tsx — updater
    // functions must stay pure, so the side effect happens after setItems.
    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => {
      void reorderModules(courseId, next.map((m) => m.id));
    });
  }

  async function handleCreate(title: string) {
    const result = await createModule(courseId, title);
    if (result.ok) router.refresh();
    return result;
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setItems((current) => current.filter((m) => m.id !== id));
    startTransition(async () => {
      await deleteModule(id, courseId);
      router.refresh();
    });
  }

  function handleModuleUpdated(id: string, title: string) {
    setItems((current) => current.map((m) => (m.id === id ? { ...m, title } : m)));
  }

  return (
    <section className="space-y-3">
      <h2 className="text-step-1 font-semibold text-ink">Modules</h2>

      <DndContext
        id={`modules-${courseId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((module_) => (
              <ModuleCard
                key={module_.id}
                courseId={courseId}
                module={module_}
                prefersReducedMotion={prefersReducedMotion}
                onDelete={setDeleting}
                onUpdated={handleModuleUpdated}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <InlineCreateForm placeholder="New module title" onSubmit={handleCreate} />

      <TypedConfirmDialog
        open={deleting !== null}
        title="Delete module"
        description="This permanently deletes the module and every lesson inside it."
        confirmText={deleting?.title ?? ""}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
}

function ModuleCard({
  courseId,
  module: module_,
  prefersReducedMotion,
  onDelete,
  onUpdated,
}: {
  courseId: string;
  module: Module;
  prefersReducedMotion: boolean;
  onDelete: (module: Module) => void;
  onUpdated: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: module_.id,
  });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module_.title);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === module_.title) {
      setTitle(module_.title);
      setEditing(false);
      return;
    }
    onUpdated(module_.id, trimmed);
    setEditing(false);
    startTransition(async () => {
      const result = await updateModule(module_.id, courseId, trimmed);
      if (!result.ok) {
        onUpdated(module_.id, module_.title);
        router.refresh();
      }
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
      }}
      className="rounded-card border border-line bg-surface p-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab select-none text-muted"
        >
          ⠿
        </button>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="min-h-11 flex-1 rounded-control border border-line bg-paper px-2 text-step-0 text-ink"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-step-0 font-medium text-ink"
          >
            {module_.title}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(module_)}
          className="text-step-n1 text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>

      <div className="mt-3 pl-6">
        <LessonsSection courseId={courseId} moduleId={module_.id} initialLessons={module_.lessons} />
      </div>
    </div>
  );
}

// --- Lessons ---

function LessonsSection({
  courseId,
  moduleId,
  initialLessons,
}: {
  courseId: string;
  moduleId: string;
  initialLessons: Lesson[];
}) {
  const [items, setItems] = useState(initialLessons);
  // See CourseList's identical comment in ../course-list.tsx.
  const [prevInitialLessons, setPrevInitialLessons] = useState(initialLessons);
  if (initialLessons !== prevInitialLessons) {
    setPrevInitialLessons(initialLessons);
    setItems(initialLessons);
  }

  const [, startTransition] = useTransition();
  const router = useRouter();
  const sensors = useDndSensors();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [deleting, setDeleting] = useState<Lesson | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // See CourseList's identical comment in ../course-list.tsx — updater
    // functions must stay pure, so the side effect happens after setItems.
    const oldIndex = items.findIndex((l) => l.id === active.id);
    const newIndex = items.findIndex((l) => l.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => {
      void reorderLessons(moduleId, courseId, next.map((l) => l.id));
    });
  }

  async function handleCreate(title: string) {
    const result = await createLesson(moduleId, courseId, title);
    if (result.ok) router.refresh();
    return result;
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setItems((current) => current.filter((l) => l.id !== id));
    startTransition(async () => {
      await deleteLesson(id, courseId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <DndContext
        id={`lessons-${moduleId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {items.map((lesson) => (
              <LessonRow
                key={lesson.id}
                courseId={courseId}
                lesson={lesson}
                prefersReducedMotion={prefersReducedMotion}
                onDelete={setDeleting}
              />
            ))}
            {items.length === 0 && (
              <li className="text-step-n1 text-muted">No lessons yet.</li>
            )}
          </ul>
        </SortableContext>
      </DndContext>

      <InlineCreateForm placeholder="New lesson title" small onSubmit={handleCreate} />

      <TypedConfirmDialog
        open={deleting !== null}
        title="Delete lesson"
        description="This permanently deletes the lesson and all of its formats."
        confirmText={deleting?.title ?? ""}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

const FORMAT_ORDER = ["video", "slides", "text"] as const;

/** One dot per format present — sage (ready), marigold (draft), per DESIGN.md §4. */
function AssetStatusDots({ assets }: { assets: Asset[] }) {
  return (
    <span className="flex items-center gap-1">
      {FORMAT_ORDER.map((format) => {
        const asset = assets.find((a) => a.format === format);
        if (!asset) return null;
        return (
          <span
            key={format}
            title={`${format}: ${asset.status}`}
            className={`h-2 w-2 rounded-full ${asset.status === "ready" ? "bg-success" : "bg-accent"}`}
          />
        );
      })}
    </span>
  );
}

function LessonRow({
  courseId,
  lesson,
  prefersReducedMotion,
  onDelete,
}: {
  courseId: string;
  lesson: Lesson;
  prefersReducedMotion: boolean;
  onDelete: (lesson: Lesson) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lesson.id,
  });
  const [editing, setEditing] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
      }}
      className="rounded-control border border-line bg-paper p-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab select-none text-muted"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex-1 text-left text-step-0 text-ink"
        >
          {lesson.title}
        </button>
        <AssetStatusDots assets={lesson.assets} />
        <span className="text-step-n1 text-muted">{lesson.status}</span>
        <Link
          href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
          className="text-step-n1 text-primary hover:underline"
        >
          Manage assets
        </Link>
        <button
          type="button"
          onClick={() => onDelete(lesson)}
          className="text-step-n1 text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
      {editing && (
        <LessonEditForm
          courseId={courseId}
          lesson={lesson}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}

type LessonEditState = { error?: string };

function LessonEditForm({
  courseId,
  lesson,
  onClose,
}: {
  courseId: string;
  lesson: Lesson;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<LessonEditState, FormData>(
    async (_prev, formData) => {
      const result = await updateLesson(lesson.id, courseId, {
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        summary: String(formData.get("summary") ?? ""),
        status: formData.get("status") === "published" ? "published" : "draft",
      });
      if (!result.ok) return { error: result.error };
      router.refresh();
      onClose();
      return {};
    },
    {},
  );

  return (
    <form action={formAction} className="mt-2 space-y-2 border-t border-line pt-2">
      <input
        name="title"
        defaultValue={lesson.title}
        required
        placeholder="Title"
        className="w-full rounded-control border border-line bg-paper px-2 py-1 text-step-0 text-ink"
      />
      <input
        name="slug"
        defaultValue={lesson.slug}
        required
        placeholder="Slug"
        className="w-full rounded-control border border-line bg-paper px-2 py-1 text-step-0 text-ink"
      />
      <textarea
        name="summary"
        defaultValue={lesson.summary ?? ""}
        placeholder="Summary"
        rows={2}
        className="w-full rounded-control border border-line bg-paper px-2 py-1 text-step-0 text-ink"
      />
      <select
        name="status"
        defaultValue={lesson.status}
        className="w-full rounded-control border border-line bg-paper px-2 py-1 text-step-0 text-ink"
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-primary px-2 py-1 text-step-n1 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onClose} className="text-step-n1 text-muted">
          Cancel
        </button>
      </div>
      {state.error && <p className="text-step-n1 text-red-600">{state.error}</p>}
    </form>
  );
}

// --- Shared: inline "add new" form used by both modules and lessons ---

function InlineCreateForm({
  placeholder,
  small,
  onSubmit,
}: {
  placeholder: string;
  small?: boolean;
  onSubmit: (title: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await onSubmit(trimmed);
      if (result.ok) {
        setTitle("");
        setError(undefined);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 rounded-control border border-line bg-paper px-2 text-ink ${small ? "py-1 text-step-n1" : "py-2 text-step-0"}`}
      />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-control bg-primary text-white disabled:opacity-50 ${small ? "px-2 py-1 text-step-n1" : "px-3 py-2 text-step-0"}`}
      >
        Add
      </button>
      {error && <p className="text-step-n1 text-red-600">{error}</p>}
    </form>
  );
}
