"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
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
import { createCourse, reorderCourses, softDeleteCourse } from "@/lib/actions/courses";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { TypedConfirmDialog } from "@/components/typed-confirm-dialog";
import type { courses } from "@/db/schema";

type Course = typeof courses.$inferSelect;

export function CourseList({ initialCourses }: { initialCourses: Course[] }) {
  const [items, setItems] = useState(initialCourses);
  // Re-sync local state when the server list changes (after create/delete
  // triggers a refresh) — "adjust state during render" per
  // https://react.dev/learn/you-might-not-need-an-effect, not an effect,
  // so this doesn't trigger a cascading-render lint error.
  const [prevInitialCourses, setPrevInitialCourses] = useState(initialCourses);
  if (initialCourses !== prevInitialCourses) {
    setPrevInitialCourses(initialCourses);
    setItems(initialCourses);
  }

  const [, startTransition] = useTransition();
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [deleting, setDeleting] = useState<Course | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Compute + setState here, not inside the setState updater — React may
    // re-invoke updater functions, so they must be pure (no startTransition
    // or other side effects inside them).
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(() => {
      void reorderCourses(next.map((c) => c.id));
    });
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setItems((current) => current.filter((c) => c.id !== id));
    startTransition(async () => {
      await softDeleteCourse(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <CreateCourseForm onCreated={() => router.refresh()} />

      <DndContext
        id="courses"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-line rounded-card border border-line">
            {items.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                prefersReducedMotion={prefersReducedMotion}
                onDelete={setDeleting}
              />
            ))}
            {items.length === 0 && (
              <li className="p-3 text-step-0 text-muted">No courses yet.</li>
            )}
          </ul>
        </SortableContext>
      </DndContext>

      <TypedConfirmDialog
        open={deleting !== null}
        title="Delete course"
        description="This hides the course from learners but doesn't permanently remove it."
        confirmText={deleting?.title ?? ""}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function CourseRow({
  course,
  prefersReducedMotion,
  onDelete,
}: {
  course: Course;
  prefersReducedMotion: boolean;
  onDelete: (course: Course) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: course.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: prefersReducedMotion ? undefined : transition,
      }}
      className="flex items-center gap-3 bg-paper p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab select-none text-muted"
      >
        ⠿
      </button>
      <Link href={`/admin/courses/${course.id}`} className="flex-1 text-step-0 text-ink hover:underline">
        {course.title}
      </Link>
      <span className="text-step-n1 text-muted">{course.status}</span>
      <button
        type="button"
        onClick={() => onDelete(course)}
        className="text-step-n1 text-red-600 hover:underline"
      >
        Delete
      </button>
    </li>
  );
}

type CreateState = { error?: string };

function CreateCourseForm({ onCreated }: { onCreated: () => void }) {
  const [state, formAction, pending] = useActionState<CreateState, FormData>(
    async (_prev, formData) => {
      const title = String(formData.get("title") ?? "");
      const result = await createCourse(title);
      if (!result.ok) return { error: result.error };
      onCreated();
      return {};
    },
    {},
  );

  return (
    <form action={formAction} className="flex gap-2">
      <input
        name="title"
        required
        placeholder="New course title"
        className="min-h-11 flex-1 rounded-control border border-line bg-paper px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-control bg-primary px-3 text-step-0 font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {pending ? "Creating…" : "Create"}
      </button>
      {state.error && <p className="text-step-n1 text-red-600">{state.error}</p>}
    </form>
  );
}
