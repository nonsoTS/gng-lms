"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * DESIGN.md §7: "Destructive actions require typed confirmation, not just
 * a dialog." Native <dialog> for focus trapping and Escape-to-close, no
 * extra dependency — same platform-API-over-library preference as the
 * YouTube IFrame / MediaSession / <audio> usage elsewhere in this app.
 */
export function TypedConfirmDialog({
  open,
  title,
  description,
  confirmText,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [input, setInput] = useState("");
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setInput("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={onClose}
      className="rounded-card border border-line bg-paper p-0 text-ink backdrop:bg-ink/40 mx-auto"
    >
      <div className="w-80 p-4">
        <h2 className="text-step-1 font-semibold text-ink">{title}</h2>
        <p id={descriptionId} className="mt-1 text-step-n1 text-muted">
          {description}
        </p>
        <label className="mt-3 block text-step-n1 font-medium text-ink">
          Type &ldquo;{confirmText}&rdquo; to confirm
          <input
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-control border border-line bg-paper px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-control border border-line px-3 text-step-0 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={input !== confirmText}
            onClick={onConfirm}
            className="min-h-11 rounded-control bg-primary px-3 text-step-0 font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
