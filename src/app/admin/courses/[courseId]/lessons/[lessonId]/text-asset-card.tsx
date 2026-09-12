"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { saveTextAsset, createAudioUploadUrl } from "@/lib/actions/assets";
import { putWithProgress } from "@/lib/upload-with-progress";
import { AssetCardHeader } from "./asset-card-header";

type Status = "draft" | "ready";

export function TextAssetCard({
  courseId,
  lessonId,
  asset,
}: {
  courseId: string;
  lessonId: string;
  asset: {
    bodyHtml: string;
    audioUrl: string | null;
    hasAudio: boolean;
    status: Status;
    updatedAt: string;
  } | null;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ strike: false, link: { openOnClick: false } })],
    content: asset?.bodyHtml ?? "",
    // Defers the editor's first render to the client — ProseMirror needs the
    // DOM, so rendering it during SSR would mismatch on hydration.
    immediatelyRender: false,
  });

  const [hasAudio, setHasAudio] = useState(asset?.hasAudio ?? false);
  const [audioUrl, setAudioUrl] = useState(asset?.audioUrl ?? null);
  // undefined = no change this session (leave existing audio alone);
  // null = "remove audio" was clicked; a string = a new upload finished.
  const [pendingAudioKey, setPendingAudioKey] = useState<string | null | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  async function handleAudioFile(file: File) {
    setError(undefined);
    setUploadProgress(0);
    const created = await createAudioUploadUrl(courseId, lessonId, file.name);
    if (!created.ok) {
      setError(created.error);
      setUploadProgress(null);
      return;
    }
    try {
      await putWithProgress(created.data.uploadUrl, file, setUploadProgress);
    } catch {
      setError(`Upload failed: ${file.name}`);
      setUploadProgress(null);
      return;
    }
    setUploadProgress(null);
    setPendingAudioKey(created.data.key);
    setHasAudio(true);
    setAudioUrl(URL.createObjectURL(file));
  }

  function removeAudio() {
    setPendingAudioKey(null);
    setHasAudio(false);
    setAudioUrl(null);
  }

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    setSaved(false);
    setError(undefined);
    const result = await saveTextAsset(courseId, lessonId, {
      bodyHtml: editor.getHTML(),
      audioKey: pendingAudioKey,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPendingAudioKey(undefined);
    setSaved(true);
  }

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <AssetCardHeader
        courseId={courseId}
        lessonId={lessonId}
        format="text"
        title="Read & Listen"
        status={asset?.status ?? null}
        updatedAt={asset?.updatedAt ?? null}
        exists={Boolean(asset)}
      />

      <div className="mt-3 rounded-control border border-line bg-paper">
        <EditorToolbar editor={editor} />
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-3 font-serif text-step-1"
        />
      </div>

      <div className="mt-3">
        <p className="text-step-n1 font-medium text-ink">Audio</p>
        {hasAudio && audioUrl ? (
          <div className="mt-1 flex items-center gap-2">
            <audio src={audioUrl} controls controlsList="nodownload" className="h-8" />
            <button
              type="button"
              onClick={removeAudio}
              className="text-step-n1 text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="mt-1 flex cursor-pointer items-center justify-center rounded-control border border-dashed border-line bg-paper p-3 text-step-n1 text-muted">
            Choose an audio file (mp3, m4a, wav)
            <input
              type="file"
              accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleAudioFile(file);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {uploadProgress !== null && (
          <p className="mt-1 text-step-n1 text-muted">Uploading… {uploadProgress}%</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-control bg-primary px-3 py-2 text-step-0 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && !saving && <span className="text-step-n1 text-success">Saved</span>}
      </div>
      {error && <p className="mt-2 text-step-n1 text-red-600">{error}</p>}
    </section>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const buttonClass = (active: boolean) =>
    `rounded-control px-2 py-1 text-step-n1 ${active ? "bg-primary text-white" : "text-ink hover:bg-surface"}`;

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-line p-2"
      // Mousedown on a toolbar button normally blurs the contenteditable
      // first, collapsing/losing the editor's selection before the click
      // handler runs — so e.g. toggling a heading applies to nothing.
      // Preventing default on mousedown keeps the editor's selection intact.
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={buttonClass(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive("bold"))}
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive("italic"))}
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={buttonClass(editor.isActive("underline"))}
      >
        Underline
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive("bulletList"))}
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive("orderedList"))}
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive("blockquote"))}
      >
        Quote
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={buttonClass(editor.isActive("codeBlock"))}
      >
        Code
      </button>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Link URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={buttonClass(editor.isActive("link"))}
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={buttonClass(false)}
      >
        HR
      </button>
    </div>
  );
}
