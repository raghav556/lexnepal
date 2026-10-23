"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  jsonToMarkdown,
  markdownRichTextSupport,
  markdownToDoc,
} from "@/views/staff/staff-content-markdown";

function applyLink(editor: Editor) {
  const previous = String(editor.getAttributes("link").href ?? "");
  const entered = window.prompt("Link URL (https)", previous || "https://");
  if (entered == null) return;
  const href = entered.trim();
  if (!href) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  if (!/^https?:\/\//i.test(href)) return;
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

function Toolbar({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  if (!editor) return null;
  const item = (label: string, icon: ReactNode, active: boolean, command: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={active ? "bg-muted" : ""}
      onClick={command}
    >
      {icon}
    </Button>
  );
  return (
    <div className="staff-content-toolbar" role="toolbar" aria-label="Formatting">
      {item("Heading 1", <Heading1 />, editor.isActive("heading", { level: 1 }), () =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      )}
      {item("Heading 2", <Heading2 />, editor.isActive("heading", { level: 2 }), () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {item("Heading 3", <Heading3 />, editor.isActive("heading", { level: 3 }), () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      {item("Bold", <Bold />, editor.isActive("bold"), () =>
        editor.chain().focus().toggleBold().run(),
      )}
      {item("Italic", <Italic />, editor.isActive("italic"), () =>
        editor.chain().focus().toggleItalic().run(),
      )}
      {item("Bullet list", <List />, editor.isActive("bulletList"), () =>
        editor.chain().focus().toggleBulletList().run(),
      )}
      {item("Numbered list", <ListOrdered />, editor.isActive("orderedList"), () =>
        editor.chain().focus().toggleOrderedList().run(),
      )}
      {item("Quote", <Quote />, editor.isActive("blockquote"), () =>
        editor.chain().focus().toggleBlockquote().run(),
      )}
      {item("Link", <Link2 />, editor.isActive("link"), () => applyLink(editor))}
      {item("Undo", <Undo2 />, false, () => editor.chain().focus().undo().run())}
      {item("Redo", <Redo2 />, false, () => editor.chain().focus().redo().run())}
    </div>
  );
}

export type StaffContentMarkdownEditorHandle = {
  getMarkdown: () => string;
};

export const StaffContentMarkdownEditor = forwardRef<
  StaffContentMarkdownEditorHandle,
  {
    id: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
  }
>(function StaffContentMarkdownEditor({ id, value, disabled, onChange }, ref) {
  const [rich] = useState(() => markdownRichTextSupport(value) === "rich");
  const emitted = useRef(value);
  const sourceValue = useRef(value);
  const applying = useRef(false);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled && rich,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      Placeholder.configure({ placeholder: "Start writing your content here…" }),
    ],
    content: markdownToDoc(value) ?? { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor: current }) => {
      if (applying.current) return;
      const next = jsonToMarkdown(current.getJSON());
      if (next == null || next === emitted.current) return;
      emitted.current = next;
      onChange(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled && rich);
  }, [disabled, editor, rich]);

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => {
        if (!rich || !editor) return sourceValue.current;
        const markdown = jsonToMarkdown(editor.getJSON());
        const visible = editor.getText().trim();
        if (markdown != null && markdown.trim()) return markdown;
        if (visible) return markdown?.trim() ? markdown : visible;
        return markdown ?? sourceValue.current;
      },
    }),
    [editor, rich],
  );

  useEffect(() => {
    if (!editor || !rich || value === emitted.current) return;
    const doc = markdownToDoc(value);
    if (!doc) return;
    applying.current = true;
    editor.commands.setContent(doc, { emitUpdate: false });
    emitted.current = value;
    applying.current = false;
  }, [editor, rich, value]);

  return (
    <div className="staff-content-writing">
      <div className="staff-content-editor" id={id}>
        {rich ? (
          <>
            <Toolbar editor={editor} disabled={disabled} />
            <EditorContent editor={editor} aria-label="Markdown content" />
          </>
        ) : (
          <>
            <p className="staff-content-source-note">
              This content uses formatting the rich editor cannot preserve. Edit the Markdown source
              so nothing is lost.
            </p>
            <Textarea
              value={value}
              disabled={disabled}
              aria-label="Markdown content"
              className="staff-content-canvas"
              onChange={(event) => {
                sourceValue.current = event.target.value;
                onChange(event.target.value);
              }}
            />
          </>
        )}
      </div>
      {value.trim() ? (
        <div className="staff-content-preview">
          <p>Preview</p>
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
});
