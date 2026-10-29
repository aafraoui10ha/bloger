"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useId, useState } from "react";
import { Bold, Code, Heading2, Heading3, ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { useT } from "./client";
import { isSafeHref } from "@/lib/urls";

export type MediaOption = { id: string; filename: string; alt: string };

/**
 * Rich-text editor. Output HTML is sanitized again on the server before
 * storage and at render time, so the editor is never a trust boundary.
 */
export function RichTextEditor({ value, onChange, media, dir, label }: { value: string; onChange: (html: string) => void; media: MediaOption[]; dir?: "rtl" | "ltr"; label: string }) {
  const t = useT();
  const dialogId = useId();
  const dialog = () => document.getElementById(dialogId) as HTMLDialogElement | null;
  const [selectedMedia, setSelectedMedia] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"] },
      }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editorProps: {
      attributes: { class: "tiptap prose-content max-w-none px-4 py-3", "aria-label": label, dir: dir ?? "auto", "data-placeholder": t("ed.placeholder") },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync when switching to a different document (e.g. after restoring a revision).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "empty" : null, editor]);

  if (!editor) return <div className="h-80 animate-pulse rounded-lg border border-border bg-surface-2" />;

  const btn = (active: boolean) => `grid size-8 place-items-center rounded ${active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`;
  const tools = [
    { label: t("ed.bold"), icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { label: t("ed.italic"), icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { label: t("ed.h2"), icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { label: t("ed.h3"), icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { label: t("ed.bullet"), icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: t("ed.ordered"), icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { label: t("ed.quote"), icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
    { label: t("ed.code"), icon: Code, run: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive("codeBlock") },
    {
      label: t("ed.link"),
      icon: LinkIcon,
      run: () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt(t("ed.linkPrompt"), prev ?? "");
        if (url === null) return;
        if (url === "") editor.chain().focus().unsetLink().run();
        else if (isSafeHref(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
      active: editor.isActive("link"),
    },
    { label: t("ed.image"), icon: ImageIcon, run: () => dialog()?.showModal(), active: false },
    { label: t("ed.undo"), icon: Undo2, run: () => editor.chain().focus().undo().run(), active: false },
    { label: t("ed.redo"), icon: Redo2, run: () => editor.chain().focus().redo().run(), active: false },
  ];

  return (
    <div className="rounded-lg border border-border-strong bg-surface focus-within:border-accent">
      <div role="toolbar" aria-label={label} className="flex flex-wrap gap-0.5 border-b border-border p-1">
        {tools.map((tool) => (
          <button key={tool.label} type="button" onClick={tool.run} className={btn(tool.active)} aria-label={tool.label} aria-pressed={tool.active} title={tool.label}>
            <tool.icon className="size-4" aria-hidden="true" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <dialog id={dialogId} className="m-auto w-[min(28rem,92vw)] rounded-xl border border-border bg-surface p-5 text-fg backdrop:bg-black/40">
        <h2 className="font-semibold">{t("ed.image")}</h2>
        <select className="input mt-3" value={selectedMedia} onChange={(e) => setSelectedMedia(e.target.value)} aria-label={t("ed.image")}>
          <option value="">{t("media.select")}</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.filename} {m.alt ? `— ${m.alt}` : `(${t("media.missingAlt")})`}
            </option>
          ))}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => dialog()?.close()}>
            {t("c.cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedMedia}
            onClick={() => {
              const m = media.find((x) => x.id === selectedMedia);
              if (m) editor.chain().focus().setImage({ src: `/media/${m.id}`, alt: m.alt }).run();
              dialog()?.close();
            }}
          >
            {t("c.add")}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export function FaqEditor({ value, onChange }: { value: { q: string; a: string }[]; onChange: (v: { q: string; a: string }[]) => void }) {
  const t = useT();
  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <label className="label" htmlFor={`faq-q-${i}`}>
            {t("art.faqQ")} {i + 1}
          </label>
          <input id={`faq-q-${i}`} className="input" value={item.q} dir="auto" onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, q: e.target.value } : v)))} />
          <label className="label mt-2" htmlFor={`faq-a-${i}`}>
            {t("art.faqA")}
          </label>
          <textarea id={`faq-a-${i}`} className="input" rows={3} dir="auto" value={item.a} onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, a: e.target.value } : v)))} />
          <button type="button" className="btn-ghost btn-sm mt-2 text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            {t("art.faqRemove")}
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary btn-sm" onClick={() => onChange([...value, { q: "", a: "" }])} disabled={value.length >= 30}>
        {t("art.faqAdd")}
      </button>
    </div>
  );
}
